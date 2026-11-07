import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  ShoppingBag,
  X,
  Minus,
  Plus,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useCart } from "../../../contexts/CartContext";
import { useToast } from "../../core/contexts/ToastContext";
import { sanitizeWhatsAppNumber } from "../../../utils/whatsapp";
import { useStorefrontProducts } from "../../storefront/hooks/useStorefrontProducts";
import { VelvetyBalloonButton } from "../../product/components/VelvetyBalloonButton";
import { VelvetWhatsAppButton } from "../../product/components/VelvetWhatsAppButton";
import { ProductDetailModal } from "../../product/components/ProductDetailModal";
import { getOptimizedImageUrl, createSvgPlaceholder } from "../../../utils/imageUtils";
import { Product } from "../../../types";
import { PriceDisplay } from "../../core/components/PriceDisplay";
import { InstaBlueTickIcon } from "../../core/components/SocialIcons";
import { PremiumShieldMark } from "../../core/components/PremiumShieldMark";
import { RealisticDeliveryScooter } from "../../core/components/RealisticDeliveryScooter";

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const WHOLESALE_TYPEWRITER_PHRASES = [
  "Full boxes of fresh fruits at wholesale prices.",
  "Fresh oranges, apples, pears, berries, and grapes in bulk packs.",
  "All over India delivery for full fruit boxes.",
  "Save ₹300 to ₹500 on every full fruit box.",
] as const;

type LotCategoryFilter = "All Boxes" | "Oranges" | "Apples & Pears" | "Dragon Fruit & Berries" | "Grapes";

const LOT_FILTERS: LotCategoryFilter[] = [
  "All Boxes",
  "Oranges",
  "Apples & Pears",
  "Dragon Fruit & Berries",
  "Grapes",
];

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
  if (filter === "All Boxes") return true;
  const haystack = `${product.name} ${product.description || ""} ${(product.tags || []).join(" ")}`.toLowerCase();
  switch (filter) {
    case "Oranges":
      return haystack.includes("orange") || haystack.includes("citrus") || haystack.includes("mandarin") || haystack.includes("limpopo");
    case "Apples & Pears":
      return haystack.includes("apple") || haystack.includes("pear") || haystack.includes("crisp pink");
    case "Dragon Fruit & Berries":
      return haystack.includes("dragon") || haystack.includes("blueberry") || haystack.includes("berry") || haystack.includes("exotic");
    case "Grapes":
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
  return "Wholesale Net";
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

function WholesaleLotCardImageArea({
  product,
  savingsAmount,
  isWishlisted,
  toggleWishlist,
  showToast,
  index,
  cleanName,
  imageRefCallback,
}: {
  product: Product;
  savingsAmount: number;
  isWishlisted: boolean;
  toggleWishlist: (id: string) => void;
  showToast: (msg: string, type: "info" | "success") => void;
  index: number;
  cleanName: string;
  imageRefCallback: (el: HTMLImageElement | null) => void;
}) {
  const allImages = useMemo(() => {
    return Array.from(
      new Set([product.image, ...(product.images || [])].filter(Boolean))
    ) as string[];
  }, [product.image, product.images]);

  const [activeIdx, setActiveIdx] = useState(0);
  const currentImage = allImages[activeIdx] || product.image;
  const optimizedImg = getOptimizedImageUrl(currentImage, 520, 82);

  return (
    <div className="luxury-sheen-sweep relative aspect-[4/3] bg-white p-5 flex items-center justify-center border-b border-[#E7E3DA]/70 overflow-hidden">
      {/* Savings / Wholesale Pack Tag */}
      {savingsAmount > 0 ? (
        <span className="absolute top-3.5 left-4 z-10 font-sans text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#8A5A36] bg-[#FAF9F5]/95 border border-[#C5A880]/50 px-2.5 py-1 rounded-md shadow-2xs">
          Save ₹{savingsAmount.toLocaleString("en-IN")} / Box
        </span>
      ) : (
        <span className="absolute top-3.5 left-4 z-10 font-sans text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#57534E] bg-[#FAF9F5]/95 border border-[#E7E3DA] px-2.5 py-1 rounded-md">
          Wholesale Pack
        </span>
      )}

      {/* Wishlist Toggle */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.85 }}
        onClick={(e) => {
          e.stopPropagation();
          toggleWishlist(String(product.id));
          showToast(
            isWishlisted ? "Removed from wishlist" : "Saved wholesale box",
            isWishlisted ? "info" : "success"
          );
        }}
        aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
        className={`absolute top-3 right-3.5 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-colors border cursor-pointer shadow-2xs ${
          isWishlisted
            ? "bg-red-50 border-red-200 text-red-600"
            : "bg-[#FAF9F5]/95 hover:bg-white text-[#1C1917] border-[#E7E3DA]"
        }`}
      >
        <Heart
          className="w-4 h-4"
          fill={isWishlisted ? "#DC2626" : "none"}
          stroke={isWishlisted ? "#DC2626" : "currentColor"}
        />
      </motion.button>

      <img
        ref={imageRefCallback}
        src={optimizedImg}
        alt={`${cleanName} - View ${activeIdx + 1}`}
        referrerPolicy="no-referrer"
        onError={(e) => {
          const target = e.currentTarget;
          if (!target.dataset.fallback) {
            target.dataset.fallback = "true";
            target.src = createSvgPlaceholder(cleanName, 520, 390);
          }
        }}
        className="w-full h-full object-contain group-hover:scale-[1.045] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        loading={index < 12 ? "eager" : "lazy"}
        decoding="async"
      />

      {/* Multi-Image Navigation Dots and Badges */}
      {allImages.length > 1 && (
        <>
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-2.5 right-3 z-10 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-xs text-[#FAF9F5] text-[9.5px] font-mono tracking-wider font-semibold pointer-events-none shadow-xs"
          >
            {activeIdx + 1}/{allImages.length} Photos
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-xs"
          >
            {allImages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx(i);
                }}
                aria-label={`View photo ${i + 1} of ${allImages.length}`}
                className="p-1 cursor-pointer flex items-center justify-center"
              >
                <span
                  className={`block transition-all duration-200 rounded-full ${
                    i === activeIdx
                      ? "w-4 h-1.5 bg-[#E5C99B]"
                      : "w-1.5 h-1.5 bg-white/75 hover:bg-white"
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveIdx((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
            }}
            aria-label="Previous photo"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#1C1917] shadow-sm border border-[#E7E3DA] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer active:scale-90"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveIdx((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
            }}
            aria-label="Next photo"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#1C1917] shadow-sm border border-[#E7E3DA] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer active:scale-90"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
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
    wishlist,
    toggleWishlist,
  } = useCart();
  const { showToast } = useToast();
  const { dbProducts } = useStorefrontProducts();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<LotCategoryFilter>("All Boxes");
  const [justAddedMap, setJustAddedMap] = useState<Record<string, boolean>>({});
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [wholesaleBannerIdx, setWholesaleBannerIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setWholesaleBannerIdx((prev) => (prev + 1) % 4);
    }, 4200);
    return () => clearInterval(timer);
  }, []);

  const imageRefs = useRef<Record<string, HTMLImageElement | null>>({});

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

    const existingInCart = cartItems.find(
      (item) =>
        String(item.id) === cartItemId ||
        String(item.baseId ?? item.id) === String(product.id)
    );
    const qtyToAdd = existingInCart && existingInCart.quantity >= (product.wholesaleMinQty || 1)
      ? 1
      : (product.wholesaleMinQty || 1);

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
      qtyToAdd
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
      "Hello JIYOO Wholesale,",
      "",
      `I would like to order a wholesale pack of:`,
      `Product: ${cleanName}`,
      specs ? `Specifications: ${specs}` : "",
      `Wholesale Rate: ${priceText} per ${packText}`,
      "",
      "Please confirm availability and all over India delivery details.",
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://wa.me/${b2bWhatsAppNumber}?text=${encodeURIComponent(message)}`;
    triggerSafeExternalLink(url);
  };

  return (
    <section className="min-h-screen bg-[#FAF9F5] text-[#1C1917] pb-16 pt-4 sm:pt-6 px-4 sm:px-6 lg:px-8">
      {/* Warm-Luxury Editorial Hero — Bengaluru Wholesale & Bulk Supply */}
      <div className="max-w-7xl mx-auto mb-9">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FBF8F1] via-[#F5EFE2] to-[#ECE2CE] text-[#1C1917] p-6 sm:p-10 lg:p-12 border border-[#D8C7A8] shadow-[0_24px_60px_-20px_rgba(28,25,23,0.12)]"
        >
          {/* Ambient Warm Champagne Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-28 -right-28 w-[26rem] h-[26rem] bg-[radial-gradient(circle,rgba(197,168,128,0.22)_0%,transparent_70%)]"
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 inline-flex items-center">
                  <span className="font-sans text-[13px] sm:text-[15px] lg:text-[16px] font-extrabold tracking-[0.22em] sm:tracking-[0.26em] uppercase text-[#1C1917] leading-none select-none">
                    JIYOO WHOLESALE
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onBackToRetail}
                  className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-[#1C1917] border border-[#D8C7A8] text-[11px] font-semibold uppercase tracking-[0.14em] transition-all cursor-pointer active:scale-98"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#8A5A36] transition-transform group-hover:-translate-x-0.5" />
                  <span>Back to Retail</span>
                </button>
              </div>

              <h1 className="font-serif-luxury text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight text-[#1C1917] leading-[1.12]">
                Fresh Fruit Boxes at Wholesale Prices
              </h1>

              <div className="py-0.5 min-h-[1.75rem] overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={wholesaleBannerIdx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                    className="block font-serif-luxury italic text-base sm:text-xl text-[#8A5A36]"
                  >
                    {
                      WHOLESALE_TYPEWRITER_PHRASES[
                        wholesaleBannerIdx % WHOLESALE_TYPEWRITER_PHRASES.length
                      ]
                    }
                  </motion.span>
                </AnimatePresence>
              </div>

              <p className="text-sm sm:text-[15px] text-[#57534E] font-normal leading-relaxed">
                Buy full boxes and crates of fresh fruits at direct wholesale prices. Great for homes, family functions, fruit shops, and bulk buyers with delivery all over India.
              </p>

              {/* Direct Action Row */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href="#wholesale-catalog-grid"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#1C1917] hover:bg-black text-[#FAF2E1] border border-[#C5A880]/60 text-xs font-semibold uppercase tracking-[0.16em] shadow-sm transition-all"
                >
                  <span>Shop {wholesaleProducts.length} Boxes</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E5C99B]" />
                </a>

                <VelvetWhatsAppButton
                  onClick={() => {
                    const url = `https://wa.me/${b2bWhatsAppNumber}?text=${encodeURIComponent(
                      "Hello JIYOO Wholesale, I would like to order wholesale fruit boxes."
                    )}`;
                    triggerSafeExternalLink(url);
                  }}
                  label="Order on WhatsApp"
                  size="card"
                />

                {onOpenCart && cartCount > 0 && (
                  <button
                    type="button"
                    onClick={onOpenCart}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-[#FAF6EE] border border-[#C5A880] text-[#1C1917] text-xs font-semibold uppercase tracking-[0.12em] shadow-xs transition-all cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-[#8A5A36]" />
                    <span>Cart ({cartCount})</span>
                    <span className="font-mono font-bold text-[#8A5A36] tabular-nums">
                      · ₹{cartTotal.toLocaleString("en-IN")}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Interleaved General & JIYOO Diwali Wholesale Studio Banner Showcase */}
            <div className="lg:col-span-6">
              {(() => {
                const wholesaleSlides = [
                  {
                    image: "/banners/wholesale_india_banner.jpg",
                    alt: "Wholesale Fruit Boxes - All Over India Delivery",
                    eyebrow: "A L L   O V E R   I N D I A",
                    title: "Wholesale",
                    subTitle: "F R U I T   B O X E S",
                    isDiwali: false,
                  },
                  {
                    image: "/banners/jiyoo_diwali_wholesale.jpg",
                    alt: "JIYOO Diwali Wholesale Box Sale - All Over India Delivery",
                    eyebrow: "A L L   I N D I A   D E L I V E R Y",
                    title: "Diwali",
                    subTitle: "W H O L E S A L E   B O X E S",
                    isDiwali: true,
                  },
                  {
                    image: "/banners/03_Imported_Fruits_Original.webp",
                    alt: "Imported Fresh Fruit Crates at Wholesale Prices",
                    eyebrow: "D I R E C T   I M P O R T   R A T E S",
                    title: "Orchard",
                    subTitle: "F U L L   F R U I T   C R A T E S",
                    isDiwali: false,
                  },
                  {
                    image: "/banners/jiyoo_diwali_hampers.jpg",
                    alt: "JIYOO Exclusive Diwali Bulk Fruit Gift Boxes",
                    eyebrow: "F E S T I V E   B U L K   G I F T I N G",
                    title: "Diwali",
                    subTitle: "F R U I T   G I F T   B O X E S",
                    isDiwali: true,
                  },
                ];
                const activeSlide =
                  wholesaleSlides[wholesaleBannerIdx % wholesaleSlides.length];

                return (
                  <div className="group relative w-full aspect-[16/9] overflow-hidden rounded-2xl border border-[#C5A880]/80 shadow-[0_16px_40px_-12px_rgba(28,25,23,0.24)] bg-[#EFE9DE]">
                    <AnimatePresence initial={false}>
                      <motion.div
                        key={wholesaleBannerIdx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0 w-full h-full"
                      >
                        <img
                          src={activeSlide.image}
                          alt={activeSlide.alt}
                          className="w-full h-full object-cover object-center select-none pointer-events-none"
                          loading="eager"
                          fetchPriority="high"
                          decoding="async"
                        />
                        {/* Studio Sunlit Wall Poster Typography */}
                        <div className="pointer-events-none absolute inset-y-0 left-0 w-[45%] sm:w-[44%] z-10 flex flex-col items-center justify-center text-center px-3 sm:px-5 pb-4 sm:pb-8">
                          {/* Clean Modern Luxury Botanical Leaf & Crown Crest (Zero Diya/Pooja Motif) */}
                          <svg
                            viewBox="0 0 72 28"
                            fill="none"
                            aria-hidden="true"
                            className="w-8 h-3.5 sm:w-12 sm:h-5 mb-1 sm:mb-1.5 shrink-0"
                          >
                            <path
                              d="M36 3L40.5 11.5L36 21L31.5 11.5L36 3Z"
                              stroke="#9A4B1A"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M32 20C25 17 20 12.5 18 7C24 8.5 28.5 12.5 31 17.5"
                              stroke="#9A4B1A"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M40 20C47 17 52 12.5 54 7C48 8.5 43.5 12.5 41 17.5"
                              stroke="#9A4B1A"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M22 24H50"
                              stroke="#9A4B1A"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                              opacity="0.65"
                            />
                          </svg>
                          <span className="font-sans text-[7px] sm:text-[9.5px] font-semibold uppercase tracking-[0.16em] sm:tracking-[0.22em] text-[#142319] leading-none mb-0.5 sm:mb-1">
                            {activeSlide.eyebrow}
                          </span>
                          <h2
                            className={`font-serif-luxury font-bold tracking-tight text-[#0D2115] leading-[0.95] ${
                              activeSlide.isDiwali
                                ? "text-2xl sm:text-5xl lg:text-[54px]"
                                : "text-xl sm:text-4xl lg:text-[44px]"
                            }`}
                          >
                            {activeSlide.title}
                          </h2>
                          <span className="font-serif-luxury text-[8px] sm:text-xs font-semibold uppercase tracking-[0.14em] sm:tracking-[0.18em] text-[#9A4B1A] mt-0.5 sm:mt-1.5 leading-tight">
                            {activeSlide.subTitle}
                          </span>
                          <div
                            aria-hidden="true"
                            className="flex items-center justify-center gap-1.5 sm:gap-2 w-24 sm:w-36 mt-1.5 sm:mt-2"
                          >
                            <span className="h-[1px] flex-1 bg-[#9A4B1A]/45" />
                            <span className="w-1.5 h-1.5 rotate-45 bg-[#9A4B1A]/80 shrink-0" />
                            <span className="h-[1px] flex-1 bg-[#9A4B1A]/45" />
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Slide Selector Dots */}
                    <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-xs">
                      {wholesaleSlides.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setWholesaleBannerIdx(idx)}
                          aria-label={`View wholesale banner ${idx + 1}`}
                          className="p-0.5 cursor-pointer"
                        >
                          <span
                            className={`block rounded-full transition-all duration-200 ${
                              wholesaleBannerIdx === idx
                                ? "w-4 h-1.5 bg-[#E5C99B]"
                                : "w-1.5 h-1.5 bg-white/75"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Simple 4-Point Summary Bar */}
          <div className="relative z-10 mt-8 pt-6 border-t border-[#D8C7A8]/80 grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#D8C7A8] flex items-center justify-center shrink-0 mt-0.5">
                <RealisticDeliveryScooter className="w-7 h-6" />
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase tracking-[0.16em] text-[#8A5A36] font-semibold">
                  Delivery
                </span>
                <span className="font-serif-luxury text-base font-semibold text-[#1C1917]">
                  All Over India Delivery
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#D8C7A8] flex items-center justify-center shrink-0 mt-0.5">
                <PremiumShieldMark className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase tracking-[0.16em] text-[#8A5A36] font-semibold">
                  Quality
                </span>
                <span className="font-serif-luxury text-base font-semibold text-[#1C1917]">
                  100% Fresh Fruit Boxes
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#D8C7A8] flex items-center justify-center shrink-0 mt-0.5">
                <InstaBlueTickIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase tracking-[0.16em] text-[#8A5A36] font-semibold">
                  Minimum Order
                </span>
                <span className="font-serif-luxury text-base font-semibold text-[#1C1917]">
                  Start with Just 1 Box
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1C1917] text-[#E5C99B] flex items-center justify-center shrink-0 mt-0.5 font-mono text-xs font-bold">
                ₹
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase tracking-[0.16em] text-[#8A5A36] font-semibold">
                  Wholesale Price
                </span>
                <span className="font-serif-luxury text-base font-semibold text-[#1C1917]">
                  Save ₹300 – ₹500 / Box
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Catalog Controls: Search & Category Filter Bar */}
      <div id="wholesale-catalog-grid" className="max-w-7xl mx-auto mb-8 scroll-mt-24">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fruit boxes (orange, apple, pear, grapes)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white border border-[#E7E3DA] text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#1C1917] transition-colors"
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

          {/* Interactive Segmented Control Bar */}
          <div
            role="tablist"
            aria-label="Wholesale categories"
            className="inline-flex items-center gap-1 p-1 bg-[#F2EFE9] border border-[#E7E3DA] rounded-xl overflow-x-auto scrollbar-none"
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
                  className={`relative px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-200 cursor-pointer z-10 ${
                    isActive
                      ? "text-[#FAF9F5]"
                      : "text-[#57534E] hover:text-[#1C1917]"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="wholesaleLotFilterPill"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="pointer-events-none absolute inset-0 rounded-lg bg-[#1C1917] shadow-xs -z-10"
                    />
                  )}
                  <span className="relative z-10">{filter}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Wholesale Product Boxes Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#E7E3DA] pb-3.5">
          <div className="flex items-baseline gap-3">
            <h2 className="font-serif-luxury text-2xl sm:text-3xl font-semibold text-[#1C1917]">
              Wholesale Fruit Boxes
            </h2>
            <span className="text-xs font-mono text-[#8A5A36] font-semibold tabular-nums">
              ({filteredProducts.length} {filteredProducts.length === 1 ? "Box" : "Boxes"})
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-[0.14em] text-[#78716C] font-medium">
            Fresh Full Boxes at Wholesale Prices
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E7E3DA] p-12 text-center space-y-3">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#8A5A36]">
              No Boxes Found
            </p>
            <h3 className="font-serif-luxury text-2xl font-semibold text-[#1C1917]">
              No fruit boxes match your search
            </h3>
            <p className="text-sm text-[#78716C] max-w-md mx-auto">
              Clear your search to see all 7 wholesale fruit boxes.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedFilter("All Boxes");
                }}
                className="px-5 py-2.5 rounded-xl bg-[#1C1917] text-[#FAF9F5] text-xs font-semibold uppercase tracking-[0.14em] cursor-pointer"
              >
                Show All 7 Boxes
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

              const mrpAmount =
                product.mrp && Number(product.mrp) > wholesalePrice
                  ? Number(product.mrp)
                  : 0;
              const savingsAmount = mrpAmount > wholesalePrice ? mrpAmount - wholesalePrice : 0;

              const wholesaleUnit = cleanEditorialText(
                product.wholesaleUnit || product.unit || "Master Carton"
              );
              const cleanName = cleanEditorialText(product.name);
              const cleanBrand = cleanEditorialText(product.brand);
              const cleanOrigin = cleanEditorialText(product.origin);
              const cleanCount = cleanEditorialText(product.count) || "Standard Pack";
              const cleanNetWeight = cleanEditorialText(product.netWeight) || wholesaleUnit;
              const unitRateLabel = computeIndicativeUnitRate(product, wholesalePrice);

              const cartItemId = `${product.id}-${wholesaleUnit}--`;
              const matchingCartItem = cartItems.find(
                (i) => String(i.id) === cartItemId || String(i.id) === String(product.id)
              );
              const qtyInCart = matchingCartItem?.quantity || 0;
              const isJustAdded = !!justAddedMap[String(product.id)];
              const isWishlisted = wishlist.includes(String(product.id));

              const metadataParts = [
                cleanOrigin || "Imported Origin",
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
                  className="group relative bg-white rounded-2xl border border-[#E7E3DA] hover:border-[#C5A880] shadow-xs hover:shadow-[0_20px_40px_-14px_rgba(28,25,23,0.12)] transition-shadow duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
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
                    {/* Full-Bleed Uncropped Image Header with Multi-Image Support & Savings Pill */}
                    <WholesaleLotCardImageArea
                      product={product}
                      savingsAmount={savingsAmount}
                      isWishlisted={isWishlisted}
                      toggleWishlist={toggleWishlist}
                      showToast={showToast}
                      index={index}
                      cleanName={cleanName}
                      imageRefCallback={(el) => {
                        imageRefs.current[String(product.id)] = el;
                      }}
                    />

                    {/* Editorial Body & Pack Specifications */}
                    <div className="p-5 pb-3.5">
                      {/* Provenance & Verified Stock Row */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] uppercase tracking-[0.15em] text-[#8A5A36] font-semibold">
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

                        <div className="inline-flex items-center gap-1 shrink-0">
                          <InstaBlueTickIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#1C1917]">
                            In Stock
                          </span>
                        </div>
                      </div>

                      <h3 className="font-serif-luxury text-xl sm:text-[22px] font-semibold text-[#1C1917] leading-snug mb-1.5 group-hover:text-black transition-colors">
                        {cleanName}
                      </h3>

                      {product.description && (
                        <p className="text-xs text-[#57534E] line-clamp-2 leading-relaxed font-normal mb-3.5">
                          {cleanEditorialText(product.description)}
                        </p>
                      )}

                      {/* 3-Column Wholesale Pack Specification Table */}
                      <dl className="grid grid-cols-3 gap-2 py-2.5 border-y border-[#E7E3DA] text-left">
                        <div>
                          <dt className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#78716C] mb-0.5">
                            Pack Count
                          </dt>
                          <dd className="text-xs font-semibold text-[#1C1917] tabular-nums truncate">
                            {cleanCount}
                          </dd>
                        </div>
                        <div className="border-l border-[#E7E3DA]/70 pl-2.5">
                          <dt className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#78716C] mb-0.5">
                            Box Weight
                          </dt>
                          <dd className="text-xs font-semibold text-[#1C1917] tabular-nums truncate">
                            {cleanNetWeight}
                          </dd>
                        </div>
                        <div className="border-l border-[#E7E3DA]/70 pl-2.5">
                          <dt className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#8A5A36] font-semibold mb-0.5">
                            Effective Rate
                          </dt>
                          <dd className="text-xs font-mono font-bold text-[#1C1917] tabular-nums truncate">
                            {unitRateLabel}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Un-Squished Pricing & 2-Row Action Footer */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="px-5 pb-5 pt-1 space-y-3"
                  >
                    {/* Row 1: Price + Un-squished Add to Cart with Full [ - ] & [ + ] Stepper */}
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <PremiumShieldMark className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[9.5px] font-mono uppercase tracking-[0.14em] text-[#78716C] truncate">
                            {wholesaleUnit}
                          </span>
                        </div>
                        <PriceDisplay
                          amount={wholesalePrice}
                          originalAmount={mrpAmount > 0 ? mrpAmount : undefined}
                          size="xl"
                          weight="extrabold"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
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
                              aria-label="Decrease box quantity"
                              className="w-[34px] h-[34px] rounded-full flex items-center justify-center bg-[#1C1917] hover:bg-[#292524] text-[#FAF2E1] border border-[#C5A880]/70 shadow-sm cursor-pointer shrink-0"
                            >
                              <Minus className="w-3.5 h-3.5" strokeWidth={2.6} />
                            </motion.button>
                          )}
                        </AnimatePresence>

                        <div className="relative inline-flex items-center justify-center">
                          <VelvetyBalloonButton
                            onClick={(e) => handleAddToCart(e, product)}
                            justAdded={isJustAdded}
                            label="Add to Cart"
                            size="card"
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

                        <AnimatePresence>
                          {qtyInCart > 0 && (
                            <motion.button
                              type="button"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              whileTap={{ scale: 0.85 }}
                              onClick={(e) => handleAddToCart(e, product)}
                              aria-label="Increase box quantity"
                              className="w-[34px] h-[34px] rounded-full flex items-center justify-center bg-[#1C1917] hover:bg-[#292524] text-[#FAF2E1] border border-[#C5A880]/70 shadow-sm cursor-pointer shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" strokeWidth={2.6} />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Row 2: Dedicated Full-Width WhatsApp Bulk Order Strip */}
                    <div className="pt-2.5 border-t border-[#E7E3DA]/80 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#57534E] font-medium">
                        Quick WhatsApp Order
                      </span>
                      <div className="shrink-0">
                        <VelvetWhatsAppButton
                          onClick={(e) => handleWhatsAppOrder(e, product)}
                          label="Order via WhatsApp"
                          size="card"
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
