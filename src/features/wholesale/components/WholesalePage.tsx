import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  ShoppingBag,
  X,
  Minus,
  Heart,
} from "lucide-react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useCart } from "../../../contexts/CartContext";
import { useToast } from "../../core/contexts/ToastContext";
import { sanitizeWhatsAppNumber } from "../../../utils/whatsapp";
import { TypewriterText } from "../../core/components/TypewriterText";
import { useStorefrontProducts } from "../../storefront/hooks/useStorefrontProducts";
import { VelvetyBalloonButton } from "../../product/components/VelvetyBalloonButton";
import { VelvetWhatsAppButton } from "../../product/components/VelvetWhatsAppButton";
import { ProductDetailModal } from "../../product/components/ProductDetailModal";
import { getOptimizedImageUrl } from "../../../utils/imageUtils";
import { Product } from "../../../types";

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const WHOLESALE_TYPEWRITER_PHRASES = [
  "Direct container imports & orchard-packed master cartons.",
  "Calibrated citrus, pome & exotic fruit lots for HoReCa & retail.",
  "Temperature-controlled cold-chain dispatch with GST invoicing.",
  "Transparent ex-dock trade pricing per carton and per kilogram.",
] as const;

type LotCategoryFilter = "All Lots" | "Citrus" | "Apples & Pears" | "Exotics & Berries" | "Vineyard Grapes";

const LOT_FILTERS: LotCategoryFilter[] = [
  "All Lots",
  "Citrus",
  "Apples & Pears",
  "Exotics & Berries",
  "Vineyard Grapes",
];

/**
 * Strips any stray emoji characters from legacy or cached strings
 * so the trade catalog remains 100% editorial and typographically pure.
 */
function cleanEditorialText(input?: string | number | null): string {
  if (input === undefined || input === null) return "";
  return String(input)
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function matchesLotFilter(product: Product, filter: LotCategoryFilter): boolean {
  if (filter === "All Lots") return true;
  const haystack = `${product.name} ${product.description || ""} ${(product.tags || []).join(" ")}`.toLowerCase();
  switch (filter) {
    case "Citrus":
      return haystack.includes("orange") || haystack.includes("citrus") || haystack.includes("mandarin") || haystack.includes("limpopo");
    case "Apples & Pears":
      return haystack.includes("apple") || haystack.includes("pear") || haystack.includes("crisp pink");
    case "Exotics & Berries":
      return haystack.includes("dragon") || haystack.includes("blueberry") || haystack.includes("berry") || haystack.includes("exotic");
    case "Vineyard Grapes":
      return haystack.includes("grape") || haystack.includes("seedless") || haystack.includes("sonaka");
    default:
      return true;
  }
}

function computeIndicativeUnitRate(product: Product, wholesalePrice: number): string {
  const netWeightStr = cleanEditorialText(product.netWeight);
  const kgMatch = netWeightStr.match(/(\d+(?:\.\d+)?)\s*kg/i);
  if (kgMatch && Number(kgMatch[1]) > 0) {
    const kg = Number(kgMatch[1]);
    return `₹${Math.round(wholesalePrice / kg).toLocaleString("en-IN")} / kg`;
  }
  const countNum =
    typeof product.count === "number"
      ? product.count
      : typeof product.count === "string"
      ? parseInt(product.count, 10)
      : null;
  if (countNum && countNum > 0) {
    return `₹${Math.round(wholesalePrice / countNum).toLocaleString("en-IN")} / pc`;
  }
  return "Trade Net";
}

function triggerSafeExternalLink(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function WholesalePage({
  onBackToRetail,
  onOpenCart,
}: {
  onBackToRetail: () => void;
  onOpenCart?: () => void;
}) {
  const { settings } = useSettings();
  const {
    addToCart,
    triggerFlyingItem,
    items: cartItems,
    cartCount,
    cartTotal,
    removeFromCart,
    updateQuantity,
  } = useCart();
  const { showToast } = useToast();
  const { dbProducts } = useStorefrontProducts();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<LotCategoryFilter>("All Lots");
  const [justAddedMap, setJustAddedMap] = useState<Record<string, boolean>>({});
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("jiyoo_wishlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const imageRefs = useRef<Record<string, HTMLImageElement | null>>({});

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("jiyoo_wishlist", JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  const b2bWhatsAppNumber = sanitizeWhatsAppNumber(settings?.whatsappNumber);

  const wholesaleProducts = useMemo(() => {
    return dbProducts.filter((p) => p.wholesaleEligible === true);
  }, [dbProducts]);

  const filteredProducts = useMemo(() => {
    return wholesaleProducts.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.origin && p.origin.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)));

      const matchesCategory = matchesLotFilter(p, selectedFilter);

      return matchesSearch && matchesCategory;
    });
  }, [wholesaleProducts, searchQuery, selectedFilter]);

  const handleAddToCart = (
    e: React.MouseEvent<HTMLButtonElement>,
    product: Product
  ) => {
    e.stopPropagation();

    const unitPrice =
      typeof product.wholesalePrice === "number" && product.wholesalePrice > 0
        ? product.wholesalePrice
        : typeof product.numericPrice === "number" && product.numericPrice > 0
        ? product.numericPrice
        : parseFloat(String(product.price).replace(/[^0-9.]/g, "")) || 0;

    const unitLabel = cleanEditorialText(
      product.wholesaleUnit || product.unit || "Master Carton"
    );
    const cleanName = cleanEditorialText(product.name);
    const cartItemId = `${product.id}-${unitLabel}--`;

    const btnRect = e.currentTarget.getBoundingClientRect();
    const imgEl = imageRefs.current[String(product.id)];
    const imgRect = imgEl?.getBoundingClientRect();

    const useImageOrigin =
      imgRect &&
      imgRect.width > 0 &&
      imgRect.height > 0 &&
      imgRect.bottom > 0 &&
      imgRect.top < window.innerHeight;

    const startX = useImageOrigin
      ? imgRect.left + imgRect.width / 2
      : btnRect.left + btnRect.width / 2;
    const startY = useImageOrigin
      ? imgRect.top + imgRect.height / 2
      : btnRect.top + btnRect.height / 2;

    const renderedImage =
      imgEl?.currentSrc || imgEl?.src || getOptimizedImageUrl(product.image, 420, 78);

    triggerFlyingItem({
      image: renderedImage,
      name: cleanName,
      price: `₹${unitPrice}`,
      badge: unitLabel,
      startX,
      startY,
    });

    addToCart(
      {
        id: cartItemId,
        baseId: product.id,
        selectedWeight: unitLabel,
        name: cleanName,
        price: `₹${unitPrice}`,
        numericPrice: unitPrice,
        image: renderedImage,
        badge: unitLabel,
        wholesaleEligible: true,
        wholesaleMinQty: product.wholesaleMinQty || 1,
      } as any,
      product.wholesaleMinQty || 1
    );

    setJustAddedMap((prev) => ({ ...prev, [String(product.id)]: true }));
    setTimeout(() => {
      setJustAddedMap((prev) => ({ ...prev, [String(product.id)]: false }));
    }, 1100);

    showToast(`Added ${cleanName} (${unitLabel}) to cart`, "success");
  };

  const handleWhatsAppOrder = (
    e: React.MouseEvent<HTMLButtonElement>,
    product: Product
  ) => {
    e.stopPropagation();

    const wholesalePrice =
      product.wholesalePrice || product.numericPrice || Number(product.price);
    const priceText = `INR ${Number(wholesalePrice).toLocaleString("en-IN")}`;
    const packText = cleanEditorialText(
      product.wholesaleUnit || product.unit || "Master Carton"
    );
    const cleanName = cleanEditorialText(product.name);
    const brandText = product.brand ? `Brand: ${cleanEditorialText(product.brand)}` : "";
    const originText = product.origin ? `Origin: ${cleanEditorialText(product.origin)}` : "";
    const countText = product.count ? `Pack Count: ${cleanEditorialText(product.count)}` : "";
    const weightText = product.netWeight ? `Net Weight: ${cleanEditorialText(product.netWeight)}` : "";

    const specs = [brandText, originText, countText, weightText]
      .filter(Boolean)
      .join(" | ");

    const message = [
      "Hello JIYOO Wholesale Trade Desk,",
      "",
      `I would like to place a wholesale trade inquiry for:`,
      `Lot: ${cleanName}`,
      specs ? `Specifications: ${specs}` : "",
      `Quoted Rate: ${priceText} per ${packText}`,
      "",
      "Please share current lot availability and dispatch schedule.",
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://wa.me/${b2bWhatsAppNumber}?text=${encodeURIComponent(message)}`;
    triggerSafeExternalLink(url);
  };

  return (
    <section className="min-h-screen bg-[#FAF9F5] text-[#1C1917] pb-24 pt-6 px-4 sm:px-6 lg:px-8">
      {/* Top Architectural Sub-Navigation Bar */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#E7E3DA] pb-5">
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={onBackToRetail}
            className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1C1917] hover:bg-black text-[#FAF9F5] text-xs font-semibold uppercase tracking-[0.14em] transition-all cursor-pointer active:scale-98"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Back to Retail Store</span>
          </button>

          <div className="hidden md:flex items-center gap-2 text-xs text-[#78716C] tracking-wide">
            <span className="font-semibold text-[#1C1917] uppercase tracking-[0.16em] text-[10px]">
              Trade Catalog
            </span>
            <span aria-hidden="true">·</span>
            <span>Direct Container &amp; Orchard Lots</span>
            <span aria-hidden="true">·</span>
            <span>Hyderabad &amp; Pan-India Cold Chain</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <a
            href={`https://wa.me/${b2bWhatsAppNumber}?text=${encodeURIComponent(
              "Hello JIYOO Trade Desk, I would like to enquire about wholesale bulk lots and commercial procurement terms."
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1C1917] hover:text-[#8A5A36] border-b border-[#1C1917]/40 hover:border-[#8A5A36] pb-0.5 transition-colors"
          >
            Direct Trade Desk
          </a>

          {onOpenCart && (
            <button
              type="button"
              onClick={onOpenCart}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-[#F5F2EB] border border-[#D6CFC2] text-[#1C1917] text-xs font-semibold uppercase tracking-[0.12em] shadow-2xs transition-all cursor-pointer active:scale-98"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#8A5A36]" />
              <span>Trade Bag</span>
              <span className="px-1.5 py-0.5 rounded bg-[#1C1917] text-[#FAF9F5] font-mono text-[10px] font-bold tabular-nums">
                {cartCount}
              </span>
              {cartTotal > 0 && (
                <span className="hidden sm:inline font-mono text-[11px] font-bold text-[#8A5A36] tabular-nums">
                  · ₹{cartTotal.toLocaleString("en-IN")}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Editorial Trade Ledger Hero */}
      <div className="max-w-7xl mx-auto mb-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE_OUT_EXPO }}
          className="relative overflow-hidden rounded-2xl bg-[#161412] text-[#FAF9F5] p-7 sm:p-11 lg:p-14 border border-[#C5A880]/30 shadow-[0_24px_48px_-16px_rgba(28,25,23,0.28)]"
        >
          {/* Subtle Warm Champagne Radial Accent */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 -right-32 w-[28rem] h-[28rem] bg-[radial-gradient(circle,rgba(197,168,128,0.14)_0%,transparent_70%)]"
          />

          <div className="relative z-10 max-w-3xl">
            {/* Unboxed Editorial Division Kicker */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: EASE_OUT_EXPO }}
              className="flex items-center gap-3 mb-4"
            >
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.7, delay: 0.14, ease: EASE_OUT_EXPO }}
                className="w-8 h-[1px] bg-[#C5A880] origin-left"
                aria-hidden="true"
              />
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.26em] text-[#E5C99B]">
                JIYOO Commercial &amp; HoReCa Division
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.14, ease: EASE_OUT_EXPO }}
              className="font-serif-luxury text-3xl sm:text-5xl font-semibold tracking-tight text-[#FAF9F5] leading-[1.12] mb-3"
            >
              Direct Import &amp; Orchard Wholesale Lots
            </motion.h1>

            <div className="py-1 mb-3">
              <TypewriterText
                phrases={WHOLESALE_TYPEWRITER_PHRASES}
                typingSpeed={38}
                deletingSpeed={18}
                pauseDuration={2400}
                className="justify-items-start"
                textClassName="font-serif-luxury italic text-base sm:text-xl text-[#E5C99B]"
                cursorClassName="bg-[#E5C99B]"
              />
            </div>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.24, ease: EASE_OUT_EXPO }}
              className="text-sm sm:text-base text-[#D6D3D1] font-normal leading-relaxed max-w-2xl"
            >
              Calibrated export master cartons and vineyard crates curated for luxury hospitality, gourmet supermarkets, and institutional kitchens. Every lot is inspected for brix, firmness, and cold-chain integrity prior to dispatch.
            </motion.p>
          </div>

          {/* Architectural Hairline Ledger Strip (Zero Nested Cards or Icons) */}
          <div className="relative z-10 mt-8 pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { label: "Cold Chain", value: "2°C – 4°C Reefer Transit" },
              { label: "Lot Calibration", value: "Class-I Export Cartons" },
              { label: "Documentation", value: "GST Commercial Invoice" },
              { label: "Trade Pricing", value: "Direct Ex-Dock Net Rates" },
            ].map((spec, idx) => (
              <motion.div
                key={spec.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + idx * 0.06, ease: EASE_OUT_EXPO }}
              >
                <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#A8A29E] mb-1">
                  {spec.label}
                </span>
                <span className="font-serif-luxury text-base sm:text-lg font-medium text-[#FAF9F5]">
                  {spec.value}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Catalog Controls: Search & Segmented Lot Filter Bar */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by variety, brand, or origin (e.g. Limpopo, New Zealand)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-lg bg-white border border-[#E7E3DA] text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#1C1917] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#1C1917] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Interactive Segmented Control Bar with Fluid Spring Pill */}
          <div
            role="tablist"
            aria-label="Wholesale lot categories"
            className="inline-flex items-center gap-1 p-1 bg-[#F2EFE9] border border-[#E7E3DA] rounded-lg overflow-x-auto scrollbar-none"
          >
            {LOT_FILTERS.map((filter) => {
              const isActive = selectedFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedFilter(filter)}
                  className={`relative px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors duration-200 cursor-pointer z-10 ${
                    isActive
                      ? "text-[#FAF9F5]"
                      : "text-[#57534E] hover:text-[#1C1917]"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="wholesaleLotFilterPill"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="pointer-events-none absolute inset-0 rounded-md bg-[#1C1917] shadow-xs -z-10"
                    />
                  )}
                  <span className="relative z-10">{filter}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Wholesale Product Lots Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#E7E3DA] pb-3">
          <div className="flex items-baseline gap-3">
            <h2 className="font-serif-luxury text-2xl sm:text-3xl font-semibold text-[#1C1917]">
              Current Trade Lots
            </h2>
            <span className="text-xs font-mono text-[#78716C] tabular-nums">
              ({filteredProducts.length} {filteredProducts.length === 1 ? "Lot" : "Lots"} Available)
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-[0.18em] text-[#78716C] font-medium">
            Prices Inclusive of Standard Export Packing
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E7E3DA] p-12 text-center space-y-3">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#8A5A36]">
              No Matching Trade Lots
            </p>
            <h3 className="font-serif-luxury text-2xl font-semibold text-[#1C1917]">
              No wholesale lots match your current filter
            </h3>
            <p className="text-sm text-[#78716C] max-w-md mx-auto">
              Clear your search filter to view all active container and orchard lots, or contact our trade desk for custom variety sourcing.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedFilter("All Lots");
                }}
                className="px-5 py-2.5 rounded-lg bg-[#1C1917] text-[#FAF9F5] text-xs font-semibold uppercase tracking-[0.14em] cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product, index) => {
              const wholesalePrice =
                typeof product.wholesalePrice === "number" && product.wholesalePrice > 0
                  ? product.wholesalePrice
                  : typeof product.numericPrice === "number" && product.numericPrice > 0
                  ? product.numericPrice
                  : Number(product.price) || 0;

              const wholesaleUnit = cleanEditorialText(
                product.wholesaleUnit || product.unit || "Master Carton"
              );
              const cleanName = cleanEditorialText(product.name);
              const cleanBrand = cleanEditorialText(product.brand);
              const cleanOrigin = cleanEditorialText(product.origin);
              const cleanCount = cleanEditorialText(product.count) || "Standard Lot";
              const cleanNetWeight = cleanEditorialText(product.netWeight) || wholesaleUnit;
              const unitRateLabel = computeIndicativeUnitRate(product, wholesalePrice);

              const cartItemId = `${product.id}-${wholesaleUnit}--`;
              const matchingCartItem = cartItems.find(
                (i) => String(i.id) === cartItemId || String(i.id) === String(product.id)
              );
              const qtyInCart = matchingCartItem?.quantity || 0;
              const isJustAdded = !!justAddedMap[String(product.id)];
              const isWishlisted = wishlist.includes(String(product.id));
              const optimizedImg = getOptimizedImageUrl(product.image, 520, 82);
              const lotNumber = String(index + 1).padStart(2, "0");

              const metadataParts = [
                cleanOrigin || "Imported Lot",
                cleanBrand ? `${cleanBrand} Brand` : null,
                cleanEditorialText(product.freshnessBadge) || "Export Grade",
              ].filter(Boolean);

              return (
                <motion.article
                  key={product.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, transition: { duration: 0.25, ease: EASE_OUT_EXPO } }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.36, delay: (index % 3) * 0.04, ease: EASE_OUT_EXPO }}
                  onClick={() => setSelectedProduct(product)}
                  className="group relative bg-white rounded-xl border border-[#E7E3DA] hover:border-[#C5A880] shadow-xs hover:shadow-[0_20px_40px_-14px_rgba(28,25,23,0.12)] transition-shadow duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
                >
                  {/* Top Ultra-Fine Gold Shimmer Line on Scroll */}
                  <motion.span
                    aria-hidden="true"
                    initial={{ scaleX: 0, opacity: 0 }}
                    whileInView={{ scaleX: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.55, delay: 0.05 + (index % 3) * 0.04, ease: EASE_OUT_EXPO }}
                    className="pointer-events-none absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#C5A880]/80 to-transparent origin-left z-20"
                  />

                  <div>
                    {/* Full-Bleed Uncropped Image Header (Zero Top Badge Sandwich) */}
                    <div className="luxury-sheen-sweep relative aspect-[4/3] bg-white p-5 flex items-center justify-center border-b border-[#E7E3DA]/70 overflow-hidden">
                      {/* Quiet Unboxed Lot Index */}
                      <span className="absolute top-3.5 left-4 z-10 font-mono text-[10px] uppercase tracking-[0.22em] text-[#78716C]">
                        LOT {lotNumber}
                      </span>

                      {/* Wishlist Toggle */}
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(String(product.id));
                          showToast(
                            isWishlisted ? "Removed from saved lots" : "Saved wholesale lot",
                            isWishlisted ? "info" : "success"
                          );
                        }}
                        aria-label={isWishlisted ? "Remove from wishlist" : "Save lot"}
                        className={`absolute top-3 right-3.5 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-colors border cursor-pointer ${
                          isWishlisted
                            ? "bg-red-50 border-red-200 text-red-600"
                            : "bg-[#FAF9F5]/90 hover:bg-white text-[#1C1917] border-[#E7E3DA]"
                        }`}
                      >
                        <Heart
                          className="w-3.5 h-3.5"
                          fill={isWishlisted ? "#DC2626" : "none"}
                          stroke={isWishlisted ? "#DC2626" : "currentColor"}
                        />
                      </motion.button>

                      <img
                        ref={(el) => {
                          imageRefs.current[String(product.id)] = el;
                        }}
                        src={optimizedImg}
                        alt={cleanName}
                        className="w-full h-full object-contain group-hover:scale-[1.045] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        loading={index < 6 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    </div>

                    {/* Editorial Body & Hairline Trade Specifications */}
                    <div className="p-5 pb-3">
                      {/* Unboxed Provenance Metadata with Middot Separators */}
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] uppercase tracking-[0.16em] text-[#8A5A36] font-semibold mb-1.5">
                        {metadataParts.map((part, idx) => (
                          <React.Fragment key={idx}>
                            {idx > 0 && (
                              <span aria-hidden="true" className="text-[#A8A29E]">
                                ·
                              </span>
                            )}
                            <span>{part}</span>
                          </React.Fragment>
                        ))}
                      </div>

                      <h3 className="font-serif-luxury text-xl sm:text-[22px] font-semibold text-[#1C1917] leading-snug mb-1.5 group-hover:text-black transition-colors">
                        {cleanName}
                      </h3>

                      {product.description && (
                        <p className="text-xs text-[#57534E] line-clamp-2 leading-relaxed font-normal mb-3.5">
                          {cleanEditorialText(product.description)}
                        </p>
                      )}

                      {/* Architectural Hairline Specification Table (Zero Nested Card Box) */}
                      <dl className="grid grid-cols-3 gap-2 py-2.5 border-y border-[#E7E3DA] text-left">
                        <div>
                          <dt className="text-[9px] font-mono uppercase tracking-[0.16em] text-[#78716C] mb-0.5">
                            Pack Count
                          </dt>
                          <dd className="text-xs font-semibold text-[#1C1917] tabular-nums truncate">
                            {cleanCount}
                          </dd>
                        </div>
                        <div className="border-l border-[#E7E3DA]/70 pl-2.5">
                          <dt className="text-[9px] font-mono uppercase tracking-[0.16em] text-[#78716C] mb-0.5">
                            Net Weight
                          </dt>
                          <dd className="text-xs font-semibold text-[#1C1917] tabular-nums truncate">
                            {cleanNetWeight}
                          </dd>
                        </div>
                        <div className="border-l border-[#E7E3DA]/70 pl-2.5">
                          <dt className="text-[9px] font-mono uppercase tracking-[0.16em] text-[#78716C] mb-0.5">
                            Indicative
                          </dt>
                          <dd className="text-xs font-mono font-semibold text-[#1C1917] tabular-nums truncate">
                            {unitRateLabel}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Pricing & Action Footer */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="px-5 pb-5 pt-1 space-y-3.5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#78716C] block mb-0.5">
                          Wholesale Lot Rate
                        </span>
                        <div className="flex items-baseline gap-2 tabular-nums">
                          <span className="font-serif-luxury text-2xl font-bold text-[#1C1917]">
                            ₹{wholesalePrice.toLocaleString("en-IN")}
                          </span>
                          {product.mrp && Number(product.mrp) > wholesalePrice && (
                            <span className="text-xs text-[#A8A29E] line-through">
                              ₹{Number(product.mrp).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#57534E] block">
                          {wholesaleUnit}
                        </span>
                        <span className="text-[10px] text-[#78716C] block">
                          MOQ: {product.wholesaleMinQty || 1} Lot
                        </span>
                      </div>
                    </div>

                    {/* Action Controls: Add to Cart & Maroon Velvet WhatsApp Order */}
                    <div className="grid grid-cols-2 items-center gap-2 pt-1">
                      <div className="relative flex items-center gap-1.5 min-w-0 justify-center">
                        <AnimatePresence>
                          {qtyInCart > 0 && (
                            <motion.button
                              type="button"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              whileTap={{ scale: 0.85 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!matchingCartItem) return;
                                const minQty = product.wholesaleMinQty || 1;
                                if (qtyInCart <= minQty) {
                                  removeFromCart(String(matchingCartItem.id));
                                } else {
                                  updateQuantity(String(matchingCartItem.id), qtyInCart - 1);
                                }
                              }}
                              aria-label="Decrease lot quantity"
                              className="w-[32px] h-[32px] rounded-full flex items-center justify-center bg-[#1C1917] hover:bg-[#292524] text-[#FAF2E1] border border-[#C5A880]/70 shadow-sm cursor-pointer shrink-0"
                            >
                              <Minus className="w-3.5 h-3.5" strokeWidth={2.6} />
                            </motion.button>
                          )}
                        </AnimatePresence>

                        <div className="relative inline-flex items-center justify-center w-full min-w-0">
                          <VelvetyBalloonButton
                            onClick={(e) => handleAddToCart(e, product)}
                            justAdded={isJustAdded}
                            label="Add to Cart"
                            size="card"
                            className="w-full flex items-center justify-center"
                          />
                          <AnimatePresence>
                            {qtyInCart > 0 && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                key={qtyInCart}
                                className="pointer-events-none absolute -top-1.5 -right-1.5 min-w-[21px] h-[21px] px-1 rounded-full bg-[#1C1917] text-[#FAF2E1] border-2 border-[#C5A880] text-[10.5px] font-bold font-mono flex items-center justify-center shadow-md z-30"
                              >
                                {qtyInCart}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="min-w-0 flex items-center justify-center">
                        <VelvetWhatsAppButton
                          onClick={(e) => handleWhatsAppOrder(e, product)}
                          label="Order via WhatsApp"
                          size="card"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      {/* Institutional & HoReCa Standing Contract Ledger */}
      <div className="max-w-7xl mx-auto mt-16 pt-10 border-t border-[#E7E3DA]">
        <div className="bg-white rounded-2xl border border-[#E7E3DA] p-7 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-[1px] bg-[#8A5A36]" aria-hidden="true" />
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#8A5A36] font-semibold">
                Standing Commercial Supply &amp; Pallet Contracts
              </span>
            </div>
            <h3 className="font-serif-luxury text-2xl sm:text-3xl font-semibold text-[#1C1917]">
              Custom Weekly Procurement for Hotels &amp; Supermarkets
            </h3>
            <p className="text-sm text-[#57534E] leading-relaxed">
              We fulfill scheduled standing orders for five-star hospitality groups, fine-dining kitchens, and regional retail chains with dedicated cold-chain dispatch and consolidated GST billing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 w-full lg:w-auto">
            <VelvetWhatsAppButton
              onClick={() => {
                const url = `https://wa.me/${b2bWhatsAppNumber}?text=${encodeURIComponent(
                  "Hello JIYOO Trade Desk, I would like to discuss standing weekly commercial supply and pallet procurement terms."
                )}`;
                triggerSafeExternalLink(url);
              }}
              label="Request Trade Quote"
              size="modal"
            />
            <button
              type="button"
              onClick={onBackToRetail}
              className="h-[50px] sm:h-[52px] px-6 rounded-full bg-[#1C1917] hover:bg-black text-[#FAF9F5] text-xs font-semibold uppercase tracking-[0.16em] transition-colors cursor-pointer"
            >
              Return to Retail Store
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Floating Wholesale Trade Cart Bar */}
      <AnimatePresence>
        {cartCount > 0 && onOpenCart && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
            className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl z-40"
          >
            <div className="bg-[#161412]/95 backdrop-blur-md text-[#FAF9F5] border border-[#C5A880]/50 rounded-2xl px-4 sm:px-6 py-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.45)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/40 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5 text-[#E5C99B]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E5C99B]">
                      Wholesale Trade Bag
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-[#C5A880]/20 text-[#FAF9F5] font-mono text-[10px] font-bold tabular-nums">
                      {cartCount} {cartCount === 1 ? "Lot" : "Lots"}
                    </span>
                  </div>
                  <p className="font-serif-luxury text-lg sm:text-xl font-bold text-[#FAF9F5] tabular-nums leading-tight">
                    ₹{cartTotal.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenCart}
                className="inline-flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-[#E5C99B] hover:bg-[#C5A880] text-[#161412] text-xs font-bold uppercase tracking-[0.14em] transition-all cursor-pointer shrink-0 active:scale-98 shadow-sm"
              >
                <span>View Cart &amp; Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Product Detail Modal on Card Click */}
      <ProductDetailModal
        product={selectedProduct}
        allProducts={wholesaleProducts}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        wishlist={wishlist}
        toggleWishlist={toggleWishlist}
        onProductClick={(prod) => setSelectedProduct(prod)}
      />
    </section>
  );
}
