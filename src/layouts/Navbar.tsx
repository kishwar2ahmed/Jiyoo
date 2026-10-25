import { useState, useEffect } from "react";
import { ShoppingBag, User, Search, X, Menu } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { motion, AnimatePresence, useScroll, useSpring } from "motion/react";
import { useSettings } from "../contexts/SettingsContext";
import { useStorefrontCategories } from "../features/storefront/hooks/useStorefrontCategories";
import { SOCIAL_LINKS } from "../features/core/components/SocialIcons";

export function Navbar({
  onUserClick,
  onCartClick,
  onAboutClick,
  activePage = "retail",
  onWholesaleClick,
  onRetailClick,
}: {
  onUserClick: () => void;
  onCartClick: () => void;
  onAboutClick?: () => void;
  activePage?: "retail" | "wholesale";
  onWholesaleClick?: () => void;
  onRetailClick?: () => void;
}) {
  const { cartCount, user, searchQuery, setSearchQuery } = useCart();
  const { settings } = useSettings();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { categoriesList: navCategories } = useStorefrontCategories();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMobileNavCategory = (catId: string) => {
    setMobileMenuOpen(false);
    if (activePage === "wholesale") {
      onRetailClick?.();
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("select-category", { detail: catId }));
      }, 60);
    } else {
      window.dispatchEvent(new CustomEvent("select-category", { detail: catId }));
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled || mobileMenuOpen
            ? "bg-[#FAF9F5]/95 backdrop-blur-md border-b border-[#E7E3DA] pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 shadow-2xs"
            : "bg-[#FAF9F5]/85 backdrop-blur-xs pt-[calc(1rem+env(safe-area-inset-top))] pb-4"
        }`}
      >
        {scrolled && (
          <motion.div
            aria-hidden="true"
            style={{ scaleX }}
            className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#1C1917]/75 origin-left pointer-events-none"
          />
        )}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between gap-2.5 sm:gap-4 lg:gap-8">
            {/* Zone 1: Brand Wordmark & Logo (Never cropped on mobile) */}
            <div
              className="cursor-pointer flex items-center gap-2 sm:gap-3 min-w-0"
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
                className="h-8 sm:h-9 md:h-10 w-auto object-contain rounded-xl shrink-0"
              />
              <span className="font-serif-luxury text-base sm:text-xl md:text-2xl font-semibold tracking-wider text-brand-black block leading-tight">
                {settings.storeName || "JIYOO"}
              </span>
            </div>

            {/* Zone 2: Desktop Navigation (Single-Line Controls + Wholesale Button) */}
            <nav className="hidden lg:flex items-center gap-5 xl:gap-6">
              {navCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (activePage === "wholesale") {
                      onRetailClick?.();
                      setTimeout(() => {
                        window.dispatchEvent(
                          new CustomEvent("select-category", { detail: cat.id })
                        );
                      }, 60);
                    } else {
                      window.dispatchEvent(
                        new CustomEvent("select-category", { detail: cat.id })
                      );
                    }
                  }}
                  className="text-sm font-medium text-[#57534E] hover:text-[#1C1917] underline-offset-4 hover:underline transition-colors cursor-pointer capitalize whitespace-nowrap shrink-0"
                >
                  {cat.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (activePage === "wholesale") {
                    onRetailClick?.();
                  } else {
                    onWholesaleClick?.();
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                  activePage === "wholesale"
                    ? "bg-emerald-800 text-white border-emerald-800"
                    : "bg-[#1C1917] text-[#FAF9F5] border-[#1C1917] hover:bg-[#292524]"
                }`}
              >
                {activePage === "wholesale" ? "← Retail Store" : "Wholesale"}
              </button>
              <button
                onClick={onAboutClick}
                className="text-sm font-medium text-[#57534E] hover:text-[#1C1917] underline-offset-4 hover:underline transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                About Us
              </button>
            </nav>

            {/* Zone 3: Actions + Mobile Wholesale Button + Drawer Toggle */}
            <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 shrink-0">
              {/* Mobile/Tablet Quick Wholesale Button */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (activePage === "wholesale") {
                    onRetailClick?.();
                  } else {
                    onWholesaleClick?.();
                  }
                }}
                className={`lg:hidden px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activePage === "wholesale"
                    ? "bg-emerald-800 text-white"
                    : "bg-[#1C1917] text-[#FAF9F5]"
                }`}
              >
                {activePage === "wholesale" ? "Retail" : "Wholesale"}
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSearchOpen(!searchOpen);
                }}
                className="p-1.5 text-brand-gray-900 hover:text-brand-black transition-colors cursor-pointer"
                aria-label="Search"
              >
                <Search className="w-5 h-5" strokeWidth={1.5} />
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onUserClick();
                }}
                className="p-1.5 text-brand-gray-900 hover:text-brand-black transition-colors flex items-center gap-2 cursor-pointer"
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

              <button
                id="cart-icon-button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onCartClick();
                }}
                className="p-1.5 text-brand-gray-900 hover:text-brand-black transition-colors relative cursor-pointer"
                aria-label="Cart"
              >
                <motion.div
                  key={cartCount}
                  animate={cartCount > 0 ? { scale: [1, 1.25, 1] } : {}}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                </motion.div>
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 bg-brand-black text-brand-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center tabular-nums"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </button>

              {/* Mobile / Tablet Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="lg:hidden p-1.5 text-brand-gray-900 hover:text-brand-black transition-colors cursor-pointer"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" strokeWidth={1.75} />
                ) : (
                  <Menu className="w-5 h-5" strokeWidth={1.75} />
                )}
              </button>
            </div>
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
              className="lg:hidden border-t border-[#E7E3DA] bg-[#FAF9F5] px-4 sm:px-6 pt-4 pb-5 mt-3 shadow-lg"
            >
              <div className="flex flex-col gap-1">
                {navCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleMobileNavCategory(cat.id)}
                    className="w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-[#1C1917] hover:bg-[#F4F1EA] transition-colors capitalize cursor-pointer"
                  >
                    {cat.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (activePage === "wholesale") {
                      onRetailClick?.();
                    } else {
                      onWholesaleClick?.();
                    }
                  }}
                  className="w-full text-left py-2.5 px-3 rounded-lg text-sm font-bold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/70 transition-colors cursor-pointer"
                >
                  {activePage === "wholesale"
                    ? "← Switch to Retail Store"
                    : "Wholesale Supply →"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onAboutClick?.();
                  }}
                  className="w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-[#1C1917] hover:bg-[#F4F1EA] transition-colors cursor-pointer"
                >
                  About Us
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    document.dispatchEvent(new CustomEvent("open-contact"));
                  }}
                  className="w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-[#57534E] hover:text-[#1C1917] hover:bg-[#F4F1EA] transition-colors cursor-pointer"
                >
                  Help &amp; Contact
                </button>
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

      {/* Full screen Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-50 bg-brand-white/95 backdrop-blur-md flex flex-col pt-[calc(5.5rem+env(safe-area-inset-top))] px-[calc(1rem+env(safe-area-inset-left))] sm:px-[calc(1.5rem+env(safe-area-inset-left))] lg:px-8"
          >
            <button
              onClick={() => setSearchOpen(false)}
              className="absolute top-[calc(1.25rem+env(safe-area-inset-top))] right-[calc(1.25rem+env(safe-area-inset-right))] p-2 text-brand-gray-500 hover:text-brand-black transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <div className="max-w-3xl mx-auto w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search premium products..."
                className="w-full bg-transparent border-b border-brand-gray-200 text-2xl sm:text-3xl md:text-5xl font-serif text-brand-black placeholder:text-brand-gray-200 focus:outline-none focus:border-brand-black transition-colors py-3 sm:py-4"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearchOpen(false);
                    document
                      .getElementById("products")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                autoFocus
              />
              <div className="mt-8 sm:mt-12">
                <h3 className="text-xs sm:text-sm font-medium text-brand-gray-500 uppercase tracking-widest mb-4">
                  Trending
                </h3>
                <div className="flex flex-wrap gap-2.5 sm:gap-3">
                  {[
                    "Mango",
                    "Avocado",
                    "Apples",
                    "Pomegranate",
                    "Salmon",
                    "Chicken",
                    "Mutton",
                    "Prawns",
                    "Smoothie",
                  ].map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        setSearchQuery(term);
                        setSearchOpen(false);
                        document
                          .getElementById("products")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="px-3.5 py-2 rounded-full border border-brand-gray-200 text-xs sm:text-sm hover:border-brand-black transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
