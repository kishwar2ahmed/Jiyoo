import React, { useState, useMemo, useRef } from "react";
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
  Check,
  LayoutGrid,
  List,
  ShieldCheck,
  Truck,
  FileText,
  Package,
} from "lucide-react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useCart } from "../../../contexts/CartContext";
import { useToast } from "../../core/contexts/ToastContext";
import { sanitizeWhatsAppNumber } from "../../../utils/whatsapp";
import { useStorefrontProducts } from "../../storefront/hooks/useStorefrontProducts";
import { ProductDetailModal } from "../../product/components/ProductDetailModal";
import { getOptimizedImageUrl } from "../../../utils/imageUtils";
import { Product } from "../../../types";
import { PriceDisplay } from "../../core/components/PriceDisplay";
import { WhatsAppIcon } from "../../core/components/SocialIcons";
import { SEO } from "../../../components/SEO";
import {
  generateOrganizationSchema,
  generateItemListSchema,
  generateBreadcrumbSchema,
} from "../../../utils/schemaGenerator";

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

type LotCategoryFilter =
  | "All Lots"
  | "Citrus"
  | "Apples & Pears"
  | "Exotics & Berries"
  | "Vineyard Grapes";

const LOT_FILTERS: LotCategoryFilter[] = [
  "All Lots",
  "Citrus",
  "Apples & Pears",
  "Exotics & Berries",
  "Vineyard Grapes",
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
  if (filter === "All Lots") return true;
  const haystack = `${product.name} ${product.description || ""} ${(product.tags || []).join(" ")}`.toLowerCase();
  switch (filter) {
    case "Citrus":
      return (
        haystack.includes("orange") ||
        haystack.includes("citrus") ||
        haystack.includes("mandarin") ||
        haystack.includes("limpopo")
      );
    case "Apples & Pears":
      return (
        haystack.includes("apple") ||
        haystack.includes("pear") ||
        haystack.includes("crisp pink")
      );
    case "Exotics & Berries":
      return (
        haystack.includes("dragon") ||
        haystack.includes("blueberry") ||
        haystack.includes("berry") ||
        haystack.includes("exotic")
      );
    case "Vineyard Grapes":
      return (
        haystack.includes("grape") ||
        haystack.includes("seedless") ||
        haystack.includes("sonaka")
      );
    default:
      return true;
  }
}

function computeIndicativeUnitRate(product: Product, wholesalePrice: number): string {
  const netWeightStr = cleanEditorialText(product.netWeight);
  const kgMatch = netWeightStr.match(/(\d+(?:\.\d+)?)\s*kg/i);
  if (kgMatch && Number(kgMatch[1]) > 0) {
    const kg = Number(kgMatch[1]);
    return `~₹${Math.round(wholesalePrice / kg).toLocaleString("en-IN")} / kg`;
  }
  const countNum =
    typeof product.count === "number"
      ? product.count
      : typeof product.count === "string"
      ? parseInt(product.count, 10)
      : null;
  if (countNum && countNum > 0) {
    return `~₹${Math.round(wholesalePrice / countNum).toLocaleString("en-IN")} / pc`;
  }
  return "Direct Lot Rate";
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

function WholesaleLotGallery({
  product,
  isWishlisted,
  toggleWishlist,
  showToast,
  cleanName,
  originLabel,
  imageRefCallback,
}: {
  product: Product;
  isWishlisted: boolean;
  toggleWishlist: (id: string) => void;
  showToast: (msg: string, type: "info" | "success") => void;
  cleanName: string;
  originLabel: string;
  imageRefCallback: (el: HTMLImageElement | null) => void;
}) {
  const allImages = useMemo(() => {
    return Array.from(
      new Set([product.image, ...(product.images || [])].filter(Boolean))
    ) as string[];
  }, [product.image, product.images]);

  const [activeIdx, setActiveIdx] = useState(0);
  const currentImage = allImages[activeIdx] || product.image;
  const optimizedImg = getOptimizedImageUrl(currentImage, 560, 84);

  return (
    <div className="relative bg-white border-b border-stone-100">
      <div className="relative aspect-[4/3] w-full overflow-hidden p-5 sm:p-6 flex items-center justify-center bg-white">
        {/* Clean Origin Pill */}
        <div className="absolute top-3.5 left-3.5 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-900/90 backdrop-blur-xs text-white text-[11px] font-medium tracking-wide">
          <span>{originLabel}</span>
        </div>

        {/* Save Lot Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(String(product.id));
            showToast(
              isWishlisted ? "Removed from saved lots" : "Saved wholesale lot",
              isWishlisted ? "info" : "success"
            );
          }}
          aria-label={isWishlisted ? "Remove from wishlist" : "Save lot"}
          className={`absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all border cursor-pointer ${
            isWishlisted
              ? "bg-red-50 border-red-200 text-red-600"
              : "bg-white/95 hover:bg-stone-100 text-stone-700 border-stone-200/90 shadow-2xs"
          }`}
        >
          <Heart
            className="w-3.5 h-3.5"
            fill={isWishlisted ? "#DC2626" : "none"}
            stroke={isWishlisted ? "#DC2626" : "currentColor"}
          />
        </button>

        <img
          ref={imageRefCallback}
          src={optimizedImg}
          alt={`${cleanName} - Buy Online in India | JIYOO`}
          className="w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
        />

        {/* Prev / Next Arrows for Multi-Photo Lots */}
        {allImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
              }}
              aria-label="Previous lot photo"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 hover:bg-white text-stone-800 shadow-sm border border-stone-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
              }}
              aria-label="Next lot photo"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 hover:bg-white text-stone-800 shadow-sm border border-stone-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Subtle Thumbnail Strip when Lot has multiple inspection photos */}
      {allImages.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="px-5 pb-3 flex items-center justify-center gap-2 bg-white"
        >
          {allImages.map((imgUrl, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx(i);
              }}
              aria-label={`Inspect lot photo ${i + 1}`}
              className={`w-10 h-10 rounded-lg overflow-hidden border transition-all p-0.5 cursor-pointer bg-stone-50 ${
                i === activeIdx
                  ? "border-stone-900 ring-1 ring-stone-900/20 opacity-100"
                  : "border-stone-200 opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={getOptimizedImageUrl(imgUrl, 100, 75)}
                alt={`${cleanName} view ${i + 1}`}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </button>
          ))}
        </div>
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
  } = useCart();
  const { showToast } = useToast();
  const { dbProducts } = useStorefrontProducts();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<LotCategoryFilter>("All Lots");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
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
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
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

  const filterCounts = useMemo(() => {
    const counts: Record<LotCategoryFilter, number> = {
      "All Lots": wholesaleProducts.length,
      Citrus: 0,
      "Apples & Pears": 0,
      "Exotics & Berries": 0,
      "Vineyard Grapes": 0,
    };
    for (const p of wholesaleProducts) {
      for (const f of LOT_FILTERS) {
        if (f !== "All Lots" && matchesLotFilter(p, f)) {
          counts[f]++;
        }
      }
    }
    return counts;
  }, [wholesaleProducts]);

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
      imgEl?.currentSrc ||
      imgEl?.src ||
      getOptimizedImageUrl(product.image, 420, 78);

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

    showToast(`Added ${cleanName} (${unitLabel}) to bag`, "success");
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
    const brandText = product.brand
      ? `Brand: ${cleanEditorialText(product.brand)}`
      : "";
    const originText = product.origin
      ? `Origin: ${cleanEditorialText(product.origin)}`
      : "";
    const countText = product.count
      ? `Pack Count: ${cleanEditorialText(product.count)}`
      : "";
    const weightText = product.netWeight
      ? `Net Weight: ${cleanEditorialText(product.netWeight)}`
      : "";

    const specs = [brandText, originText, countText, weightText]
      .filter(Boolean)
      .join(" | ");

    const message = [
      "Hello JIYOO Wholesale Trade Desk,",
      "",
      `I would like to place a wholesale order / inquiry for:`,
      `Lot: ${cleanName}`,
      specs ? `Specifications: ${specs}` : "",
      `Rate: ${priceText} per ${packText}`,
      "",
      "Please share current lot availability and dispatch timing.",
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://wa.me/${b2bWhatsAppNumber}?text=${encodeURIComponent(
      message
    )}`;
    triggerSafeExternalLink(url);
  };

  return (
    <section className="min-h-screen bg-[#FAF9F6] text-stone-900 pb-28">
      {!selectedProduct && (
        <SEO
          title="Wholesale Imported Fruits & Master Cartons Supply in India | JIYOO B2B"
          description="Direct container imports & orchard-packed wholesale fruit master cartons (South Africa Limpopo Citrus, New Zealand Crisp Pink Apples, Blueberries, Beauty Pears, Seedless Grapes) with GST invoicing and cold-chain dispatch across Bengaluru & India."
          keywords="wholesale imported fruits India, bulk fruit cartons Bangalore, HoReCa fruit supplier Bengaluru, imported apple carton price India, JIYOO wholesale"
          canonicalPath="/?view=wholesale"
          schema={[
            generateOrganizationSchema(),
            generateBreadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Wholesale & Bulk Lots", url: "/?view=wholesale" },
            ]),
            generateItemListSchema(
              filteredProducts,
              "JIYOO B2B Wholesale Master Cartons & Trade Lots",
              "/?view=wholesale"
            ),
          ]}
        />
      )}

      {/* ===================================================================== */}
      {/* 1. CLEAN ARCHITECTURAL HEADER & B2B VALUE PROPOSITION                 */}
      {/* ===================================================================== */}
      <div className="bg-white border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-7 sm:py-8">
          {/* Top Navigation Row */}
          <div className="flex items-center justify-between gap-4 pb-6 border-b border-stone-100">
            <button
              type="button"
              onClick={onBackToRetail}
              className="group inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-stone-600 hover:text-stone-950 transition-colors cursor-pointer"
            >
              <span className="w-8 h-8 rounded-full bg-stone-100 group-hover:bg-stone-200/80 flex items-center justify-center transition-colors">
                <ArrowLeft className="w-4 h-4 text-stone-800 transition-transform group-hover:-translate-x-0.5" />
              </span>
              <span>Back to Retail Store</span>
            </button>

            <div className="flex items-center gap-3">
              <a
                href={`https://wa.me/${b2bWhatsAppNumber}?text=${encodeURIComponent(
                  "Hello JIYOO Trade Desk, I would like to enquire about wholesale bulk lots and commercial procurement."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-xs font-medium text-stone-800 transition-colors"
              >
                <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                <span>Trade Desk: +91 97393 91891</span>
              </a>

              {onOpenCart && (
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-200" />
                  <span>Wholesale Bag</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-white/15 text-white font-mono text-[11px] font-semibold tabular-nums">
                    {cartCount}
                  </span>
                  {cartTotal > 0 && (
                    <span className="hidden md:inline text-amber-200 font-semibold tabular-nums">
                      · ₹{cartTotal.toLocaleString("en-IN")}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Editorial Title & Key Commercial Pillars */}
          <div className="pt-6 sm:pt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-stone-500 mb-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>JIYOO B2B &amp; HoReCa Supply Division</span>
                <span className="text-stone-300">·</span>
                <span>FSSAI Lic. 21226112000732</span>
              </div>

              <h1 className="font-serif text-2xl sm:text-4xl lg:text-[42px] font-semibold text-stone-950 tracking-tight leading-[1.12]">
                Wholesale Master Cartons &amp; Trade Lots
              </h1>

              <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed max-w-2xl">
                Sealed imported fruit cartons and vineyard crates priced at direct ex-dock lot rates for hotels, restaurants, juice bars, supermarkets, and bulk home buyers.
              </p>
            </div>

            {/* Clean 3-Pillar Commercial Assurance Strip */}
            <div className="lg:col-span-5 grid grid-cols-3 gap-2.5 sm:gap-3">
              <div className="p-3 sm:p-3.5 rounded-xl bg-stone-50 border border-stone-200/70">
                <Package className="w-4 h-4 text-stone-700 mb-1.5" />
                <div className="text-xs font-semibold text-stone-900 leading-tight">
                  1 Carton MOQ
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5 leading-tight">
                  Sealed export boxes
                </div>
              </div>

              <div className="p-3 sm:p-3.5 rounded-xl bg-stone-50 border border-stone-200/70">
                <Truck className="w-4 h-4 text-stone-700 mb-1.5" />
                <div className="text-xs font-semibold text-stone-900 leading-tight">
                  2°C–4°C Cold Chain
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5 leading-tight">
                  Same-day dispatch
                </div>
              </div>

              <div className="p-3 sm:p-3.5 rounded-xl bg-stone-50 border border-stone-200/70">
                <FileText className="w-4 h-4 text-stone-700 mb-1.5" />
                <div className="text-xs font-semibold text-stone-900 leading-tight">
                  GST Billing
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5 leading-tight">
                  Verified B2B invoice
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. STICKY FILTER, SEARCH & VIEW-MODE TOOLBAR                          */}
      {/* ===================================================================== */}
      <div className="sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Category Filter Pills with Lot Counts */}
          <div
            role="tablist"
            aria-label="Wholesale lot categories"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 md:pb-0"
          >
            {LOT_FILTERS.map((filter) => {
              const isActive = selectedFilter === filter;
              const count = filterCounts[filter] ?? 0;
              return (
                <button
                  key={filter}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedFilter(filter)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-stone-900 text-white shadow-2xs"
                      : "bg-white text-stone-600 hover:text-stone-950 border border-stone-200/80"
                  }`}
                >
                  <span>{filter}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input & Grid/Table View Switcher */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search variety, origin or pack..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-stone-200/90 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Grid vs Trade Sheet Toggle */}
            <div
              role="group"
              aria-label="Catalog layout mode"
              className="hidden sm:inline-flex items-center p-1 rounded-xl bg-white border border-stone-200/90"
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Gallery Grid View"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-stone-900 text-white"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Trade Ledger Table View"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "table"
                    ? "bg-stone-900 text-white"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. WHOLESALE LOTS CATALOG (GRID OR TRADE SHEET TABLE)                 */}
      {/* ===================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center max-w-lg mx-auto my-8">
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-stone-900 mb-2">
              No matching wholesale lots
            </h2>
            <p className="text-sm text-stone-500 mb-6">
              We couldn&apos;t find any master cartons matching your current filter. Reset filters or message our trade desk for custom sourcing.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedFilter("All Lots");
              }}
              className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-medium cursor-pointer transition-colors"
            >
              Show All Wholesale Lots
            </button>
          </div>
        ) : viewMode === "table" ? (
          /* HIGH-DENSITY B2B TRADE SHEET TABLE VIEW */
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/80 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                    <th className="py-3.5 pl-5 pr-3">Lot &amp; Variety</th>
                    <th className="py-3.5 px-3">Origin &amp; Grade</th>
                    <th className="py-3.5 px-3">Carton Spec</th>
                    <th className="py-3.5 px-3">Indicative Unit</th>
                    <th className="py-3.5 px-3">Carton Rate</th>
                    <th className="py-3.5 pl-3 pr-5 text-right">Order Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {filteredProducts.map((product) => {
                    const wholesalePrice =
                      typeof product.wholesalePrice === "number" &&
                      product.wholesalePrice > 0
                        ? product.wholesalePrice
                        : typeof product.numericPrice === "number" &&
                          product.numericPrice > 0
                        ? product.numericPrice
                        : Number(product.price) || 0;

                    const wholesaleUnit = cleanEditorialText(
                      product.wholesaleUnit || product.unit || "Master Carton"
                    );
                    const cleanName = cleanEditorialText(product.name);
                    const cleanOrigin =
                      cleanEditorialText(product.origin) || "Imported";
                    const cleanCount =
                      cleanEditorialText(product.count) || "Standard";
                    const cleanNetWeight =
                      cleanEditorialText(product.netWeight) || wholesaleUnit;
                    const unitRateLabel = computeIndicativeUnitRate(
                      product,
                      wholesalePrice
                    );
                    const cartItemId = `${product.id}-${wholesaleUnit}--`;
                    const matchingCartItem = cartItems.find(
                      (i) =>
                        String(i.id) === cartItemId ||
                        String(i.id) === String(product.id)
                    );
                    const qtyInCart = matchingCartItem?.quantity || 0;
                    const isJustAdded = !!justAddedMap[String(product.id)];

                    return (
                      <tr
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 pl-5 pr-3">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={getOptimizedImageUrl(product.image, 120, 80)}
                              alt={`${cleanName} - Buy Online in India | JIYOO`}
                              className="w-12 h-12 rounded-xl object-contain bg-white border border-stone-200 p-1 shrink-0"
                              loading="lazy"
                            />
                            <div>
                              <div className="font-serif font-semibold text-stone-900 group-hover:text-black">
                                {cleanName}
                              </div>
                              <div className="text-xs text-stone-500">
                                {wholesaleUnit}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-medium">
                            {cleanOrigin}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-xs text-stone-700 tabular-nums">
                          <div className="font-semibold text-stone-900">
                            {cleanNetWeight}
                          </div>
                          <div className="text-stone-500">
                            Count: {cleanCount}
                          </div>
                        </td>
                        <td className="py-4 px-3 text-xs font-medium text-emerald-800 tabular-nums">
                          {unitRateLabel}
                        </td>
                        <td className="py-4 px-3">
                          <PriceDisplay
                            amount={wholesalePrice}
                            originalAmount={
                              product.mrp && Number(product.mrp) > wholesalePrice
                                ? Number(product.mrp)
                                : undefined
                            }
                            size="md"
                            weight="bold"
                          />
                        </td>
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className="py-4 pl-3 pr-5 text-right"
                        >
                          <div className="inline-flex items-center justify-end gap-2">
                            {qtyInCart > 0 ? (
                              <div className="inline-flex items-center rounded-xl border border-stone-300 bg-white h-9 px-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!matchingCartItem) return;
                                    const minQty = product.wholesaleMinQty || 1;
                                    if (qtyInCart <= minQty) {
                                      removeFromCart(String(matchingCartItem.id));
                                    } else {
                                      updateQuantity(
                                        String(matchingCartItem.id),
                                        qtyInCart - 1
                                      );
                                    }
                                  }}
                                  className="w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-700 cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="px-2.5 text-xs font-semibold tabular-nums text-stone-900">
                                  {qtyInCart}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleAddToCart(e, product)}
                                  className="w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-700 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleAddToCart(e, product)}
                                className="h-9 px-4 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              >
                                {isJustAdded ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Added</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Carton</span>
                                  </>
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => handleWhatsAppOrder(e, product)}
                              title="Inquire or order this lot on WhatsApp"
                              className="h-9 w-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* CLEAN EDITORIAL B2B GALLERY GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product, index) => {
              const wholesalePrice =
                typeof product.wholesalePrice === "number" &&
                product.wholesalePrice > 0
                  ? product.wholesalePrice
                  : typeof product.numericPrice === "number" &&
                    product.numericPrice > 0
                  ? product.numericPrice
                  : Number(product.price) || 0;

              const wholesaleUnit = cleanEditorialText(
                product.wholesaleUnit || product.unit || "Master Carton"
              );
              const cleanName = cleanEditorialText(product.name);
              const cleanOrigin =
                cleanEditorialText(product.origin) || "Direct Import";
              const cleanBrand = cleanEditorialText(product.brand);
              const cleanCount =
                cleanEditorialText(product.count) || "Standard Lot";
              const cleanNetWeight =
                cleanEditorialText(product.netWeight) || wholesaleUnit;
              const unitRateLabel = computeIndicativeUnitRate(
                product,
                wholesalePrice
              );

              const originBadge = cleanBrand
                ? `${cleanOrigin} · ${cleanBrand}`
                : cleanOrigin;

              const cartItemId = `${product.id}-${wholesaleUnit}--`;
              const matchingCartItem = cartItems.find(
                (i) =>
                  String(i.id) === cartItemId ||
                  String(i.id) === String(product.id)
              );
              const qtyInCart = matchingCartItem?.quantity || 0;
              const isJustAdded = !!justAddedMap[String(product.id)];
              const isWishlisted = wishlist.includes(String(product.id));

              return (
                <motion.article
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.32,
                    delay: (index % 3) * 0.04,
                    ease: EASE_OUT_EXPO,
                  }}
                  onClick={() => setSelectedProduct(product)}
                  className="group bg-white rounded-2xl border border-stone-200/90 hover:border-stone-300 shadow-2xs hover:shadow-[0_16px_36px_-12px_rgba(28,25,23,0.1)] transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
                >
                  <div>
                    {/* Product Image Stage with Multi-Photo Inspection */}
                    <WholesaleLotGallery
                      product={product}
                      isWishlisted={isWishlisted}
                      toggleWishlist={toggleWishlist}
                      showToast={showToast}
                      cleanName={cleanName}
                      originLabel={originBadge}
                      imageRefCallback={(el) => {
                        imageRefs.current[String(product.id)] = el;
                      }}
                    />

                    {/* Card Body */}
                    <div className="p-5 pb-4">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h2 className="font-serif text-lg sm:text-xl font-semibold text-stone-900 leading-snug group-hover:text-black">
                          {cleanName}
                        </h2>
                      </div>

                      {product.description && (
                        <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-4">
                          {cleanEditorialText(product.description)}
                        </p>
                      )}

                      {/* Scannable 3-Column Commercial Spec Strip */}
                      <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200/70 text-left">
                        <div>
                          <span className="block text-[10px] text-stone-500 font-medium">
                            Net Weight
                          </span>
                          <span className="text-xs font-semibold text-stone-900 tabular-nums truncate block mt-0.5">
                            {cleanNetWeight}
                          </span>
                        </div>
                        <div className="border-l border-stone-200/80 pl-2.5">
                          <span className="block text-[10px] text-stone-500 font-medium">
                            Pack Count
                          </span>
                          <span className="text-xs font-semibold text-stone-900 tabular-nums truncate block mt-0.5">
                            {cleanCount}
                          </span>
                        </div>
                        <div className="border-l border-stone-200/80 pl-2.5">
                          <span className="block text-[10px] text-stone-500 font-medium">
                            Est. Unit Cost
                          </span>
                          <span className="text-xs font-semibold text-emerald-800 tabular-nums truncate block mt-0.5">
                            {unitRateLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Price + Unified Action Bar */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="px-5 pb-5 pt-3 border-t border-stone-100 space-y-3.5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <span className="text-[11px] text-stone-500 font-medium block mb-0.5">
                          Wholesale Carton Price
                        </span>
                        <PriceDisplay
                          amount={wholesalePrice}
                          originalAmount={
                            product.mrp && Number(product.mrp) > wholesalePrice
                              ? Number(product.mrp)
                              : undefined
                          }
                          size="xl"
                          weight="extrabold"
                        />
                      </div>

                      <div className="text-right">
                        <span className="inline-block text-xs font-medium text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                          {wholesaleUnit}
                        </span>
                      </div>
                    </div>

                    {/* Clean Action Row: Full-Width Primary Button + Compact WhatsApp Trade Button */}
                    <div className="flex items-center gap-2">
                      {qtyInCart > 0 ? (
                        <div className="flex-1 h-11 rounded-xl bg-stone-900 text-white flex items-center justify-between px-2 shadow-xs">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!matchingCartItem) return;
                              const minQty = product.wholesaleMinQty || 1;
                              if (qtyInCart <= minQty) {
                                removeFromCart(String(matchingCartItem.id));
                              } else {
                                updateQuantity(
                                  String(matchingCartItem.id),
                                  qtyInCart - 1
                                );
                              }
                            }}
                            aria-label="Decrease carton quantity"
                            className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center text-white transition-colors cursor-pointer"
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          <span className="text-xs font-semibold tabular-nums">
                            {qtyInCart} {qtyInCart === 1 ? "Carton" : "Cartons"} in Bag
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleAddToCart(e, product)}
                            aria-label="Increase carton quantity"
                            className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center text-white transition-colors cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleAddToCart(e, product)}
                          className="flex-1 h-11 rounded-xl bg-stone-900 hover:bg-black active:scale-[0.99] text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                        >
                          {isJustAdded ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-400" />
                              <span>Carton Added</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-4 h-4" />
                              <span>Add Carton to Bag</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleWhatsAppOrder(e, product)}
                        title="Order or inquire via WhatsApp Trade Desk"
                        aria-label="Order or inquire via WhatsApp Trade Desk"
                        className="h-11 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 text-emerald-900 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        {/* =================================================================== */}
        {/* 4. STANDING HORECA & SUPERMARKET SUPPLY FOOTER BANNER               */}
        {/* =================================================================== */}
        <div className="mt-14 bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-2xs">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="w-4 h-4" />
              <span>Standing Weekly Supply for Hotels, Cafes &amp; Supermarkets</span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-semibold text-stone-900">
              Need custom pallet pricing or scheduled morning dispatch?
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              We partner with hospitality groups, juice chains, and retail stores across Bengaluru and India with dedicated cold-chain vehicles and consolidated GST invoicing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                const url = `https://wa.me/${b2bWhatsAppNumber}?text=${encodeURIComponent(
                  "Hello JIYOO Trade Desk, I would like to request a quote for standing weekly wholesale supply."
                )}`;
                triggerSafeExternalLink(url);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>Request Trade Quote</span>
            </button>

            <button
              type="button"
              onClick={onBackToRetail}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center h-11 px-5 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-900 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              Back to Retail Store
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 5. STICKY FLOATING WHOLESALE CART CHECKOUT BAR                        */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {cartCount > 0 && onOpenCart && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
            className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-xl z-40"
          >
            <div className="bg-stone-900 text-white border border-stone-700 rounded-2xl px-4 sm:px-5 py-3.5 shadow-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5 text-amber-200" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-stone-300">
                      Wholesale Bag
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-semibold tabular-nums">
                      {cartCount} {cartCount === 1 ? "Lot" : "Lots"}
                    </span>
                  </div>
                  <div className="mt-0.5">
                    <PriceDisplay
                      amount={cartTotal}
                      size="lg"
                      weight="extrabold"
                      isDark
                      animated
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenCart}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-950 text-xs sm:text-sm font-semibold transition-colors cursor-pointer shrink-0"
              >
                <span>Review &amp; Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
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
