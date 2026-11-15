import { useState, useEffect } from 'react';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../../../constants/data';
import { Category } from '../../../types';
import { fetchJsonWithProxyRetry } from '../../../utils/apiFetch';

export function useStorefrontCategories() {
  const [categoriesList, setCategoriesList] = useState<Category[]>(() =>
    DEFAULT_CATEGORIES.filter((c) => !c.isFrozen)
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      setIsLoading(true);
      try {
        const { res, data } = await fetchJsonWithProxyRetry<{ success?: boolean; categories?: Category[] }>(
          '/api/catalog/categories'
        );
        if (res.ok) {
          if (isMounted && data?.success && Array.isArray(data.categories) && data.categories.length > 0) {
            const visible = data.categories.filter((c: Category) => !c.isFrozen);
            if (visible.length > 0) {
              setCategoriesList(visible);
            }
          }
        }
      } catch {
        // Fallback to bundled categories
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadCategories();

    const handleAdminCategoryUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail || detail.col === 'categories') {
        void loadCategories();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('jiyoo-admin-collection-updated', handleAdminCategoryUpdate);
    }
    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('jiyoo-admin-collection-updated', handleAdminCategoryUpdate);
      }
    };
  }, []);

  return { categoriesList, isLoading };
}
