import React, { useState, useEffect, useRef, useMemo } from "react";
import { ShoppingBag, User, Search, X, Menu, ArrowRight, Plus } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { motion, AnimatePresence, useScroll, useSpring } from "motion/react";
import { useSettings } from "../contexts/SettingsContext";
import { useStorefrontCategories } from "../features/storefront/hooks/useStorefrontCategories";
import { useStorefrontProducts } from "../features/storefront/hooks/useStorefrontProducts";
import { SOCIAL_LINKS } from "../features/core/components/SocialIcons";
import { searchCatalogProducts } from "../utils/fuzzyMatch";
import { getOptimizedImageUrl } from "../utils/imageUtils";
import { Product } from "../types";
import { useModalBackButton } from "../features/core/hooks/useModalBackButton";

const TRENDING_SEARCHES = [
  "Mango",
  "Avocado",
  "Apples",
  "Pomegranate",
  "Chicken",
  "Mutton",
  "Salmon",
  "Prawns",
  "Smoothie",
  "Momos",
];

const EDITORIAL_SEARCH_SUGGESTIONS = [
  "Search Alphonso mangoes...",
  "Search fresh salmon & prawns...",
  "Search premium tender mutton...",
  "Search Hass avocados & berries...",
  "Search cold-pressed smoothies...",
  "Search artisan momos & bites...",
];

export function Navbar({
  onUserClick,
  onCartClick,
  onAboutClick,
  onContactClick,
  activePage = "retail",
  onWholesaleClick,
  onRetailClick,
}: {
  onUserClick: () => void;
  onCartClick: () => void;
  onAboutClick?: () => void;
  onContactClick?: () => void;
  activePage?: "retail" | "wholesale";
  onWholesaleClick?: () => void;
  onRetailClick?: () => void;
}) {
  const { cartCount, user, searchQuery, setSearchQuery, addToCart, triggerFlyingItem } = useCart();
  const { settings } = useSettings();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownFocused, setDropdownFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartPulseKey, setCartPulseKey] = useState(0);
  const [isCartUpdating, setIsCartUpdating] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [isDesktopFocused, setIsDesktopFocused] = useState(false);
  const [isMobileFocused, setIsMobileFocused] = useState(false);
  const prevCartCountRef = useRef(cartCount);
  useModalBackButton(searchOpen, () => {
    setSearchOpen(false);
  });
  const headerRef = useRef<HTMLElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const modalSearchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchContainerMobileRef = useRef<HTMLDivElement>(null);

  const { categoriesList: navCategories } = useStorefrontCategories();
  const { currentProducts } = useStorefrontProducts();

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setSuggestionIdx((prev) => (prev + 1) % EDITORIAL_SEARCH_SUGGESTIONS.length);
    }, 3400);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const triggerCartPulse = () => {
      setCartPulseKey((prev) => prev + 1);
      setIsCartUpdating(true);
    };

    if (prevCartCountRef.current !== cartCount) {
      prevCartCountRef.current = cartCount;
      if (cartCount > 0) {
        triggerCartPulse();
      }
    }

    window.addEventListener("jiyoo-cart-landed", triggerCartPulse);
    return () => window.removeEventListener("jiyoo-cart-landed", triggerCartPulse);
  }, [cartCount]);

  useEffect(() => {
    if (!isCartUpdating) return;
    const timer = setTimeout(() => setIsCartUpdating(false), 520);
    return () => clearTimeout(timer);
  }, [cartPulseKey, isCartUpdating]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close inline dropdown when clicking outside either desktop or mobile search,
  // and close mobile menu when clicking outside the header or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedDesktop = searchContainerRef.current?.contains(target);
      const clickedMobile = searchContainerMobileRef.current?.contains(target);
      if (!clickedDesktop && !clickedMobile) {
        setDropdownFocused(false);
      }
      if (!clickedDesktop) {
        setIsDesktopFocused(false);
      }
      if (!clickedMobile) {
        setIsMobileFocused(false);
      }
      if (headerRef.current && !headerRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  // Global keyboard shortcut Cmd/Ctrl + K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => modalSearchInputRef.current?.focus(), 60);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const frozenCategoryIds = useMemo(
    () => new Set(navCategories.filter((c) => (c as any).isFrozen).map((c) => c.id)),
    [navCategories]
  );

  const liveSearchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    const searchable = currentProducts.filter((p) => !frozenCategoryIds.has(p.categoryId));
    return searchCatalogProducts(searchable, q);
  }, [searchQuery, currentProducts, frozenCategoryIds]);

  const scrollToProductsSection = () => {
    const scrollTarget = () => {
      const el = document.getElementById("products");
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }
    };
    if (activePage === "wholesale") {
      onRetailClick?.();
      setTimeout(scrollTarget, 100);
    } else {
      scrollTarget();
    }
  };

  const handleRealTimeSearchChange = (value: string) => {
    setSearchQuery(value);
    setDropdownFocused(true);
    if (value.trim() && activePage === "wholesale") {
      onRetailClick?.();
    }
  };

  const executeSearchAction = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchOpen(true);
      setTimeout(() => modalSearchInputRef.current?.focus(), 60);
      return;
    }
    setDropdownFocused(false);
    setSearchOpen(false);
    setMobileMenuOpen(false);
    scrollToProductsSection();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeSearchAction();
    } else if (e.key === "Escape") {
      setDropdownFocused(false);
      setSearchOpen(false);
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  const handleSelectProductFromSearch = (product: Product) => {
    setDropdownFocused(false);
    setSearchOpen(false);
    setMobileMenuOpen(false);
    const dispatchOpen = () => {
      window.dispatchEvent(new CustomEvent("select-product", { detail: { product } }));
      const el = document.getElementById("products");
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }
    };
    if (activePage === "wholesale") {
      onRetailClick?.();
      setTimeout(dispatchOpen, 120);
    } else {
      dispatchOpen();
    }
  };

  const handleQuickAddFromSearch = (
    e: React.MouseEvent<HTMLButtonElement>,
    product: Product
  ) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const defaultWeight = product.weights?.[0];
    const unitPrice = defaultWeight ? defaultWeight.price : product.price;
    const unitLabel = defaultWeight ? defaultWeight.label : product.unit;
    const defaultCut = product.fishCuts?.[0];
    const numericPrice =
      typeof unitPrice === "number"
        ? unitPrice
        : parseFloat(String(unitPrice).replace(/[^0-9.]/g, "")) || 0;

    const optimizedImg = getOptimizedImageUrl(product.image, 400, 80);
    triggerFlyingItem({
      image: optimizedImg,
      name: product.name,
      price: `₹${numericPrice}`,
      badge: unitLabel,
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
    });

    let itemName = product.name;
    if (defaultCut) itemName += ` - ${defaultCut}`;

    addToCart(
      {
        id: `${product.id}-${unitLabel || ""}-${defaultCut || ""}-`,
        baseId: product.id,
        selectedWeight: unitLabel,
        selectedCut: defaultCut || undefined,
        name: itemName,
        price: `₹${numericPrice}`,
        numericPrice,
        image: optimizedImg,
        badge: unitLabel,
      },
      1
    );
  };

  const handleMobileNavCategory = (catId: string) => {
    setMobileMenuOpen(false);
    setDropdownFocused(false);
    if (searchQuery.trim()) {
      setSearchQuery("");
    }
    try {
      sessionStorage.setItem("jiyoo_pending_category", catId);
    } catch {
      // ignore storage error
    }

    const dispatchAndScroll = () => {
      window.dispatchEvent(new CustomEvent("select-category", { detail: catId }));
      const el = document.getElementById("products");
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 116;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }
    };

    if (activePage === "wholesale") {
      onRetailClick?.();
      setTimeout(dispatchAndScroll, 120);
    } else {
      setTimeout(dispatchAndScroll, 20);
    }
  };

  const renderSearchDropdownContent = () => (
    <>
      {searchQuery.trim() ? (
        <div className="flex flex-col max-h-[60dvh] sm:max-h-[440px]">
          <div className="px-4 py-2.5 bg-[#FAF9F5] border-b border-[#E7E3DA] flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">
              {liveSearchResults.length} Matching Product{liveSearchResults.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchOpen(true);
                setDropdownFocused(false);
              }}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              Full View ↗
            </button>
          </div>

          {liveSearchResults.length === 0 ? (
            <div className="p-5 text-center space-y-3">
              <p className="text-sm font-medium text-[#1C1917]">
                No products found for &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-[#78716C]">
                Try a popular search below:
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                {TRENDING_SEARCHES.slice(0, 6).map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleRealTimeSearchChange(term)}
                    className="px-2.5 py-1 rounded-md bg-[#F4F1EA] hover:bg-[#1C1917] hover:text-white text-xs text-[#1C1917] transition-colors cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-y-auto divide-y divide-[#F4F1EA]">
                {liveSearchResults.slice(0, 6).map((product) => {
                  const displayPrice =
                    product.weights?.[0]?.price ?? product.price;
                  const displayUnit =
                    product.weights?.[0]?.label ?? product.unit;
                  return (
                    <div
                      key={product.id}
                      onClick={() => handleSelectProductFromSearch(product)}
                      className="flex items-center gap-3 p-3 hover:bg-[#FAF9F5] transition-colors cursor-pointer group"
                    >
                      <img
                        src={getOptimizedImageUrl(product.image, 120, 80)}
                        alt={product.name}
                        className="w-12 h-12 rounded-xl object-cover bg-[#F4F1EA] border border-[#E7E3DA] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-[#1C1917] truncate group-hover:text-emerald-800 transition-colors">
                          {product.name}
                        </p>
                        <p className="text-[11px] text-[#78716C] flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-[#1C1917]">
                            ₹{displayPrice}
                          </span>
                          {displayUnit && <span>• {displayUnit}</span>}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleQuickAddFromSearch(e, product)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#1C1917] hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => executeSearchAction()}
                className="w-full py-2.5 px-4 bg-[#1C1917] hover:bg-black text-[#FAF9F5] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>
                  View All {liveSearchResults.length} Results in Store
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#78716C]">
              Popular Searches
            </span>
            <button
              type="button"
              onClick={() => setDropdownFocused(false)}
              className="text-[11px] text-[#78716C] hover:text-[#1C1917]"
            >
              Close
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TRENDING_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  handleRealTimeSearchChange(term);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#FAF9F5] hover:bg-[#1C1917] hover:text-white border border-[#E7E3DA] text-xs font-medium text-[#1C1917] transition-colors cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled || mobileMenuOpen
            ? "bg-[#FAF9F5]/95 backdrop-blur-md border-b border-[#E7E3DA] pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2.5 sm:pb-3 shadow-2xs"
            : "bg-[#FAF9F5]/90 backdrop-blur-sm pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 sm:pb-4"
        }`}
      >
        {scrolled && (
          <motion.div
            aria-hidden="true"
            style={{ scaleX }}
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00D2FF] via-[#0EA5E9] to-[#0284C7] shadow-[0_0_10px_rgba(14,165,233,0.85)] origin-left pointer-events-none"
          />
        )}
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-12">
          {/* ========================================================= */}
          {/* DESKTOP HEADER (≥ lg): Balanced 3-Zone Architecture      */}
          {/* ========================================================= */}
          <div className="hidden lg:flex items-center justify-between gap-4 lg:gap-6">
            {/* Zone 1: Brand Wordmark & Logo */}
            <div
              className="group cursor-pointer flex items-center gap-2 sm:gap-3 min-w-0 shrink-0"
              onClick={() => {
                setMobileMenuOpen(false);
                if (activePage === "wholesale") {
                  onRetailClick?.();
                } else {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              <img
                src="/jiyoo.logo.jpeg"
                alt={settings.storeName || "JIYOO"}
                className="h-9 md:h-10 w-auto object-contain rounded-xl shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
              />
              <span className="font-serif-luxury text-xl md:text-2xl font-semibold tracking-wider text-brand-black block leading-tight truncate transition-colors duration-200 group-hover:text-black">
                {settings.storeName || "JIYOO"}
              </span>
            </div>

            {/* Zone 2: Desktop Navigation Categories & Premium Retail | Wholesale Switch */}
            <nav className="flex items-center gap-3.5 xl:gap-5">
              {/* Premium Segmented Switch: Retail | Wholesale */}
              <div
                role="group"
                aria-label="Store mode switch"
                className="inline-flex items-center p-0.5 rounded-xl bg-[#EAE5D9] border border-[#D6CFC2] shadow-inner shrink-0"
              >
                <button
                  type="button"
                  onClick={() => onRetailClick?.()}
                  aria-pressed={activePage === "retail"}
                  className={`relative px-3.5 py-1.5 rounded-[9px] text-[11px] font-bold uppercase tracking-[0.1em] transition-colors duration-200 cursor-pointer whitespace-nowrap z-10 ${
                    activePage === "retail"
                      ? "text-[#FAF9F5]"
                      : "text-[#57534E] hover:text-[#1C1917]"
                  }`}
                >
                  {activePage === "retail" && (
                    <motion.span
                      layoutId="navbarDesktopModePill"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="pointer-events-none absolute inset-0 rounded-[9px] bg-[#1C1917] shadow-xs -z-10"
                    />
                  )}
                  <span className="relative z-10">Retail</span>
                </button>
                <button
                  type="button"
                  onClick={() => onWholesaleClick?.()}
                  aria-pressed={activePage === "wholesale"}
                  className={`relative px-3.5 py-1.5 rounded-[9px] text-[11px] font-bold uppercase tracking-[0.1em] transition-colors duration-200 cursor-pointer whitespace-nowrap z-10 ${
                    activePage === "wholesale"
                      ? "text-[#FAF9F5]"
                      : "text-[#57534E] hover:text-[#1C1917]"
                  }`}
                >
                  {activePage === "wholesale" && (
                    <motion.span
                      layoutId="navbarDesktopModePill"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="pointer-events-none absolute inset-0 rounded-[9px] bg-[#1C1917] shadow-xs -z-10"
                    />
                  )}
                  <span className="relative z-10">Wholesale</span>
                </button>
              </div>

              {activePage === "retail" &&
                navCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleMobileNavCategory(cat.id)}
                    className="group relative py-1 text-sm font-medium text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer capitalize whitespace-nowrap shrink-0"
                  >
                    <span>{cat.label}</span>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#1C1917] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    />
                  </button>
                ))}
              <button
                onClick={onAboutClick}
                className="group relative py-1 text-sm font-medium text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>About Us</span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#1C1917] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                />
              </button>
            </nav>

            {/* Zone 3: Desktop Real-Time Search Bar + Actions */}
            <div className="flex items-center gap-2.5 md:gap-3 shrink-0">
              {activePage === "retail" && (
                <div
                  ref={searchContainerRef}
                  className="relative w-[240px] xl:w-[290px]"
                >
                  <form
                    onSubmit={executeSearchAction}
                    role="search"
                    className="relative flex items-center w-full"
                  >
                    <button
                      type="submit"
                      aria-label="Search products"
                      title="Search products"
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1.5 text-[#57534E] hover:text-[#1C1917] rounded-md hover:bg-[#F4F1EA] transition-colors cursor-pointer z-10"
                    >
                      <Search className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>

                    <input
                      ref={desktopSearchInputRef}
                      type="search"
                      value={searchQuery}
                      onFocus={() => {
                        setIsDesktopFocused(true);
                        setDropdownFocused(true);
                      }}
                      onChange={(e) => handleRealTimeSearchChange(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder={isDesktopFocused ? "Type to search catalog..." : ""}
                      aria-label="Search products by name in real-time"
                      className="w-full pl-8 pr-16 py-1.5 text-xs sm:text-[13px] bg-white hover:bg-white focus:bg-white text-[#1C1917] placeholder:text-[#A8A29E] rounded-lg border border-[#DCD6CA] focus:border-[#1C1917] focus:ring-2 focus:ring-[#1C1917]/10 focus:outline-none transition-all shadow-2xs"
                    />

                    {/* Editorial Rotating Suggestion Dial (Active only when empty and not focused) */}
                    {!searchQuery && !isDesktopFocused && (
                      <div
                        className="pointer-events-none absolute left-8 right-16 top-0 bottom-0 flex items-center overflow-hidden"
                        aria-hidden="true"
                      >
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={suggestionIdx}
                            initial={{ y: 9, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -9, opacity: 0 }}
                            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                            className="text-xs sm:text-[13px] text-[#78716C] truncate font-normal tracking-wide select-none"
                          >
                            {EDITORIAL_SEARCH_SUGGESTIONS[suggestionIdx]}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    )}

                    {searchQuery ? (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            desktopSearchInputRef.current?.focus();
                          }}
                          aria-label="Clear search query"
                          className="p-1 text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer rounded-md"
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                        <button
                          type="submit"
                          aria-label="Go to search results"
                          className="px-2 py-1 bg-[#1C1917] hover:bg-black text-[#FAF9F5] text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                        >
                          Go
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchOpen(true);
                          setTimeout(() => modalSearchInputRef.current?.focus(), 60);
                        }}
                        aria-label="Open full search"
                        title="Open Search (⌘K)"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-[#F4F1EA] hover:bg-[#E7E3DA] text-[#1C1917] text-[10px] font-semibold rounded-md transition-colors cursor-pointer border border-[#DCD6CA]/70"
                      >
                        Search
                      </button>
                    )}
                  </form>

                  {/* Desktop Search Dropdown */}
                  <AnimatePresence>
                    {dropdownFocused && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 top-full mt-2 w-[400px] md:w-[440px] bg-white rounded-2xl shadow-[0_24px_60px_-12px_rgba(28,25,23,0.28)] border border-[#E7E3DA] overflow-hidden z-50"
                      >
                        {renderSearchDropdownContent()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* User Account Button */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onUserClick();
                }}
                className="p-1.5 text-brand-gray-900 hover:text-brand-black transition-colors flex items-center gap-2 cursor-pointer shrink-0"
                aria-label="Account"
              >
                {user ? (
                  user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || user.displayName || "User"}
                      className="w-7 h-7 rounded-full border border-brand-gray-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-brand-gray-100 border border-brand-gray-200 flex items-center justify-center text-xs font-semibold text-brand-black">
                      {(user.name || user.displayName || user.email || "Member")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )
                ) : (
                  <User className="w-5 h-5" strokeWidth={1.5} />
                )}
              </button>

              {/* Cart Button (Always visible on Retail & Wholesale) */}
              <button
                id="cart-icon-button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onCartClick();
                }}
                className="p-1.5 text-brand-gray-900 hover:text-brand-black transition-colors relative cursor-pointer shrink-0"
                aria-label="Cart"
              >
                <AnimatePresence>
                  {isCartUpdating && (
                    <motion.span
                      key={`desktop-cart-halo-${cartPulseKey}`}
                      initial={{ scale: 0.75, opacity: 0.7 }}
                      animate={{ scale: 1.45, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className="pointer-events-none absolute inset-0 rounded-full border border-[#C5A880]/70"
                    />
                  )}
                </AnimatePresence>

                <motion.div
                  key={`desktop-bag-${cartPulseKey}`}
                  animate={
                    cartPulseKey > 0
                      ? { scale: [1, 1.18, 0.94, 1.04, 1], y: [0, -2, 1, -0.5, 0] }
                      : {}
                  }
                  transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                </motion.div>

                <AnimatePresence initial={false}>
                  {cartCount > 0 && (
                    <motion.span
                      key="desktop-cart-badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: isCartUpdating ? [1, 1.18, 1] : 1,
                        opacity: 1,
                      }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center overflow-hidden tabular-nums text-[10px] font-bold tracking-tight transition-colors duration-300 ${
                        isCartUpdating
                          ? "bg-[#1C1917] text-[#E5C99B] ring-2 ring-[#C5A880]/70 shadow-[0_2px_10px_rgba(197,168,128,0.45)]"
                          : "bg-[#1C1917] text-[#FAF9F5] border border-[#C5A880]/60 shadow-xs"
                      }`}
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={cartCount}
                          initial={{ y: 9, opacity: 0, scale: 0.8 }}
                          animate={{ y: 0, opacity: 1, scale: 1 }}
                          exit={{ y: -9, opacity: 0, scale: 0.8 }}
                          transition={{
                            type: "spring",
                            stiffness: 480,
                            damping: 28,
                            mass: 0.6,
                          }}
                          className="inline-block leading-none font-semibold tabular-nums"
                        >
                          {cartCount}
                        </motion.span>
                      </AnimatePresence>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* MOBILE HEADER (< lg): Two-Row Layout, Zero Collision      */}
          {/* Row 1: Menu + Logo | Retail/Wholesale Switch | User+Cart  */}
          {/* Row 2: Full-Width Search Bar (Only on Retail Page)        */}
          {/* ========================================================= */}
          <div className="flex flex-col gap-2 lg:hidden">
            {/* Row 1: Brand Identity, Premium Retail | Wholesale Switch & Actions */}
            <div className="flex items-center justify-between gap-1.5 w-full">
              {/* Left Group: Menu Toggle & Brand Logo */}
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="p-1.5 -ml-1 text-stone-900 hover:bg-stone-200/50 rounded-lg transition-colors cursor-pointer shrink-0"
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? (
                    <X className="w-5 h-5" strokeWidth={2} />
                  ) : (
                    <Menu className="w-5 h-5" strokeWidth={2} />
                  )}
                </button>

                <div
                  className="cursor-pointer flex items-center gap-1.5 min-w-0"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (activePage === "wholesale") {
                      onRetailClick?.();
                    } else {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                >
                  <img
                    src="/jiyoo.logo.jpeg"
                    alt={settings.storeName || "JIYOO"}
                    className="h-6.5 sm:h-7 w-auto object-contain rounded-lg shrink-0"
                  />
                  <span className="font-serif-luxury text-sm sm:text-base font-bold tracking-wider text-brand-black block leading-tight truncate">
                    JIYOO
                  </span>
                </div>
              </div>

              {/* Center: Premium Retail | Wholesale Segmented Switch */}
              <div
                role="group"
                aria-label="Store mode switch"
                className="inline-flex items-center p-0.5 rounded-lg bg-[#EAE5D9] border border-[#D6CFC2] shadow-inner shrink-0"
              >
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onRetailClick?.();
                  }}
                  aria-pressed={activePage === "retail"}
                  className={`relative px-2 sm:px-2.5 py-1 rounded-md text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer whitespace-nowrap z-10 ${
                    activePage === "retail"
                      ? "text-[#FAF9F5]"
                      : "text-[#57534E] hover:text-[#1C1917]"
                  }`}
                >
                  {activePage === "retail" && (
                    <motion.span
                      layoutId="navbarMobileModePill"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="pointer-events-none absolute inset-0 rounded-md bg-[#1C1917] shadow-2xs -z-10"
                    />
                  )}
                  <span className="relative z-10">Retail</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onWholesaleClick?.();
                  }}
                  aria-pressed={activePage === "wholesale"}
                  className={`relative px-2 sm:px-2.5 py-1 rounded-md text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer whitespace-nowrap z-10 ${
                    activePage === "wholesale"
                      ? "text-[#FAF9F5]"
                      : "text-[#57534E] hover:text-[#1C1917]"
                  }`}
                >
                  {activePage === "wholesale" && (
                    <motion.span
                      layoutId="navbarMobileModePill"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="pointer-events-none absolute inset-0 rounded-md bg-[#1C1917] shadow-2xs -z-10"
                    />
                  )}
                  <span className="relative z-10">Wholesale</span>
                </button>
              </div>

              {/* Right Group: User Account & Cart Buttons */}
              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onUserClick();
                  }}
                  className="p-1.5 text-stone-900 hover:bg-stone-200/50 rounded-lg transition-colors flex items-center cursor-pointer shrink-0"
                  aria-label="Account"
                >
                  {user ? (
                    user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name || user.displayName || "User"}
                        className="w-6 h-6 rounded-full border border-stone-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-stone-200 border border-stone-300 flex items-center justify-center text-[10px] font-bold text-stone-900">
                        {(user.name || user.displayName || user.email || "M")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )
                  ) : (
                    <User className="w-5 h-5" strokeWidth={1.75} />
                  )}
                </button>

                <button
                  id="cart-icon-button-mobile"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onCartClick();
                  }}
                  className="p-1.5 text-stone-900 hover:bg-stone-200/50 rounded-lg transition-colors relative cursor-pointer shrink-0"
                  aria-label="Cart"
                >
                  <AnimatePresence>
                    {isCartUpdating && (
                      <motion.span
                        key={`mobile-cart-halo-${cartPulseKey}`}
                        initial={{ scale: 0.75, opacity: 0.7 }}
                        animate={{ scale: 1.45, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="pointer-events-none absolute inset-0 rounded-full border border-[#C5A880]/70"
                      />
                    )}
                  </AnimatePresence>

                  <motion.div
                    key={`mobile-bag-${cartPulseKey}`}
                    animate={
                      cartPulseKey > 0
                        ? { scale: [1, 1.18, 0.94, 1.04, 1], y: [0, -2, 1, -0.5, 0] }
                        : {}
                    }
                    transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <ShoppingBag className="w-5 h-5" strokeWidth={1.75} />
                  </motion.div>

                  <AnimatePresence initial={false}>
                    {cartCount > 0 && (
                      <motion.span
                        key="mobile-cart-badge"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                          scale: isCartUpdating ? [1, 1.18, 1] : 1,
                          opacity: 1,
                        }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center overflow-hidden tabular-nums text-[10px] font-bold tracking-tight transition-colors duration-300 ${
                          isCartUpdating
                            ? "bg-[#1C1917] text-[#E5C99B] ring-2 ring-[#C5A880]/70 shadow-[0_2px_10px_rgba(197,168,128,0.45)]"
                            : "bg-[#1C1917] text-[#FAF9F5] border border-[#C5A880]/60 shadow-xs"
                        }`}
                      >
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={cartCount}
                            initial={{ y: 9, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -9, opacity: 0, scale: 0.8 }}
                            transition={{
                              type: "spring",
                              stiffness: 480,
                              damping: 28,
                              mass: 0.6,
                            }}
                            className="inline-block leading-none font-semibold tabular-nums"
                          >
                            {cartCount}
                          </motion.span>
                        </AnimatePresence>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>

            {/* Row 2: Full-Width Search Input with Attached Live Dropdown (Retail Page Only) */}
            {activePage === "retail" && (
              <div
                ref={searchContainerMobileRef}
                className="relative w-full"
              >
                <form
                  onSubmit={executeSearchAction}
                  role="search"
                  className="relative flex items-center w-full"
                >
                  <button
                    type="submit"
                    aria-label="Search products"
                    title="Search products"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer z-10"
                  >
                    <Search className="w-4 h-4" strokeWidth={2} />
                  </button>

                  <input
                    ref={mobileSearchInputRef}
                    type="search"
                    value={searchQuery}
                    onFocus={() => {
                      setIsMobileFocused(true);
                      setDropdownFocused(true);
                    }}
                    onChange={(e) => handleRealTimeSearchChange(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={isMobileFocused ? "Type to search catalog..." : ""}
                    aria-label="Search products by name in real-time"
                    className="w-full pl-9 pr-16 py-2 text-xs sm:text-[13px] bg-white text-stone-900 placeholder:text-stone-400 rounded-xl border border-stone-300/80 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 focus:outline-none transition-all shadow-2xs"
                  />

                  {/* Editorial Rotating Suggestion Dial (Active only when empty and not focused) */}
                  {!searchQuery && !isMobileFocused && (
                    <div
                      className="pointer-events-none absolute left-9 right-16 top-0 bottom-0 flex items-center overflow-hidden"
                      aria-hidden="true"
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={suggestionIdx}
                          initial={{ y: 9, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -9, opacity: 0 }}
                          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                          className="text-xs sm:text-[13px] text-stone-500 truncate font-normal tracking-wide select-none"
                        >
                          {EDITORIAL_SEARCH_SUGGESTIONS[suggestionIdx]}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  )}

                  {searchQuery ? (
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          mobileSearchInputRef.current?.focus();
                        }}
                        aria-label="Clear search query"
                        className="p-1 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer rounded-md"
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                      <button
                        type="submit"
                        aria-label="Go to search results"
                        className="px-2.5 py-1 bg-[#1C1917] hover:bg-black text-[#FAF9F5] text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                      >
                        Go
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      aria-label="Search catalog"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-semibold rounded-md transition-colors cursor-pointer border border-stone-200"
                    >
                      Search
                    </button>
                  )}
                </form>

                {/* Mobile Live Search Dropdown */}
                <AnimatePresence>
                  {dropdownFocused && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.99 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute left-0 right-0 top-full mt-1.5 w-full bg-white rounded-2xl shadow-[0_20px_50px_-10px_rgba(28,25,23,0.25)] border border-[#E7E3DA] overflow-hidden z-50"
                    >
                      {renderSearchDropdownContent()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Responsive Mobile & Tablet Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden border-t border-[#E7E3DA] bg-[#FAF9F5] px-4 sm:px-6 pt-4 pb-5 mt-3 shadow-lg max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain"
            >
              {/* Store Mode Switch inside Drawer */}
              <div className="mb-3 p-1 rounded-xl bg-[#EAE5D9] border border-[#D6CFC2] grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onRetailClick?.();
                  }}
                  className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activePage === "retail"
                      ? "bg-[#1C1917] text-[#FAF9F5] shadow-xs"
                      : "text-[#57534E] hover:text-[#1C1917]"
                  }`}
                >
                  Retail Store
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onWholesaleClick?.();
                  }}
                  className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activePage === "wholesale"
                      ? "bg-[#1C1917] text-[#FAF9F5] shadow-xs"
                      : "text-[#57534E] hover:text-[#1C1917]"
                  }`}
                >
                  Wholesale
                </button>
              </div>

              <div className="flex flex-col gap-1">
                {navCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleMobileNavCategory(cat.id)}
                    className="w-full flex items-center justify-between text-left py-2.5 px-3 rounded-lg text-sm font-medium text-[#1C1917] hover:bg-[#F4F1EA] active:bg-[#EAE5D9] transition-colors capitalize cursor-pointer"
                  >
                    <span>{cat.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#78716C]" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onAboutClick) {
                      onAboutClick();
                    } else {
                      document.dispatchEvent(new CustomEvent("open-about"));
                    }
                  }}
                  className="w-full flex items-center justify-between text-left py-2.5 px-3 rounded-lg text-sm font-medium text-[#1C1917] hover:bg-[#F4F1EA] active:bg-[#EAE5D9] transition-colors cursor-pointer"
                >
                  <span>About Us</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#78716C]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onContactClick) {
                      onContactClick();
                    } else {
                      document.dispatchEvent(new CustomEvent("open-contact"));
                    }
                  }}
                  className="w-full flex items-center justify-between text-left py-2.5 px-3 rounded-lg text-sm font-medium text-[#57534E] hover:text-[#1C1917] hover:bg-[#F4F1EA] active:bg-[#EAE5D9] transition-colors cursor-pointer"
                >
                  <span>Help &amp; Contact</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#78716C]" />
                </button>
                <a
                  href="tel:+919739391891"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-between text-left py-2.5 px-3 rounded-lg text-sm font-medium text-emerald-800 hover:bg-emerald-50/80 active:bg-emerald-100/70 transition-colors cursor-pointer"
                >
                  <span>Call Support (+91 97393 91891)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
                </a>
              </div>

              {/* Official Social Channels inside Mobile Drawer */}
              <div className="mt-4 pt-4 border-t border-[#E7E3DA] flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#78716C]">
                  Official Channels
                </span>
                <div className="flex items-center gap-2.5">
                  {SOCIAL_LINKS.map((link) => (
                    <a
                      key={link.id}
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : "_self"}
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      title={`${link.label}: ${link.handle}`}
                      className="w-9 h-9 rounded-lg bg-white border border-[#E7E3DA] flex items-center justify-center text-[#1C1917] hover:bg-[#F4F1EA] transition-colors"
                      style={{ color: link.accentColor }}
                    >
                      {link.icon({ className: "w-4 h-4" })}
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Full Screen Interactive Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed inset-0 z-50 bg-[#FAF9F5]/98 backdrop-blur-xl flex flex-col pt-[calc(4.5rem+env(safe-area-inset-top))] pb-8 px-4 sm:px-6 lg:px-10 overflow-y-auto overscroll-contain"
          >
            <div className="max-w-4xl mx-auto w-full">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#78716C]">
                  Instant Catalog Search
                </span>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E7E3DA] text-xs font-semibold text-[#1C1917] hover:bg-[#F4F1EA] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>

              <form onSubmit={executeSearchAction} className="relative flex items-center">
                <Search className="w-6 h-6 text-[#78716C] absolute left-4 pointer-events-none" />
                <input
                  ref={modalSearchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleRealTimeSearchChange(e.target.value)}
                  placeholder="Search fruits, vegetables, chicken, mutton, seafood, smoothies..."
                  className="w-full bg-white border-2 border-[#1C1917] rounded-2xl pl-13 pr-32 py-4 text-base sm:text-xl font-medium text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none shadow-sm"
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                />
                <div className="absolute right-2.5 flex items-center gap-1.5">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        modalSearchInputRef.current?.focus();
                      }}
                      className="p-2 text-[#78716C] hover:text-[#1C1917] rounded-lg cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-[#1C1917] hover:bg-black text-[#FAF9F5] rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Trending Tags */}
              <div className="mt-6">
                <h3 className="text-[11px] font-bold text-[#78716C] uppercase tracking-widest mb-3">
                  Popular &amp; Trending
                </h3>
                <div className="flex flex-wrap gap-2">
                  {TRENDING_SEARCHES.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        handleRealTimeSearchChange(term);
                      }}
                      className={`px-3.5 py-1.5 rounded-lg border text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                        searchQuery.toLowerCase() === term.toLowerCase()
                          ? "bg-[#1C1917] text-white border-[#1C1917]"
                          : "bg-white border-[#E7E3DA] text-[#1C1917] hover:border-[#1C1917]"
                      }`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Results Grid inside Full-Screen Search */}
              <div className="mt-8">
                {searchQuery.trim() ? (
                  liveSearchResults.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#E7E3DA] p-10 text-center">
                      <p className="text-lg font-serif text-[#1C1917]">
                        No matching products for &ldquo;{searchQuery}&rdquo;
                      </p>
                      <p className="text-xs text-[#78716C] mt-1">
                        Try searching for another fruit, vegetable, cut of meat, or smoothie.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#57534E]">
                          Showing {Math.min(12, liveSearchResults.length)} of {liveSearchResults.length} results
                        </p>
                        <button
                          type="button"
                          onClick={() => executeSearchAction()}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                        >
                          <span>View all in storefront</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {liveSearchResults.slice(0, 12).map((product, sIdx) => {
                          const displayPrice =
                            product.weights?.[0]?.price ?? product.price;
                          const displayUnit =
                            product.weights?.[0]?.label ?? product.unit;
                          return (
                            <motion.div
                              key={product.id}
                              initial={{ opacity: 0, y: 10, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{
                                duration: 0.28,
                                delay: (sIdx % 6) * 0.03,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              whileHover={{ y: -3 }}
                              onClick={() => handleSelectProductFromSearch(product)}
                              className="flex items-center gap-3.5 p-3 bg-white rounded-2xl border border-[#E7E3DA] hover:border-[#C5A880] hover:shadow-[0_12px_28px_-10px_rgba(28,25,23,0.12)] transition-all cursor-pointer shadow-2xs group"
                            >
                              <img
                                src={getOptimizedImageUrl(product.image, 160, 80)}
                                alt={product.name}
                                className="w-16 h-16 rounded-xl object-cover bg-[#FAF9F5] border border-[#E7E3DA] shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-[#1C1917] truncate group-hover:text-emerald-800 transition-colors">
                                  {product.name}
                                </h4>
                                <p className="text-xs text-[#78716C] mt-0.5 tabular-nums">
                                  <span className="font-bold text-[#1C1917]">
                                    ₹{displayPrice}
                                  </span>{" "}
                                  {displayUnit ? `/ ${displayUnit}` : ""}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => handleQuickAddFromSearch(e, product)}
                                    className="px-2.5 py-1 rounded-lg bg-[#1C1917] hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Add to Bag
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
