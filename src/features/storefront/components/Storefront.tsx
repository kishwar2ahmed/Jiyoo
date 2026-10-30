import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { useCart } from '../../../contexts/CartContext';
import { CATEGORIES as defaultCategories } from '../../../constants/data';
import { ProductCard } from '../../product/components/ProductCard';
import { ProductDetailModal } from '../../product/components/ProductDetailModal';
import { Product } from '../../../types';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import { useStorefrontCategories } from '../hooks/useStorefrontCategories';
import { searchCatalogProducts } from '../../../utils/fuzzyMatch';
import { useStorefrontProducts } from '../hooks/useStorefrontProducts';

export function Storefront() {
  const { categoriesList } = useStorefrontCategories();
  const {
    currentProducts,
    isProductsLoading,
    catalogStatus,
    catalogError,
    lastSyncedAt,
    isUsingCachedCatalog,
    retrySync,
  } = useStorefrontProducts();

  const [activeCategoryId, setActiveCategoryId] = useState(defaultCategories[0].id);
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(defaultCategories[0].items?.[0]?.id ?? null);
  const [activeSubSubcategoryId, setActiveSubSubcategoryId] = useState<string | null>(null);
  
  // Product Detail Modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailInitialTab, setDetailInitialTab] = useState<'details' | 'reviews'>('details');

  const handleProductClick = useCallback((product: Product, initialTab: 'details' | 'reviews' = 'details') => {
    setSelectedProduct(product);
    setDetailInitialTab(initialTab);
    setIsDetailOpen(true);
  }, []);

  const { searchQuery, setSearchQuery } = useCart();
  const [visibleCount, setVisibleCount] = useState(24);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement) => {
    if (isProductsLoading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 24);
      }
    }, { rootMargin: '1200px' });
    if (node) observerRef.current.observe(node);
  }, [isProductsLoading]);

  // Reset count on category change
  useEffect(() => { setVisibleCount(24); }, [activeCategoryId, activeSubcategoryId, activeSubSubcategoryId, searchQuery]);

  // If the active category is frozen (or no longer exists) once live category
  // data loads, fall back to the first category shoppers can actually see --
  // otherwise activeCategoryId could keep pointing at a frozen category
  // (e.g. the bundled default) whose tab is now hidden from categoriesList.
  useEffect(() => {
    if (categoriesList.length === 0) return;
    if (!categoriesList.some(c => c.id === activeCategoryId)) {
      setActiveCategoryId(categoriesList[0].id);
      const firstSub = categoriesList[0].items?.[0];
      setActiveSubcategoryId(firstSub?.id ?? null);
      setActiveSubSubcategoryId(firstSub?.items?.[0]?.id ?? null);
    }
  }, [categoriesList, activeCategoryId]);

  const activeCategoryIdRef = useRef(activeCategoryId);
  useEffect(() => { activeCategoryIdRef.current = activeCategoryId; }, [activeCategoryId]);

  const applyCategoryState = useCallback((categoryId: string) => {
    const category = categoriesList.find(c => c.id === categoryId);
    if (!category) return false;
    setActiveCategoryId(categoryId);

    if (category.items && category.items.length > 0) {
      const firstSub = category.items[0];
      setActiveSubcategoryId(firstSub.id);
      if (firstSub.items && firstSub.items.length > 0) {
        setActiveSubSubcategoryId(firstSub.items[0].id);
      } else {
        setActiveSubSubcategoryId(null);
      }
    } else {
      setActiveSubcategoryId(null);
      setActiveSubSubcategoryId(null);
    }
    return true;
  }, [categoriesList]);

  const categoryHistoryRef = useRef<string[]>([]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    if (categoryId === activeCategoryIdRef.current) return;
    if (!applyCategoryState(categoryId)) return; // frozen or no longer exists -- ignore the request

    // Record category history for the Back navigation stack
    if (activeCategoryIdRef.current && activeCategoryIdRef.current !== categoryId) {
      categoryHistoryRef.current.push(activeCategoryIdRef.current);
      sessionStorage.setItem('jiyoo_can_step_back_cat', 'true');
    }

    // Record this so browser history knows of the category change
    window.history.pushState({ jiyooCategory: categoryId }, "", window.location.href);
  }, [applyCategoryState]);

  // Back button support: step back to the previously viewed category before exit prompt
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as { jiyooCategory?: string } | null;
      if (state?.jiyooCategory && state.jiyooCategory !== activeCategoryIdRef.current) {
        applyCategoryState(state.jiyooCategory);
      }
    };

    const handleStepBackCategory = () => {
      if (categoryHistoryRef.current.length > 0) {
        const prev = categoryHistoryRef.current.pop();
        if (prev) {
          applyCategoryState(prev);
        }
        if (categoryHistoryRef.current.length === 0 || prev === defaultCategories[0].id) {
          sessionStorage.setItem('jiyoo_can_step_back_cat', 'false');
        }
      } else if (activeCategoryIdRef.current !== defaultCategories[0].id) {
        applyCategoryState(defaultCategories[0].id);
        sessionStorage.setItem('jiyoo_can_step_back_cat', 'false');
      } else {
        sessionStorage.setItem('jiyoo_can_step_back_cat', 'false');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('step-back-category', handleStepBackCategory);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('step-back-category', handleStepBackCategory);
    };
  }, [applyCategoryState]);

  const handleSubcategoryChange = useCallback((subcategoryId: string) => {
    setActiveSubcategoryId(subcategoryId);
    const category = categoriesList.find(c => c.id === activeCategoryId);
    const subcategory = category?.items?.find(s => s.id === subcategoryId);
    
    if (subcategory && subcategory.items && subcategory.items.length > 0) {
      setActiveSubSubcategoryId(subcategory.items[0].id);
    } else {
      setActiveSubSubcategoryId(null);
    }
  }, [activeCategoryId, categoriesList]);

  const handleSubSubcategoryChange = useCallback((subSubcategoryId: string) => {
    setActiveSubSubcategoryId(subSubcategoryId);
  }, []);

  const { wishlist, toggleWishlist } = useCart();


  const activeCategory = categoriesList.find(c => c.id === activeCategoryId);
  const activeSubcategory = activeCategory?.items?.find(s => s.id === activeSubcategoryId);

  const frozenCategoryIds = useMemo(
    () => new Set(categoriesList.filter(c => (c as any).isFrozen).map(c => c.id)),
    [categoriesList]
  );

  const trimmedQuery = searchQuery.trim();
  const firstSubcatId = activeCategory?.items?.[0]?.id ?? null;
  const isDefaultFirstSubcat =
    firstSubcatId !== null && activeSubcategoryId === firstSubcatId;

  const displayedProducts = trimmedQuery
    ? searchCatalogProducts(
        currentProducts.filter((p) => !frozenCategoryIds.has(p.categoryId)),
        trimmedQuery
      )
    : currentProducts.filter((p) => {
        if (p.categoryId !== activeCategoryId) return false;
        if (activeSubcategoryId) {
          if (p.subcategoryId) {
            if (p.subcategoryId !== activeSubcategoryId) return false;
          } else if (!isDefaultFirstSubcat) {
            return false;
          }
        }
        if (
          activeSubSubcategoryId &&
          p.subSubcategoryId &&
          p.subSubcategoryId !== activeSubSubcategoryId
        )
          return false;
        return true;
      });

  useEffect(() => {
    const handleSelectCategory = (e: CustomEvent<string | { categoryId: string }>) => {
      const categoryId = typeof e.detail === 'string' ? e.detail : e.detail?.categoryId;
      if (categoryId) {
        handleCategoryChange(categoryId);
        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    const handleSelectProduct = (e: any) => {
      const product = e.detail?.product;
      if (product) {
        handleProductClick(product, 'details');
      }
    };
    window.addEventListener('select-category' as any, handleSelectCategory);
    window.addEventListener('select-product' as any, handleSelectProduct);
    return () => {
      window.removeEventListener('select-category' as any, handleSelectCategory);
      window.removeEventListener('select-product' as any, handleSelectProduct);
    };
  }, [categoriesList, handleProductClick]);

  const categoryThumbnails = useMemo(() => {
    const map = new Map<string, { type: 'real-composite' | 'products', urls: string[] }>();
    
    const customPremiumImages: Record<string, string[]> = {
      'fruits': [
        'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1200&q=80&auto=format&fit=crop'
      ],
      'vegetables': [
        'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=1200&q=80&auto=format&fit=crop'
      ],
      'meat': [
        'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1200&q=80&auto=format&fit=crop'
      ],
      // User-provided Smoothies artwork; use the supplied file unchanged.
      'smoothies': [
        '/category-icons/smoothies.jpg'
      ],
      // User-provided Fast Foods artwork; use the supplied file unchanged.
      'fast-foods': [
        '/category-icons/fast-foods.png'
      ]
    };

    categoriesList.forEach(cat => {
      if (customPremiumImages[cat.id]) {
        map.set(cat.id, { type: 'real-composite', urls: customPremiumImages[cat.id] });
      } else {
        const prods = currentProducts.filter(p => p.categoryId === cat.id && p.image).slice(0, 3);
        if (prods.length > 0) {
          map.set(cat.id, { type: 'products', urls: prods.map(p => p.image!) });
        }
      }
    });
    return map;
  }, [categoriesList, currentProducts]);

  return (
    <div id="products" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-1.5 sm:pt-8 pb-6 sm:pb-12 relative">
      {!searchQuery && (
        <div className="flex flex-col gap-2 sm:gap-8 mb-3.5 sm:mb-12 relative z-10">
          {/* Main Categories - Editorial Image Cards with Scroll-Triggered Choreography & Uncropped Mobile Labels */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-6 md:gap-8 w-full pb-1.5 sm:pb-6 pt-1 sm:pt-2 items-start">
            {categoriesList.map((category, index) => {
              const isActive = activeCategoryId === category.id;
              const thumbData = categoryThumbnails.get(category.id);
              
              return (
                <motion.button
                  key={category.id}
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.55, delay: index * 0.065, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleCategoryChange(category.id)}
                  className="group relative flex min-w-0 w-full flex-col items-center outline-none gap-1 sm:gap-3.5 cursor-pointer pb-1.5 sm:pb-2.5"
                >
                  <div 
                    className={`relative w-full aspect-square sm:aspect-[4/5] max-w-[54px] sm:max-w-none mx-auto rounded-xl sm:rounded-[20px] overflow-hidden bg-brand-white border border-brand-gray-100 transition-all duration-300 ease-out sm:group-hover:shadow-[0_14px_28px_-8px_rgba(0,0,0,0.14)] ${isActive ? 'shadow-[0_10px_20px_-6px_rgba(0,0,0,0.12)] ring-2 ring-brand-black/25' : 'shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)]'}`}
                  >
                    {thumbData?.urls && thumbData.urls.length > 0 ? (
                      <img 
                        src={thumbData.urls[0]} 
                        alt={category.label} 
                        className={`w-full h-full object-cover transition-transform duration-500 ease-out sm:group-hover:scale-105 ${isActive ? 'scale-105' : 'scale-100'}`}
                        loading="lazy"
                      />
                    ) : null}
                    {(!thumbData?.urls || thumbData.urls.length === 0) && (
                      <div className="w-full h-full flex items-center justify-center bg-brand-gray-50">
                        <span className="text-brand-gray-300 font-serif text-2xl sm:text-4xl">{category.label.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  
                  <span 
                    className={`font-serif text-[10px] sm:text-base leading-tight tracking-tight sm:tracking-wide text-center w-full break-words transition-colors duration-200 ${isActive ? 'text-brand-black font-semibold' : 'text-brand-gray-600 sm:group-hover:text-brand-black'}`}
                  >
                    {category.label}
                  </span>

                  {isActive && (
                    <motion.span
                      layoutId="activeCategoryUnderline"
                      className="absolute bottom-0 w-5 sm:w-10 h-[2px] bg-[#1C1917] rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Subcategories - Refined Underline Tabs with Scroll-Drawn Border */}
          {activeCategory?.items && (
            <motion.div
              key={`subcats-${activeCategoryId}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap sm:flex-nowrap gap-x-5 gap-y-2 sm:gap-8 overflow-x-auto pb-2 scrollbar-hide border-b border-brand-gray-200"
            >
              {activeCategory.items.map(sub => {
                const isActive = activeSubcategoryId === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSubcategoryChange(sub.id)}
                    className={`relative pb-3 sm:pb-4 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors duration-300 cursor-pointer
                      ${isActive ? 'text-brand-gray-900' : 'text-brand-gray-400 hover:text-brand-gray-600'}`}
                  >
                    {sub.label}
                    {isActive && (
                      <motion.div layoutId="activeSubcategory"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gray-900"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}

          {/* Sub-Subcategories - Minimalist Segmented Controls (Uncropped Wrap on Mobile) */}
          {activeSubcategory?.items && (
            <motion.div 
              key={`subsubcats-${activeSubcategoryId}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap gap-2"
            >
              {activeSubcategory.items.map(subsub => {
                const isActive = activeSubSubcategoryId === subsub.id;
                return (
                  <motion.button
                    key={subsub.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleSubSubcategoryChange(subsub.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-200 cursor-pointer
                      ${isActive 
                        ? 'bg-brand-gray-900 text-brand-white shadow-sm' 
                        : 'bg-brand-gray-100 text-brand-gray-500 hover:bg-brand-gray-200 hover:text-brand-gray-900'
                      }`}
                  >
                    {subsub.label}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </div>
      )}

      {/* Search Header */}
      {searchQuery && (
        <div className="mb-12 border-b border-brand-gray-200 pb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-gray-100 flex items-center justify-center">
              <Search className="w-5 h-5 text-brand-gray-600" />
            </div>
            <div>
              <h2 className="text-2xl font-serif text-brand-black">Search Results</h2>
              <p className="text-brand-gray-500 text-sm mt-1">
                Found {displayedProducts.length} items for "{searchQuery}"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-black text-[#FAF9F5] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Resilient Catalog Sync Notice Banner */}
      {isUsingCachedCatalog && catalogError && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-[#FAF9F5] px-4 py-2.5 text-xs text-stone-700"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {catalogError}
              {lastSyncedAt && (
                <span className="text-stone-500 ml-1 tabular-nums">
                  · Last synced {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={retrySync}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-900 text-white text-[11px] font-semibold hover:bg-black transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Retry Sync
          </button>
        </div>
      )}

      {/* Products Grid */}
      <div className="relative min-h-[400px]">
        {isProductsLoading ? (
          <div className="w-full">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center mb-12"
            >
              <div className="relative flex items-center justify-center w-8 h-8 mb-6">
                <div className="absolute inset-0 border-[1px] border-[#1C1917]/20 rounded-full animate-[spin_4s_linear_infinite]" />
                <div className="absolute inset-1.5 border-[1px] border-[#1C1917]/40 rounded-full animate-[spin_3s_linear_infinite_reverse]" />
                <div className="w-1 h-1 bg-[#1C1917] rounded-full" />
              </div>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-[#78716C] font-semibold mb-2">
                Curating Collection
              </span>
              <span className="text-lg sm:text-xl font-serif-luxury text-[#1C1917]">
                Preparing your selection...
              </span>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-10">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <div key={n} className="flex flex-col gap-4 animate-pulse">
                  <div className="w-full aspect-[4/3] bg-[#E7E3DA]/60 rounded-2xl" />
                  <div className="space-y-3">
                    <div className="w-1/3 h-2.5 bg-[#D6D3D1]/60 rounded-full" />
                    <div className="w-3/4 h-3.5 bg-[#D6D3D1]/60 rounded-full" />
                    <div className="w-1/4 h-4 bg-[#D6D3D1]/60 rounded-full mt-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : displayedProducts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className=" flex flex-col items-center justify-center text-center py-20 px-4 bg-brand-gray-50 rounded-3xl border border-brand-gray-200"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-brand-white shadow-xl shadow-brand-gray-200/50 flex items-center justify-center mb-6">
              <Search className="w-8 h-8 sm:w-10 sm:h-10 text-brand-gray-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-serif text-brand-black mb-2">
              {catalogStatus === 'SUCCESS_EMPTY' ? 'No products available' : 'No items found'}
            </h3>
            <p className="text-sm sm:text-base text-brand-gray-500 max-w-md mx-auto">
              {catalogStatus === 'SUCCESS_EMPTY'
                ? 'Our catalog is currently being updated. Please check back shortly.'
                : "We couldn't find any products matching your current selection. Try browsing a different category or refining your search."}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-5 px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-black text-[#FAF9F5] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Show All Categories
              </button>
            )}
          </motion.div>
        ) : (
          <div
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-5 sm:gap-x-6 sm:gap-y-10"
          >
            {displayedProducts.slice(0, visibleCount).map((product, idx) => (
              <ProductCard 
                key={product.id} 
                index={idx}
                product={product} 
                isWishlisted={wishlist.includes(String(product.id))}
                toggleWishlist={toggleWishlist}
                onProductClick={handleProductClick}
              />
            ))}
          </div>
        )}
        
        {displayedProducts.length > visibleCount && (
          <div ref={loadMoreRef} className="w-full h-32 flex flex-col items-center justify-center mt-8 gap-4">
            <div className="relative flex items-center justify-center w-6 h-6">
              <div className="absolute inset-0 border-[1px] border-[#1C1917]/20 rounded-full animate-[spin_4s_linear_infinite]" />
              <div className="absolute inset-1 border-[1px] border-[#1C1917]/40 rounded-full animate-[spin_3s_linear_infinite_reverse]" />
            </div>
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#78716C] font-semibold">
              Loading more selections
            </span>
          </div>
        )}
      </div>

      <ProductDetailModal
        product={selectedProduct}
        allProducts={currentProducts}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setTimeout(() => setSelectedProduct(null), 400);
        }}
        wishlist={wishlist}
        toggleWishlist={toggleWishlist}
        onProductClick={handleProductClick}
        initialTab={detailInitialTab}
      />
    </div>
  );
}
