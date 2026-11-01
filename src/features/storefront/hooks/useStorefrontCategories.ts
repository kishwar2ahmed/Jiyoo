import { useState, useEffect } from 'react';
import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../services/firebase';
import { Category } from '../../../types';
import { CATEGORIES as defaultCategories } from '../../../constants/data';

// Shared singleton state so Navbar and Storefront share a single Firestore listener
let sharedCategories: Category[] = defaultCategories;
const categorySubscribers = new Set<(cats: Category[]) => void>();
let activeCategoriesUnsub: Unsubscribe | null = null;

function ensureCategoriesListener() {
  if (activeCategoriesUnsub || !isFirebaseConfigured) return;
  activeCategoriesUnsub = onSnapshot(
    collection(db, 'categories'),
    (snap) => {
      const loaded: Category[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (!(data as any).isDeleted && !(data as any).isFrozen) {
          loaded.push({ id: doc.id, ...data } as Category);
        }
      });
      if (loaded.length > 0) {
        sharedCategories = loaded;
        categorySubscribers.forEach((cb) => cb(sharedCategories));
      }
    },
    (err) => {
      console.warn('Categories snapshot failed:', err);
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
