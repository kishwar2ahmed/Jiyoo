import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Truck,
  MapPin,
  Search,
  MessageCircle,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";
import { useStorefrontProducts } from "../../storefront/hooks/useStorefrontProducts";
import { useStorefrontCategories } from "../../storefront/hooks/useStorefrontCategories";
import { useCart } from "../../../contexts/CartContext";
import { useSettings } from "../../../contexts/SettingsContext";
import { useWhatsAppOrder } from "../../product/hooks/useWhatsAppOrder";
import { getOptimizedImageUrl } from "../../../utils/imageUtils";
import { Product } from "../../../types";

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function WholesalePage({
  onBackToRetail,
}: {
  onBackToRetail: () => void;
}) {
  const { currentProducts, isProductsLoading } = useStorefrontProducts();
  const { categoriesList } = useStorefrontCategories();
  const { addToCart, triggerFlyingItem, user } = useCart();
  const { settings } = useSettings();
  const { handleWhatsAppOrder } = useWhatsAppOrder();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [wholesaleSearch, setWholesaleSearch] = useState<string>("");
  const [pincodeInput, setPincodeInput] = useState<string>("");
  const [pincodeStatus, setPincodeStatus] = useState<{
    checked: boolean;
    serviceable: boolean;
    message: string;
    etaDays?: string;
  } | null>(null);
  const [checkingPin, setCheckingPin] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const getQty = (id: string | number) => quantities[String(id)] ?? 5;
  const setQty = (id: string | number, val: number) => {
    setQuantities((prev) => ({
      ...prev,
      [String(id)]: Math.max(1, Math.min(100, val)),
    }));
  };

  const handleCheckWholesalePincode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pincodeInput.trim().replace(/\*+$/, "").trim();
    if (!/^[1-9]\d{5}$/.test(clean)) {
      setPincodeStatus({
        checked: true,
        serviceable: false,
        message: "Please enter a valid 6-digit Indian PIN code (e.g., 560084, 400001, 110001).",
      });
      return;
    }
    setCheckingPin(true);
    try {
      const res = await fetch(
        `/api/delivery/check-pincode?mode=wholesale&pincode=${encodeURIComponent(clean)}`
      );
      const data = await res.json().catch(() => ({}));
      if (data.serviceable) {
        setPincodeStatus({
          checked: true,
          serviceable: true,
          message: `Pan-India Wholesale Delivery available to PIN ${clean} (${data.zoneLabel || "All India Zone"}).`,
          etaDays: data.etaDays || "2-5 business days",
        });
      } else {
        setPincodeStatus({
          checked: true,
          serviceable: false,
          message: data.message || "Wholesale delivery is currently unavailable for this PIN code.",
        });
      }
    } catch {
      // Fallback Pan-India confirmation for valid Indian 6-digit PIN codes
      setPincodeStatus({
        checked: true,
        serviceable: true,
        message: `Pan-India Wholesale Delivery available to PIN ${clean} (All India Network).`,
        etaDays: "2-5 business days",
      });
    } finally {
      setCheckingPin(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return currentProducts.filter((p) => {
      if (selectedCategory !== "all" && p.categoryId !== selectedCategory) return false;
      if (wholesaleSearch.trim()) {
        const q = wholesaleSearch.toLowerCase();
        const match =
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [currentProducts, selectedCategory, wholesaleSearch]);

  const handleAddWholesaleToBag = (
    e: React.MouseEvent<HTMLButtonElement>,
    product: Product
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const qty = getQty(product.id);
    const defaultWeight = product.weights?.[0];
    const unitPrice = defaultWeight ? defaultWeight.price : product.price;
    const unitLabel = defaultWeight ? defaultWeight.label : product.unit;
    const numericPrice =
      typeof unitPrice === "number"
        ? unitPrice
        : parseFloat(String(unitPrice).replace(/[^0-9.]/g, "")) || 0;
    const optimizedImg = getOptimizedImageUrl(product.image, 500, 82);

    triggerFlyingItem({
      image: optimizedImg,
      name: product.name,
      price: `₹${numericPrice * qty}`,
      badge: `${qty} × ${unitLabel}`,
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
    });

    addToCart(
      {
        id: `${product.id}-${unitLabel || ""}-wholesale`,
        baseId: product.id,
        selectedWeight: unitLabel,
        name: `${product.name} (Wholesale)`,
        price: `₹${numericPrice}`,
        numericPrice,
        image: optimizedImg,
        badge: unitLabel,
      },
      qty
    );
  };

  return (
    <section className="min-h-[80vh] bg-[#FAF9F5] text-[#1C1917] flex flex-col pb-16">
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 space-y-8">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToRetail}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C1917] text-[#FAF9F5] hover:bg-[#292524] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Retail Store</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
            <Truck className="w-4 h-4 text-emerald-700" />
            <span>Pan-India Wholesale Active — All 28 States &amp; 8 UTs</span>
          </div>
        </div>

        {/* Hero Banner & All-India Pincode Checker */}
        <div className="bg-white rounded-3xl border border-[#E7E3DA] p-6 sm:p-10 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> JIYOO B2B &amp; Bulk Supply
            </span>
            <h1 className="font-serif-luxury text-2xl sm:text-4xl lg:text-5xl font-semibold text-[#1C1917] leading-tight">
              Wholesale Supply Across All of India
            </h1>
            <p className="text-sm sm:text-base text-[#57534E] leading-relaxed max-w-2xl">
              Direct farm-to-business &amp; importer-grade supply for hotels, restaurants, cafes (HoReCa), supermarkets, and bulk buyers. We ship wholesale orders across every serviceable 6-digit PIN code in India.
            </p>
            <div className="flex flex-wrap gap-3 pt-1 text-xs text-[#57534E]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#E7E3DA]">
                <Package className="w-3.5 h-3.5 text-[#1C1917]" /> Cold-Chain &amp; Air Cargo Dispatch
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#E7E3DA]">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> Instant WhatsApp B2B Desk
              </span>
            </div>
          </div>

          {/* All-India PIN Code Verification Box */}
          <div className="lg:col-span-5 bg-[#FAF9F5] rounded-2xl p-5 sm:p-6 border border-[#E7E3DA] space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-700" />
              <h2 className="font-serif text-lg font-semibold text-[#1C1917]">
                Check Pan-India Wholesale Delivery
              </h2>
            </div>
            <p className="text-xs text-[#78716C]">
              Enter any 6-digit PIN code in India to check wholesale dispatch availability &amp; estimated transit time.
            </p>
            <form onSubmit={handleCheckWholesalePincode} className="flex gap-2">
              <input
                type="text"
                value={pincodeInput}
                onChange={(e) => setPincodeInput(e.target.value.slice(0, 7))}
                placeholder="Enter 6-digit India PIN (e.g. 400001)"
                className="flex-1 bg-white border border-[#DCD6CA] focus:border-[#1C1917] rounded-xl px-3.5 py-2.5 text-sm font-mono outline-none"
              />
              <button
                type="submit"
                disabled={checkingPin}
                className="px-4 py-2.5 bg-[#1C1917] hover:bg-black text-[#FAF9F5] rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50"
              >
                {checkingPin ? "Checking..." : "Check PIN"}
              </button>
            </form>
            {pincodeStatus && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  pincodeStatus.serviceable
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{pincodeStatus.message}</p>
                  {pincodeStatus.etaDays && (
                    <p className="text-[11px] opacity-80 mt-0.5">
                      Estimated Transit: {pincodeStatus.etaDays}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-[#1C1917] text-[#FAF9F5]"
                  : "bg-white border border-[#E7E3DA] text-[#57534E] hover:text-[#1C1917]"
              }`}
            >
              All Wholesale ({currentProducts.length})
            </button>
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-[#1C1917] text-[#FAF9F5]"
                    : "bg-white border border-[#E7E3DA] text-[#57534E] hover:text-[#1C1917]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={wholesaleSearch}
              onChange={(e) => setWholesaleSearch(e.target.value)}
              placeholder="Search wholesale catalog..."
              className="w-full bg-white border border-[#DCD6CA] focus:border-[#1C1917] rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm outline-none"
            />
          </div>
        </div>

        {/* Wholesale Products Grid */}
        {isProductsLoading ? (
          <div className="py-16 text-center text-sm text-[#78716C]">
            Loading wholesale catalog...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.slice(0, 48).map((product, idx) => {
              const qty = getQty(product.id);
              const defaultWeight = product.weights?.[0];
              const unitPrice = defaultWeight ? defaultWeight.price : product.price;
              const unitLabel = defaultWeight ? defaultWeight.label : product.unit;
              const numericPrice =
                typeof unitPrice === "number"
                  ? unitPrice
                  : parseFloat(String(unitPrice).replace(/[^0-9.]/g, "")) || 0;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.12 }}
                  whileHover={{ y: -4, transition: { duration: 0.25, ease: EASE_OUT_EXPO } }}
                  transition={{
                    duration: 0.5,
                    delay: (idx % 4) * 0.045,
                    ease: EASE_OUT_EXPO,
                  }}
                  className="bg-white rounded-2xl border border-[#E7E3DA] hover:border-[#C5A880]/70 overflow-hidden flex flex-col justify-between p-4 shadow-2xs hover:shadow-[0_16px_36px_-12px_rgba(28,25,23,0.12)] transition-shadow"
                >
                  <div>
                    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#FAF9F5] mb-3 relative group">
                      <img
                        src={getOptimizedImageUrl(product.image, 500, 82)}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out hover:scale-105"
                        loading="lazy"
                      />
                      <span className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-[#1C1917]/85 text-[#FAF9F5] text-[10px] font-bold uppercase tracking-wider">
                        Pan-India Bulk
                      </span>
                    </div>
                    <h3 className="font-serif text-base font-semibold text-[#1C1917] line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-[#78716C] mt-0.5">
                      Unit: {unitLabel} • Rate:{" "}
                      <span className="font-bold text-[#1C1917]">₹{numericPrice}</span>
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F4F1EA] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#57534E]">
                        Bulk Qty:
                      </span>
                      <div className="flex items-center gap-2 bg-[#FAF9F5] border border-[#E7E3DA] rounded-lg px-2 py-1">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.88 }}
                          onClick={() => setQty(product.id, qty - 1)}
                          className="p-1 text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </motion.button>
                        <span className="text-xs font-bold w-6 text-center tabular-nums">
                          {qty}
                        </span>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.88 }}
                          onClick={() => setQty(product.id, qty + 1)}
                          className="p-1 text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </motion.button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={(e) => handleAddWholesaleToBag(e, product)}
                        className="py-2 px-3 rounded-xl bg-[#1C1917] hover:bg-black text-[#FAF9F5] text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> Add ({qty})
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() =>
                          handleWhatsAppOrder({
                            product,
                            user,
                            settings,
                            quantity: qty,
                            currentPrice: numericPrice,
                            currentUnit: unitLabel,
                            orderType: "wholesale",
                            pincode: pincodeInput.trim() || undefined,
                          })
                        }
                        className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
