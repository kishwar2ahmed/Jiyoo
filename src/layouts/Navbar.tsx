import { useState, useEffect } from "react";
import { ShoppingBag, User, Search, X } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { motion, AnimatePresence } from "motion/react";
import { useSettings } from "../contexts/SettingsContext";
import { useStorefrontCategories } from "../features/storefront/hooks/useStorefrontCategories";

export function Navbar({
  onUserClick,
  onCartClick,
  onAboutClick,
}: {
  onUserClick: () => void;
  onCartClick: () => void;
  onAboutClick?: () => void;
}) {
  const { cartCount, user, logoutUser, searchQuery, setSearchQuery } =
    useCart();
  const { settings } = useSettings();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { categoriesList: navCategories } = useStorefrontCategories();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? "bg-[#FAF9F5]/95 border-b border-[#E7E3DA] pt-[calc(0.875rem+env(safe-area-inset-top))] pb-3.5 shadow-xs" : "bg-transparent pt-[calc(1.25rem+env(safe-area-inset-top))] pb-5"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div
              className="flex-shrink-0 cursor-pointer flex items-center gap-3"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <img
                src="/jiyoo.logo.jpeg"
                alt={settings.storeName || "JIYOO"}
                className="h-9 md:h-10 w-auto object-contain rounded-xl"
              />
              <span className="font-serif-luxury text-lg sm:text-xl md:text-2xl font-semibold tracking-wider text-brand-black block truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
                {settings.storeName || "JIYOO"}
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6 items-center">
              <button
                onClick={onAboutClick}
                className="text-sm font-medium text-brand-gray-500 hover:text-brand-black transition-colors cursor-pointer"
              >
                About Us
              </button>
              {navCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("select-category", { detail: cat.id }),
                    )
                  }
                  className="text-sm font-medium text-brand-gray-500 hover:text-brand-black transition-colors cursor-pointer capitalize"
                >
                  {cat.label}
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-3 sm:space-x-4 md:space-x-6">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="text-brand-gray-900 hover:text-brand-black transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" strokeWidth={1.5} />
              </button>

              <button
                onClick={onUserClick}
                className="text-brand-gray-900 hover:text-brand-black transition-colors flex items-center gap-2"
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
                onClick={onCartClick}
                className="text-brand-gray-900 hover:text-brand-black transition-colors relative"
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
                    className="absolute -top-1.5 -right-1.5 bg-brand-black text-brand-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Full screen Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-50 bg-brand-white/95 backdrop-blur-md flex flex-col pt-[calc(6rem+env(safe-area-inset-top))] px-[calc(1rem+env(safe-area-inset-left))] sm:px-[calc(1.5rem+env(safe-area-inset-left))] lg:px-8"
          >
            <button
              onClick={() => setSearchOpen(false)}
              className="absolute top-[calc(1.5rem+env(safe-area-inset-top))] right-[calc(1.5rem+env(safe-area-inset-right))] p-2 text-brand-gray-500 hover:text-brand-black transition-colors"
            >
              <X className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <div className="max-w-3xl mx-auto w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search premium products..."
                className="w-full bg-transparent border-b border-brand-gray-200 text-3xl md:text-5xl font-serif text-brand-black placeholder:text-brand-gray-200 focus:outline-none focus:border-brand-black transition-colors py-4"
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
              <div className="mt-12">
                <h3 className="text-sm font-medium text-brand-gray-500 uppercase tracking-widest mb-4">
                  Trending
                </h3>
                <div className="flex flex-wrap gap-3">
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
                      className="px-4 py-2 rounded-full border border-brand-gray-200 text-sm hover:border-brand-black transition-colors"
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
