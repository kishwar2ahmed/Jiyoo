import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../services/firebase';
import { Product } from '../../../types';
import { PRODUCTS as defaultProducts } from '../../../constants/data';
import { getOptimizedImageUrl, resolveProductImage } from '../../../utils/imageUtils';

export type CatalogSyncStatus =
  | 'LOADING'
  | 'SUCCESS_WITH_PRODUCTS'
  | 'SUCCESS_EMPTY'
  | 'FETCH_ERROR'
  | 'PERMISSION_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'OFFLINE';

const PUBLIC_CATALOG_CACHE_KEY = 'jiyoo_public_catalog_cache_v1';
const MAX_RETRY_ATTEMPTS = 4;

interface PublicCatalogCache {
  version: 1;
  lastSyncedAt: string;
  products: Product[];
}

export function isValidProductRecord(raw: unknown): raw is Partial<Product> & { id?: string | number; name: string } {
  if (!raw || typeof raw !== 'object') return false;
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) return false;
  if (candidate.price !== undefined && typeof candidate.price !== 'string' && typeof candidate.price !== 'number') {
    return false;
  }
  return true;
}

function sanitizePublicProduct(product: Product): Product {
  const rawCuts = (product as any).fishCuts || (product as any).cuts;
  return {
    ...product,
    id: String(product.id),
    name: String(product.name || '').trim(),
    category: product.category || 'General',
    categoryId: product.categoryId || 'fruits',
    subcategoryId: product.subcategoryId,
    subSubcategoryId: product.subSubcategoryId,
    price: product.price,
    numericPrice: product.numericPrice,
    originalPrice: product.originalPrice,
    discount: product.discount,
    wholesaleEligible: product.wholesaleEligible,
    wholesalePrice: product.wholesalePrice,
    wholesaleUnit: product.wholesaleUnit,
    wholesaleMinQty: product.wholesaleMinQty,
    unit: product.unit || '1 kg',
    image: getOptimizedImageUrl(resolveProductImage(product.image), 500, 80),
    images: Array.isArray(product.images)
      ? product.images.map((img) => getOptimizedImageUrl(resolveProductImage(img), 500, 80))
      : undefined,
    description: product.description || '',
    stockStatus: product.stockStatus || 'in_stock',
    stock: product.stock,
    badge: product.badge,
    freshnessBadge: product.freshnessBadge,
    deliveryEstimate: product.deliveryEstimate,
    origin: product.origin,
    cutType: product.cutType,
    rating: product.rating,
    reviewsCount: product.reviewsCount,
    tags: Array.isArray(product.tags) ? product.tags : undefined,
    weights: Array.isArray(product.weights) ? product.weights : undefined,
    fishCuts: Array.isArray(rawCuts) ? rawCuts : undefined,
    cleaningOptions: Array.isArray(product.cleaningOptions) ? product.cleaningOptions : undefined,
  } as Product;
}

function buildAuthoritativeBaseline(): Map<string, Product> {
  const map = new Map<string, Product>();
  for (const p of defaultProducts) {
    if (isValidProductRecord(p)) {
      map.set(String(p.id), sanitizePublicProduct(p));
    }
  }
  return map;
}

function readPublicCatalogCache(): { products: Product[]; lastSyncedAt: string | null } {
  try {
    const raw = localStorage.getItem(PUBLIC_CATALOG_CACHE_KEY);
    if (!raw) return { products: [], lastSyncedAt: null };
    const parsed = JSON.parse(raw) as Partial<PublicCatalogCache>;
    if (
      parsed &&
      parsed.version === 1 &&
      Array.isArray(parsed.products) &&
      parsed.products.length > 0
    ) {
      const valid = parsed.products.filter(isValidProductRecord).map((p) => sanitizePublicProduct(p as Product));
      if (valid.length > 0) {
        return {
          products: valid,
          lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
        };
      }
    }
  } catch (err) {
    console.warn('[Catalog Cache] Failed to read public product cache:', err);
  }
  return { products: [], lastSyncedAt: null };
}

function writePublicCatalogCache(products: Product[], syncedAtIso: string) {
  if (!Array.isArray(products) || products.length === 0) return;
  try {
    const payload: PublicCatalogCache = {
      version: 1,
      lastSyncedAt: syncedAtIso,
      products: products.map(sanitizePublicProduct),
    };
    localStorage.setItem(PUBLIC_CATALOG_CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[Catalog Cache] Failed to write public product cache:', err);
  }
}

export function classifyCatalogError(err: any): CatalogSyncStatus {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'OFFLINE';
  }
  const code = String(err?.code || '').toLowerCase();
  const message = String(err?.message || '').toLowerCase();
  if (code.includes('permission-denied') || message.includes('insufficient permissions') || message.includes('permission_denied')) {
    return 'PERMISSION_ERROR';
  }
  if (
    code.includes('invalid-argument') ||
    code.includes('failed-precondition') ||
    message.includes('projectId') ||
    message.includes('configuration') ||
    message.includes('api key')
  ) {
    return 'CONFIGURATION_ERROR';
  }
  if (
    code.includes('unavailable') ||
    code.includes('deadline-exceeded') ||
    message.includes('offline') ||
    message.includes('network') ||
    message.includes('failed to fetch')
  ) {
    return 'OFFLINE';
  }
  return 'FETCH_ERROR';
}

/**
 * Merges incoming database records with the authoritative baseline catalog
 * so partial documents (missing subcategoryId, unit, or image) never cause
 * products to vanish from category filters, while respecting explicit
 * `isDeleted: true` tombstones.
 */
export function mergeCatalogRecords(
  dbRecords: Array<Record<string, any>>,
  baselineProducts: Product[] = defaultProducts
): { products: Product[]; explicitlyEmpty: boolean } {
  const mergedMap = new Map<string, Product>();
  for (const base of baselineProducts) {
    if (isValidProductRecord(base)) {
      mergedMap.set(String(base.id), sanitizePublicProduct(base));
    }
  }

  let validRecordCount = 0;
  let deletedCount = 0;

  for (const record of dbRecords) {
    if (!record || typeof record !== 'object') continue;
    const id = String(record.id ?? '').trim();
    if (!id) continue;

    if (record.isDeleted === true) {
      deletedCount++;
      mergedMap.delete(id);
      continue;
    }

    const existingBase = mergedMap.get(id);
    const combined = existingBase
      ? {
          ...existingBase,
          ...record,
          id,
          categoryId: record.categoryId || existingBase.categoryId,
          subcategoryId: record.subcategoryId ?? existingBase.subcategoryId,
          subSubcategoryId: record.subSubcategoryId ?? existingBase.subSubcategoryId,
          unit: record.unit || existingBase.unit || '1 kg',
          image: getOptimizedImageUrl(
            resolveProductImage(record.image || existingBase.image),
            500,
            80
          ),
        }
      : {
          ...record,
          id,
          unit: record.unit || '1 kg',
          image: getOptimizedImageUrl(resolveProductImage(record.image), 500, 80),
        };

    if (isValidProductRecord(combined)) {
      validRecordCount++;
      mergedMap.set(id, sanitizePublicProduct(combined as Product));
    }
  }

  const finalProducts = Array.from(mergedMap.values());
  const explicitlyEmpty = finalProducts.length === 0 && deletedCount > 0 && validRecordCount === 0;
  return { products: finalProducts, explicitlyEmpty };
}

export function useStorefrontProducts() {
  const [initialCache] = useState(() => readPublicCatalogCache());
  const [baselineCatalog] = useState(() => Array.from(buildAuthoritativeBaseline().values()));

  const [dbProducts, setDbProducts] = useState<Product[]>(() => {
    const cached = initialCache?.products;
    return cached && cached.length > 0 ? cached : baselineCatalog;
  });
  const [isProductsLoading, setIsProductsLoading] = useState<boolean>(() => {
    const cached = initialCache?.products;
    return !(cached && cached.length > 0);
  });
  const [catalogStatus, setCatalogStatus] = useState<CatalogSyncStatus>('LOADING');
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    () => initialCache?.lastSyncedAt || null
  );
  const [isUsingCachedCatalog, setIsUsingCachedCatalog] = useState<boolean>(false);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);
  const retryAttemptRef = useRef<number>(0);
  const retryTimerRef = useRef<number | null>(null);

  const fetchBackendCatalogFallback = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 4500);
      const res = await fetch('/api/catalog/products', { signal: controller.signal });
      window.clearTimeout(timeoutId);
      if (!res.ok) return false;
      const data = await res.json().catch(() => null);
      if (!data || !Array.isArray(data.products)) return false;

      const { products, explicitlyEmpty } = mergeCatalogRecords(data.products, baselineCatalog);
      if (explicitlyEmpty) {
        setDbProducts([]);
        setCatalogStatus('SUCCESS_EMPTY');
        setCatalogError(null);
        setIsUsingCachedCatalog(false);
        return true;
      }
      if (products.length > 0) {
        const nowIso = new Date().toISOString();
        setDbProducts(products);
        writePublicCatalogCache(products, nowIso);
        setLastSyncedAt(nowIso);
        setCatalogStatus('SUCCESS_WITH_PRODUCTS');
        setCatalogError(null);
        setIsUsingCachedCatalog(false);
        return true;
      }
    } catch {
      // Backend fallback also unreachable; caller preserves cached/baseline catalog
    }
    return false;
  }, []);

  const retrySync = useCallback(() => {
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryAttemptRef.current = 0;
    setCatalogStatus('LOADING');
    setCatalogError(null);
    setRetryTrigger((prev) => prev + 1);
  }, []);

  // Automatically recover when browser connectivity returns
  useEffect(() => {
    const handleOnline = () => {
      retrySync();
    };
    const handleOffline = () => {
      setCatalogStatus('OFFLINE');
      setIsUsingCachedCatalog(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retrySync]);

  // Bounded loading timeout so UI never stays stuck on skeleton loader
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsProductsLoading(false);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!isFirebaseConfigured) {
      // Attempt backend catalog endpoint first, otherwise retain cached/baseline products
      fetchBackendCatalogFallback().then((recovered) => {
        if (!isMounted) return;
        if (!recovered) {
          setCatalogStatus('CONFIGURATION_ERROR');
          setCatalogError('Live database configuration unavailable. Showing verified store catalog.');
          setIsUsingCachedCatalog(true);
          setDbProducts((prev) => (prev.length > 0 ? prev : baselineCatalog));
        }
        setIsProductsLoading(false);
      });
      return () => {
        isMounted = false;
      };
    }

    const q = query(collection(db, 'products'), limit(500));

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!isMounted) return;
        retryAttemptRef.current = 0;

        const rawDocs: Array<Record<string, any>> = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && typeof data === 'object') {
            rawDocs.push({ id: docSnap.id, ...data });
          }
        });

        const { products, explicitlyEmpty } = mergeCatalogRecords(rawDocs, baselineCatalog);

        if (explicitlyEmpty) {
          setDbProducts([]);
          setCatalogStatus('SUCCESS_EMPTY');
          setCatalogError(null);
          setIsUsingCachedCatalog(false);
          setIsProductsLoading(false);
          return;
        }

        if (products.length > 0) {
          const syncedAt = new Date().toISOString();
          setDbProducts(products);
          writePublicCatalogCache(products, syncedAt);
          setLastSyncedAt(syncedAt);
          setCatalogStatus('SUCCESS_WITH_PRODUCTS');
          setCatalogError(null);
          setIsUsingCachedCatalog(false);
        }
        setIsProductsLoading(false);
      },
      async (err) => {
        if (!isMounted) return;
        console.warn('Firestore snapshot error in storefront catalog:', err);
        setIsProductsLoading(false);

        // Try authoritative backend endpoint before falling back to local cache
        const recoveredViaApi = await fetchBackendCatalogFallback();
        if (!isMounted || recoveredViaApi) return;

        const status = classifyCatalogError(err);
        setCatalogStatus(status);
        setIsUsingCachedCatalog(true);
        setCatalogError(
          status === 'OFFLINE'
            ? 'Network connection interrupted. Displaying last synchronized catalog.'
            : status === 'PERMISSION_ERROR'
            ? 'Live catalog sync restricted. Displaying verified cached catalog.'
            : 'Live catalog refresh temporarily unavailable. Displaying last synchronized catalog.'
        );

        // Never overwrite a valid product catalog with an empty array on error
        setDbProducts((prev) => {
          if (prev.length > 0) return prev;
          const cached = readPublicCatalogCache().products;
          return cached.length > 0 ? cached : baselineCatalog;
        });

        // Bounded exponential backoff with jitter
        if (retryAttemptRef.current < MAX_RETRY_ATTEMPTS) {
          const attempt = retryAttemptRef.current++;
          const baseDelay = Math.min(16000, 1500 * Math.pow(2, attempt));
          const jitter = Math.floor(Math.random() * 600);
          retryTimerRef.current = window.setTimeout(() => {
            if (isMounted) {
              setRetryTrigger((prev) => prev + 1);
            }
          }, baseDelay + jitter);
        }
      }
    );

    return () => {
      isMounted = false;
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      unsub();
    };
  }, [retryTrigger, fetchBackendCatalogFallback]);

  const currentProducts =
    catalogStatus === 'SUCCESS_EMPTY'
      ? []
      : dbProducts.length > 0
      ? dbProducts
      : baselineCatalog;

  return {
    currentProducts,
    dbProducts,
    isProductsLoading,
    catalogStatus,
    catalogError,
    lastSyncedAt,
    isUsingCachedCatalog,
    retrySync,
  };
}

