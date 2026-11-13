import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, limit, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../services/firebase';
import { Product } from '../../../types';
import { PRODUCTS as defaultProducts } from '../../../constants/data';
import { getOptimizedImageUrl, resolveProductImage, isCustomAdminUploadedImage } from '../../../utils/imageUtils';

export type CatalogSyncStatus =
  | 'LOADING'
  | 'SUCCESS_WITH_PRODUCTS'
  | 'SUCCESS_EMPTY'
  | 'FETCH_ERROR'
  | 'PERMISSION_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'OFFLINE';

const PUBLIC_CATALOG_CACHE_KEY = 'jiyoo_public_catalog_cache_v6';
const MAX_RETRY_ATTEMPTS = 4;

interface PublicCatalogCache {
  version: 1;
  lastSyncedAt: string;
  products: Product[];
}

export function isValidProductRecord(
  raw: unknown
): raw is Partial<Product> & { id?: string | number; name: string } {
  if (!raw || typeof raw !== 'object') return false;
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) return false;
  if (
    candidate.price !== undefined &&
    typeof candidate.price !== 'string' &&
    typeof candidate.price !== 'number'
  ) {
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
    mrp: product.mrp,
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
    brand: product.brand,
    count: product.count,
    netWeight: product.netWeight,
  } as Product;
}

// Compute authoritative baseline ONCE per browser session
let cachedBaselineList: Product[] | null = null;
function getAuthoritativeBaseline(): Product[] {
  if (cachedBaselineList) return cachedBaselineList;
  const map = new Map<string, Product>();
  for (const p of defaultProducts) {
    if (isValidProductRecord(p)) {
      map.set(String(p.id), sanitizePublicProduct(p));
    }
  }
  cachedBaselineList = Array.from(map.values());
  return cachedBaselineList;
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
      const merged = mergeCatalogRecords(
        parsed.products as Array<Record<string, any>>,
        getAuthoritativeBaseline()
      ).products;
      if (merged.length > 0) {
        return {
          products: merged,
          lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
        };
      }
    }
  } catch (err) {
    console.warn('[Catalog Cache] Failed to read public product cache:', err);
  }
  return { products: [], lastSyncedAt: null };
}

let pendingCacheWriteTimer: number | null = null;
function writePublicCatalogCache(products: Product[], syncedAtIso: string) {
  if (!Array.isArray(products) || products.length === 0) return;
  if (typeof window === 'undefined') return;
  if (pendingCacheWriteTimer !== null) {
    window.clearTimeout(pendingCacheWriteTimer);
  }
  // Defer heavy JSON serialization off the active animation/scroll frame
  pendingCacheWriteTimer = window.setTimeout(() => {
    pendingCacheWriteTimer = null;
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
  }, 250);
}

export function classifyCatalogError(err: any): CatalogSyncStatus {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'OFFLINE';
  }
  const code = String(err?.code || '').toLowerCase();
  const message = String(err?.message || '').toLowerCase();
  if (
    code.includes('permission-denied') ||
    message.includes('insufficient permissions') ||
    message.includes('permission_denied')
  ) {
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
  baselineProducts: Product[] = getAuthoritativeBaseline()
): { products: Product[]; explicitlyEmpty: boolean } {
  const mergedMap = new Map<string, Product>();
  for (const base of baselineProducts) {
    if (isValidProductRecord(base)) {
      mergedMap.set(String(base.id), sanitizePublicProduct(base));
    }
  }

  let localOverrides: Array<Record<string, any>> = [];
  if (typeof window !== 'undefined') {
    try {
      const rawLocal = localStorage.getItem('jiyoo_admin_col_products');
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          localOverrides = Object.entries(parsed).map(([id, item]: [string, any]) => ({ ...(item || {}), id }));
        }
      }
    } catch {
      // ignore
    }
  }

  let validRecordCount = 0;
  let deletedCount = 0;

  for (const record of [...dbRecords, ...localOverrides]) {
    if (!record || typeof record !== 'object') continue;
    const id = String(record.id ?? '').trim();
    if (!id) continue;

    if (record.isDeleted === true || record.__deleted === true) {
      deletedCount++;
      mergedMap.delete(id);
      continue;
    }

    const existingBase = mergedMap.get(id);
    const isWholesaleBaseline = Boolean(existingBase && id.startsWith('w_'));
    const isAdminEdited = record.adminEdited === true;
    const hasCustomAdminImage = isAdminEdited && isCustomAdminUploadedImage(record.image);
    const resolvedBaseOrAdminImage = existingBase
      ? hasCustomAdminImage
        ? record.image
        : existingBase.image
      : record.image;

    const combined = existingBase
      ? {
          ...existingBase,
          ...record,
          id,
          name: isWholesaleBaseline || !isAdminEdited
            ? existingBase.name
            : record.name || existingBase.name,
          price: isAdminEdited ? (record.price ?? existingBase.price) : existingBase.price,
          numericPrice: isAdminEdited
            ? (record.numericPrice ?? existingBase.numericPrice)
            : existingBase.numericPrice,
          mrp: isAdminEdited ? (record.mrp ?? existingBase.mrp) : existingBase.mrp,
          originalPrice: isAdminEdited
            ? (record.originalPrice ?? existingBase.originalPrice)
            : existingBase.originalPrice,
          discount: isAdminEdited
            ? (record.discount ?? existingBase.discount)
            : existingBase.discount,
          weights: isAdminEdited && Array.isArray(record.weights) && record.weights.length > 0
            ? record.weights
            : existingBase.weights,
          origin: isWholesaleBaseline || !isAdminEdited
            ? existingBase.origin
            : (record.origin ?? existingBase.origin),
          freshnessBadge: isWholesaleBaseline
            ? existingBase.freshnessBadge
            : (record.freshnessBadge ?? existingBase.freshnessBadge),
          description: isWholesaleBaseline
            ? existingBase.description
            : record.description || existingBase.description,
          count: isWholesaleBaseline ? existingBase.count : (record.count ?? existingBase.count),
          netWeight: isWholesaleBaseline
            ? existingBase.netWeight
            : (record.netWeight ?? existingBase.netWeight),
          wholesaleUnit: isWholesaleBaseline
            ? existingBase.wholesaleUnit
            : record.wholesaleUnit || existingBase.wholesaleUnit,
          categoryId: record.categoryId || existingBase.categoryId,
          subcategoryId: isAdminEdited
            ? (record.subcategoryId ?? existingBase.subcategoryId)
            : (existingBase.subcategoryId ?? record.subcategoryId),
          subSubcategoryId: record.subSubcategoryId ?? existingBase.subSubcategoryId,
          unit: isWholesaleBaseline || !isAdminEdited
            ? existingBase.unit
            : record.unit || existingBase.unit || '1 kg',
          image: getOptimizedImageUrl(
            resolveProductImage(resolvedBaseOrAdminImage),
            500,
            80
          ),
          images:
            hasCustomAdminImage && Array.isArray(record.images) && record.images.length > 0
              ? record.images
              : Array.isArray(existingBase.images) && existingBase.images.length > 0
              ? existingBase.images
              : [resolvedBaseOrAdminImage].filter(Boolean),
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
  const explicitlyEmpty =
    finalProducts.length === 0 && deletedCount > 0 && validRecordCount === 0;
  return { products: finalProducts, explicitlyEmpty };
}

// ============================================================================
// SINGLETON SHARED STORE (Deduplicates Firestore listeners & LocalStorage reads
// across Navbar, Storefront, WholesalePage, AuthModal, and AccountCenter)
// ============================================================================
interface CatalogStoreState {
  dbProducts: Product[];
  isProductsLoading: boolean;
  catalogStatus: CatalogSyncStatus;
  catalogError: string | null;
  lastSyncedAt: string | null;
  isUsingCachedCatalog: boolean;
}

let storeInitialized = false;
let storeState: CatalogStoreState = {
  dbProducts: [],
  isProductsLoading: false,
  catalogStatus: 'LOADING',
  catalogError: null,
  lastSyncedAt: null,
  isUsingCachedCatalog: false,
};

const subscribers = new Set<() => void>();
let activeFirestoreUnsub: Unsubscribe | null = null;
let retryAttempt = 0;
let retryTimer: number | null = null;
let fallbackInFlight: Promise<boolean> | null = null;

function ensureStoreInitialized() {
  if (storeInitialized) return;
  storeInitialized = true;
  const baseline = getAuthoritativeBaseline();
  const initialCache = typeof window !== 'undefined' ? readPublicCatalogCache() : { products: [], lastSyncedAt: null };
  storeState = {
    dbProducts: initialCache.products.length > 0 ? initialCache.products : baseline,
    isProductsLoading: false,
    catalogStatus: 'LOADING',
    catalogError: null,
    lastSyncedAt: initialCache.lastSyncedAt,
    isUsingCachedCatalog: false,
  };
}

function updateStore(partial: Partial<CatalogStoreState>) {
  storeState = { ...storeState, ...partial };
  subscribers.forEach((listener) => listener());
}

async function fetchBackendCatalogFallbackShared(): Promise<boolean> {
  if (fallbackInFlight) return fallbackInFlight;
  fallbackInFlight = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 4500);
      const res = await fetch('/api/catalog/products', { signal: controller.signal });
      window.clearTimeout(timeoutId);
      if (!res.ok) return false;
      const data = await res.json().catch(() => null);
      if (!data || !Array.isArray(data.products)) return false;

      const baseline = getAuthoritativeBaseline();
      const { products, explicitlyEmpty } = mergeCatalogRecords(data.products, baseline);
      if (explicitlyEmpty) {
        updateStore({
          dbProducts: [],
          catalogStatus: 'SUCCESS_EMPTY',
          catalogError: null,
          isUsingCachedCatalog: false,
          isProductsLoading: false,
        });
        return true;
      }
      if (products.length > 0) {
        const nowIso = new Date().toISOString();
        writePublicCatalogCache(products, nowIso);
        updateStore({
          dbProducts: products,
          lastSyncedAt: nowIso,
          catalogStatus: 'SUCCESS_WITH_PRODUCTS',
          catalogError: null,
          isUsingCachedCatalog: false,
          isProductsLoading: false,
        });
        return true;
      }
    } catch {
      // Backend fallback unreachable; caller retains cached/baseline catalog
    } finally {
      fallbackInFlight = null;
    }
    return false;
  })();
  return fallbackInFlight;
}

function startSharedCatalogSubscription() {
  ensureStoreInitialized();
  if (activeFirestoreUnsub) return;

  const baseline = getAuthoritativeBaseline();

  if (!isFirebaseConfigured) {
    fetchBackendCatalogFallbackShared().then((recovered) => {
      if (!recovered) {
        updateStore({
          catalogStatus: 'CONFIGURATION_ERROR',
          catalogError: 'Live database configuration unavailable. Showing verified store catalog.',
          isUsingCachedCatalog: true,
          dbProducts: storeState.dbProducts.length > 0 ? storeState.dbProducts : baseline,
          isProductsLoading: false,
        });
      }
    });
    return;
  }

  // Fetch server-persisted database immediately so edits and pricing appear instantly
  fetchBackendCatalogFallbackShared();

  const q = query(collection(db, 'products'), limit(500));
  activeFirestoreUnsub = onSnapshot(
    q,
    (snap) => {
      retryAttempt = 0;
      if (snap.empty) {
        // Firestore is initialized but has 0 documents yet; ensure server database is loaded
        fetchBackendCatalogFallbackShared();
        return;
      }
      const rawDocs: Array<Record<string, any>> = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && typeof data === 'object') {
          rawDocs.push({ id: docSnap.id, ...data });
        }
      });

      const { products, explicitlyEmpty } = mergeCatalogRecords(rawDocs, baseline);

      if (explicitlyEmpty) {
        updateStore({
          dbProducts: [],
          catalogStatus: 'SUCCESS_EMPTY',
          catalogError: null,
          isUsingCachedCatalog: false,
          isProductsLoading: false,
        });
        return;
      }

      if (products.length > 0) {
        const syncedAt = new Date().toISOString();
        writePublicCatalogCache(products, syncedAt);
        updateStore({
          dbProducts: products,
          lastSyncedAt: syncedAt,
          catalogStatus: 'SUCCESS_WITH_PRODUCTS',
          catalogError: null,
          isUsingCachedCatalog: false,
          isProductsLoading: false,
        });
      } else {
        updateStore({ isProductsLoading: false });
      }
    },
    async (err) => {
      console.warn('Firestore snapshot error in storefront catalog:', err);
      const recoveredViaApi = await fetchBackendCatalogFallbackShared();
      if (recoveredViaApi) return;

      const status = classifyCatalogError(err);
      const cached = readPublicCatalogCache().products;
      updateStore({
        isProductsLoading: false,
        catalogStatus: status,
        isUsingCachedCatalog: true,
        catalogError:
          status === 'OFFLINE'
            ? 'Network connection interrupted. Displaying last synchronized catalog.'
            : status === 'PERMISSION_ERROR'
            ? 'Live catalog sync restricted. Displaying verified cached catalog.'
            : 'Live catalog refresh temporarily unavailable. Displaying last synchronized catalog.',
        dbProducts:
          storeState.dbProducts.length > 0
            ? storeState.dbProducts
            : cached.length > 0
            ? cached
            : baseline,
      });

      if (retryAttempt < MAX_RETRY_ATTEMPTS) {
        const attempt = retryAttempt++;
        const baseDelay = Math.min(16000, 1500 * Math.pow(2, attempt));
        const jitter = Math.floor(Math.random() * 600);
        if (retryTimer) window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(() => {
          if (activeFirestoreUnsub) {
            activeFirestoreUnsub();
            activeFirestoreUnsub = null;
          }
          if (subscribers.size > 0) {
            startSharedCatalogSubscription();
          }
        }, baseDelay + jitter);
      }
    }
  );
}

function restartSharedCatalogSubscription() {
  if (retryTimer) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (activeFirestoreUnsub) {
    activeFirestoreUnsub();
    activeFirestoreUnsub = null;
  }
  retryAttempt = 0;
  updateStore({
    catalogStatus: 'LOADING',
    catalogError: null,
  });
  startSharedCatalogSubscription();
}

export function useStorefrontProducts() {
  ensureStoreInitialized();
  const [snapshot, setSnapshot] = useState<CatalogStoreState>(() => storeState);

  useEffect(() => {
    const handleStoreUpdate = () => {
      setSnapshot(storeState);
    };
    subscribers.add(handleStoreUpdate);
    startSharedCatalogSubscription();

    const handleOnline = () => restartSharedCatalogSubscription();
    const handleOffline = () =>
      updateStore({ catalogStatus: 'OFFLINE', isUsingCachedCatalog: true });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      subscribers.delete(handleStoreUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (subscribers.size === 0 && activeFirestoreUnsub) {
        activeFirestoreUnsub();
        activeFirestoreUnsub = null;
      }
    };
  }, []);

  const retrySync = useCallback(() => {
    restartSharedCatalogSubscription();
  }, []);

  const baselineCatalog = getAuthoritativeBaseline();
  const allProducts =
    snapshot.catalogStatus === 'SUCCESS_EMPTY'
      ? []
      : snapshot.dbProducts.length > 0
      ? snapshot.dbProducts
      : baselineCatalog;

  // Keep Retail Storefront (currentProducts) completely separate from Wholesale trade lots
  const currentProducts = useMemo(
    () =>
      allProducts.filter(
        (p) => !p.wholesaleEligible && !String(p.id).startsWith('w_')
      ),
    [allProducts]
  );

  return {
    currentProducts,
    dbProducts: allProducts,
    isProductsLoading: snapshot.isProductsLoading,
    catalogStatus: snapshot.catalogStatus,
    catalogError: snapshot.catalogError,
    lastSyncedAt: snapshot.lastSyncedAt,
    isUsingCachedCatalog: snapshot.isUsingCachedCatalog,
    retrySync,
  };
}
