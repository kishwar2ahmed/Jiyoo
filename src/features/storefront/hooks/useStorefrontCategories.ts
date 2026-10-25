import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../services/firebase';
import { Category } from '../../../types';
import { CATEGORIES as defaultCategories } from '../../../constants/data';

export function useStorefrontCategories() {
  const [categoriesList, setCategoriesList] = useState<Category[]>(defaultCategories);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubCats = onSnapshot(
      collection(db, 'categories'),
      (snap) => {
        const loaded: Category[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          // isFrozen categories are hidden from shoppers (see CategoriesTab's
          // Freeze/Unfreeze control), but still visible to admins via the
          // separate admin ProductsTab/CategoriesTab category lists.
          if (!(data as any).isDeleted && !(data as any).isFrozen) loaded.push({ id: doc.id, ...data } as Category);
        });
        if (loaded.length > 0) {
          setCategoriesList(loaded);
        }
      },
      (err) => {
        console.warn('Categories snapshot failed:', err);
      }
    );
    return () => unsubCats();
  }, []);

  return { categoriesList };
}
