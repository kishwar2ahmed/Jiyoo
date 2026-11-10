import { useState, useEffect } from 'react';
import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../services/firebase';
import { Category } from '../../../types';
import { CATEGORIES as defaultCategories } from '../../../constants/data';

// Shared singleton state so Navbar and Storefront share a single Firestore listener
let sharedCategories: Category[] = defaultCategories;
const categorySubscribers = new Set<(cats: Category[]) => void>();
let activeCategoriesUnsub: Unsubscribe | null = null;
let fallbackFetchInFlight: Promise<void> | null = null;

function mergeCategories(rawDocs: Array<Record<string, any>>): Category[] {
  const catMap = new Map<string, Category>();
  for (const c of defaultCategories) {
    catMap.set(String(c.id), c);
  }
  let localCats: Array<Record<string, any>> = [];
  if (typeof window !== 'undefined') {
    try {
      const rawLocal = localStorage.getItem('jiyoo_admin_col_categories');
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          localCats = Object.entries(parsed).map(([id, item]: [string, any]) => ({ ...(item || {}), id }));
        }
      }
    } catch {
      // ignore
    }
  }
  for (const data of [...rawDocs, ...localCats]) {
    if (!data || typeof data !== 'object' || !data.id) continue;
    const id = String(data.id);
    if (data.isDeleted === true || data.isFrozen === true || data.__deleted === true) {
      catMap.delete(id);
    } else {
      const existing = catMap.get(id);
      catMap.set(id, {
        ...(existing || {}),
        ...data,
        id,
      } as Category);
    }
  }
  const merged = Array.from(catMap.values());
  return merged.length > 0 ? merged : defaultCategories;
}

async function fetchBackendCategoriesFallback() {
  if (fallbackFetchInFlight) return fallbackFetchInFlight;
  fallbackFetchInFlight = (async () => {
    try {
      const res = await fetch('/api/catalog/categories');
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data && Array.isArray(data.categories) && data.categories.length > 0) {
        sharedCategories = mergeCategories(data.categories);
        categorySubscribers.forEach((cb) => cb(sharedCategories));
      }
    } catch {
      // Retain baseline categories on network error
    } finally {
      fallbackFetchInFlight = null;
    }
  })();
  return fallbackFetchInFlight;
}

function ensureCategoriesListener() {
  if (activeCategoriesUnsub) return;
  fetchBackendCategoriesFallback();
  if (!isFirebaseConfigured) return;

  activeCategoriesUnsub = onSnapshot(
    collection(db, 'categories'),
    (snap) => {
      if (snap.empty) {
        fetchBackendCategoriesFallback();
        return;
      }
      const rawDocs: Array<Record<string, any>> = [];
      snap.forEach((docSnap) => {
        rawDocs.push({ id: docSnap.id, ...docSnap.data() });
      });
      sharedCategories = mergeCategories(rawDocs);
      categorySubscribers.forEach((cb) => cb(sharedCategories));
    },
    (err) => {
      console.warn('Categories snapshot failed, falling back to API:', err);
      fetchBackendCategoriesFallback();
    }
  );
}

export function useStorefrontCategories() {
  const [categoriesList, setCategoriesList] = useState<Category[]>(() => sharedCategories);

  useEffect(() => {
    const listener = (cats: Category[]) => setCategoriesList(cats);
    categorySubscribers.add(listener);
    ensureCategoriesListener();

    return () => {
      categorySubscribers.delete(listener);
      if (categorySubscribers.size === 0 && activeCategoriesUnsub) {
        activeCategoriesUnsub();
        activeCategoriesUnsub = null;
      }
    };
  }, []);

  return { categoriesList };
}
