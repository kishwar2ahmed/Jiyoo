import { useState, useEffect } from 'react';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../services/firebase';
import { Product } from '../../../types';
import { PRODUCTS as defaultProducts } from '../../../constants/data';
import { getOptimizedImageUrl, resolveProductImage } from '../../../utils/imageUtils';

export function useStorefrontProducts() {
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  
  // Failsafe timeout to prevent infinite buffering if Firestore is not provisioned or slow
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsProductsLoading(false);
    }, 1500); // 1.5s max wait for products
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setDbProducts([]);
      setIsProductsLoading(false);
      return;
    }
    const q = query(collection(db, 'products'), limit(500));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const loaded: Product[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          if (!data.isDeleted) {
            loaded.push({ 
              id: doc.id, 
              ...data,
              image: getOptimizedImageUrl(resolveProductImage(data.image), 500, 80)
            } as Product);
          }
        });

        // Once Firestore is configured, an empty snapshot is authoritative.
        // An admin deletion must not resurrect the bundled bootstrap catalog.
        setDbProducts(loaded);
        setIsProductsLoading(false);
      },
      (err) => {
        // In production the Firestore catalog is authoritative. Never silently
        // resurrect deleted/old admin data from the bundled bootstrap catalog.
        console.error('Firestore snapshot error in storefront catalog:', err);
        setIsProductsLoading(false);
      }
    );

    return () => {
      unsub();
    };
  }, []);

  const currentProducts = isFirebaseConfigured && dbProducts.length > 0
     ? dbProducts
     : defaultProducts.map(p => ({ ...p, image: getOptimizedImageUrl(p.image, 500, 80) }));

  return { currentProducts, dbProducts, isProductsLoading };
}
