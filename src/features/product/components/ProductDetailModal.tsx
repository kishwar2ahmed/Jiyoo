import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  ShoppingBag,
  X,
  Minus,
  Plus,
  Check,
  MessageCircle,
} from "lucide-react";
import { Product } from "../../../types";
import { useCart } from "../../../contexts/CartContext";
import { useSettings } from "../../../contexts/SettingsContext";
import { ProductReviews } from "./ProductReviews";
import { useWhatsAppOrder } from "../hooks/useWhatsAppOrder";
import { getOptimizedImageUrl } from "../../../utils/imageUtils";
import { useToast } from "../../core/contexts/ToastContext";
import { useModalBackButton } from "../../core/hooks/useModalBackButton";

function DeliveryScootyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor">
      <rect x="2" y="9" width="8" height="8" rx="1.5" />
      <path d="M10 17h6l2.5-6h3.5l1.5 3h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 11l-2-4h-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="22" r="3.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="7" cy="22" r="1.5" />
      <circle cx="23" cy="22" r="3.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="23" cy="22" r="1.5" />
      <path d="M10.5 22h9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

interface ProductDetailModalProps {
  product: Product | null;
  allProducts?: Product[];
  isOpen: boolean;
  onClose: () => void;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  onProductClick?: (product: Product) => void;
  initialTab?: "details" | "reviews";
}

export function ProductDetailModal({
  product,
  allProducts = [],
  isOpen,
  onClose,
  wishlist,
  toggleWishlist,
  onProductClick,
  initialTab = "details",
}: ProductDetailModalProps) {
  const { addToCart, triggerFlyingItem, user } = useCart();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const { handleWhatsAppOrder: _handleWhatsAppOrder } = useWhatsAppOrder();

  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(product?.image);
  const [selectedWeight, setSelectedWeight] = useState(product?.weights?.[0]);
  const [selectedCut, setSelectedCut] = useState(product?.fishCuts?.[0]);
  const [selectedCleaning, setSelectedCleaning] = useState(
    product?.cleaningOptions?.[0],
  );
  const [activeTab, setActiveTab] = useState<"details" | "reviews">(initialTab);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [showWhatsappSuccess, setShowWhatsappSuccess] = useState(false);

  // Let the device/browser back button close this modal one step at a time
  // instead of navigating away from the site.
  useModalBackButton(isOpen, onClose);

  // Sync state when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setActiveImage(product.image);
      setSelectedWeight(product.weights?.[0]);
      setSelectedCut(product.fishCuts?.[0]);
      setSelectedCleaning(product.cleaningOptions?.[0]);
      setShowWhatsappSuccess(false);
      setWhatsappUrl(null);
      setPendingOrderId(null);
      setActiveTab(initialTab);
    }
  }, [product, initialTab]);

  if (!product) return null;

  const isMeat = product.categoryId === "meat";
  const isOutOfStock = product.stock === 0 || product.stockStatus === 'out_of_stock';
  const currentPrice = selectedWeight ? selectedWeight.price : product.price;
  const currentUnit = selectedWeight ? selectedWeight.label : product.unit;

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleIncrease = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerFlyingItem({
      image: product.image,
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
    });

    let itemName = product.name;
    if (selectedCut) itemName += ` - ${selectedCut}`;
    if (selectedCleaning) itemName += ` (${selectedCleaning})`;

    addToCart(
      {
        id: `${product.id}-${currentUnit}-${selectedCut || ""}-${selectedCleaning || ""}`,
        baseId: product.id,
        selectedWeight: currentUnit,
        selectedCut: selectedCut || undefined,
        selectedCleaning: selectedCleaning || undefined,
        name: itemName,
        price: `₹${currentPrice}`,
        numericPrice:
          typeof currentPrice === "number"
            ? currentPrice
            : parseFloat(String(currentPrice).replace(/[^0-9.]/g, "")),
        image: product.image,
        badge: currentUnit,
      },
      quantity,
    );

    // Optionally close the modal or keep it open with visual confirmation
  };

  const handleWhatsAppOrder = async () => {
    const result = await _handleWhatsAppOrder({
      product,
      user,
      settings,
      quantity,
      currentPrice,
      currentUnit,
      selectedCut,
    });
    if (result) {
      setWhatsappUrl(result.url || null);
      setPendingOrderId(result.orderId || null);
      setShowWhatsappSuccess(true);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-black/40 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="relative bg-brand-white w-full max-w-4xl max-h-[90dvh] md:max-h-[85dvh] rounded-[32px] shadow-2xl overflow-y-auto overflow-x-hidden border border-brand-gray-100 flex flex-col z-10"
          >

            {/* WhatsApp order handoff: the order is already created server-side; never ask the customer to self-attest payment/order completion. */}
            <AnimatePresence>
              {showWhatsappSuccess && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center p-8 text-center rounded-2xl">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-4 shadow-sm border border-green-100"><MessageCircle className="w-10 h-10" strokeWidth={2.5} /></div>
                  <h2 className="text-2xl font-serif text-gray-900 mb-2">Order Reference Created</h2>
                  <p className="text-gray-500 text-sm mb-2 max-w-sm">Your order reference has been created. Continue in WhatsApp to send the order details to JIYOO.</p>
                  {pendingOrderId && <p className="font-mono text-xs font-bold text-stone-700 mb-6">Order #{pendingOrderId}</p>}
                  <div className="w-full max-w-xs space-y-3">
                    {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full h-[52px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all"> <MessageCircle className="w-4 h-4" /> Open WhatsApp </a>}
                    <button onClick={() => { setShowWhatsappSuccess(false); onClose(); }} className="w-full h-[52px] bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold text-sm transition-all">Close</button>
                    {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-brand-gray-500 hover:text-emerald-600 underline">Open WhatsApp again</a>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-30 w-10 h-10 bg-brand-white/80 backdrop-blur-md hover:bg-brand-white text-brand-black rounded-full flex items-center justify-center shadow-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col md:flex-row">
              {/* Left Column: Premium Image Area */}
              <div className="w-full md:w-1/2 shrink-0 flex flex-col">
                <div className="relative w-full aspect-[4/3] md:aspect-auto md:min-h-[500px] bg-white flex items-center justify-center overflow-hidden">
                  <img
                    src={getOptimizedImageUrl(activeImage || product.image, 800, 85)}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    loading="eager"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.dataset.failed) return;

                      const rawFallbackSequence = [
                        product.image,
                        '', 
                        settings?.logoUrl || "/logo.jpg",
                        "/logo.jpg",
                      ].filter(Boolean) as string[];

                      const fallbackSequence = Array.from(
                        new Set(rawFallbackSequence),
                      );
                      const currentAttempt = parseInt(
                        target.dataset.attempt || "0",
                        10,
                      );

                      if (currentAttempt < fallbackSequence.length) {
                        target.dataset.attempt = String(currentAttempt + 1);
                        if (
                          target.src.endsWith(fallbackSequence[currentAttempt]) ||
                          target.src === fallbackSequence[currentAttempt]
                        ) {
                          target.src =
                            fallbackSequence[
                              Math.min(
                                currentAttempt + 1,
                                fallbackSequence.length - 1,
                              )
                            ];
                          target.dataset.attempt = String(currentAttempt + 1);
                        } else {
                          target.src = fallbackSequence[currentAttempt];
                        }
                      } else {
                        target.dataset.failed = "true";
                      }
                    }}
                  />

              </div>

              {/* Gallery thumbnails -- only shown when the admin has added extra photos */}
              {[product.image, ...(product.images || [])].filter(Boolean).length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto bg-brand-white border-t border-brand-gray-100">
                  {Array.from(new Set([product.image, ...(product.images || [])].filter(Boolean))).map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                        (activeImage || product.image) === img ? 'border-brand-black' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={getOptimizedImageUrl(img as string, 100, 80)} alt={`${product.name} ${i + 1}`} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
              </div>

              {/* Right Column: Detailed Info Form */}
              <div className="w-full md:w-1/2 p-6 sm:p-8 md:p-10 flex flex-col justify-between">
                <div>
                  {/* Breadcrumbs */}
                  <div className="flex items-center gap-2 text-xs text-brand-gray-400 uppercase tracking-widest font-semibold mb-3">
                    <span>{product.categoryId}</span>
                    {product.subcategoryId && (
                      <>
                        <span>/</span>
                        <span>{product.subcategoryId.replace("-", " ")}</span>
                      </>
                    )}
                    {product.subSubcategoryId && (
                      <>
                        <span>/</span>
                        <span className="text-brand-black">
                          {product.subSubcategoryId.replace("-", " ")}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Product Name */}
                  <h1 className="text-2xl sm:text-3xl font-semibold text-brand-black tracking-tight mb-2 leading-tight">
                    {product.name}
                  </h1>

                  {/* Subtext info */}
                  <div className="flex items-center gap-3 text-sm text-brand-gray-500 mb-6">
                    {product.origin && (
                      <span className="bg-brand-gray-50 px-2.5 py-1 rounded-lg">
                        Origin: {product.origin}
                      </span>
                    )}
                    {isMeat && product.cutType && (
                      <span className="bg-brand-gray-50 px-2.5 py-1 rounded-lg">
                        Cut: {product.cutType}
                      </span>
                    )}
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs uppercase tracking-wider">
                        Out of Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-green-600 font-semibold text-xs uppercase tracking-wider">
                        <Check className="w-3.5 h-3.5" /> In Stock
                      </span>
                    )}
                  </div>

                  <div className="flex gap-6 border-b border-brand-gray-100 mb-6">
                    <button
                      onClick={() => setActiveTab("details")}
                      className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === "details" ? "text-brand-black" : "text-brand-gray-400 hover:text-brand-gray-600"}`}
                    >
                      Details
                      {activeTab === "details" && (
                        <motion.div
                          layoutId="tab-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-black"
                        />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab("reviews")}
                      className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === "reviews" ? "text-brand-black" : "text-brand-gray-400 hover:text-brand-gray-600"}`}
                    >
                      Reviews
                      {activeTab === "reviews" && (
                        <motion.div
                          layoutId="tab-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-black"
                        />
                      )}
                    </button>
                  </div>

                  {activeTab === "details" ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      key="details-tab"
                    >
                      {/* Short Description */}
                      {product.description && (
                        <p className="text-sm sm:text-base text-brand-gray-500 leading-relaxed mb-6 font-light">
                          {product.description}
                        </p>
                      )}

                      {/* Option Selectors */}
                      <div className="space-y-5 mb-8">
                        {/* Weight Selector */}
                        {product.weights && product.weights.length > 0 && (
                          <div>
                            <h4 className="text-xs uppercase tracking-wider text-brand-gray-400 font-bold mb-2.5">
                              Select Weight
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {product.weights.map((w) => (
                                <button
                                  key={w.label}
                                  onClick={() => setSelectedWeight(w)}
                                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                                    selectedWeight?.label === w.label
                                      ? "bg-brand-black text-brand-white shadow-md scale-[1.02]"
                                      : "bg-brand-gray-50 text-brand-gray-600 hover:bg-brand-gray-100 border border-transparent"
                                  }`}
                                >
                                  {w.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Fish Cuts Selector */}
                        {product.fishCuts && product.fishCuts.length > 0 && (
                          <div>
                            <h4 className="text-xs uppercase tracking-wider text-brand-gray-400 font-bold mb-2.5">
                              Fish Cut Style
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {product.fishCuts.map((c) => (
                                <button
                                  key={c}
                                  onClick={() => setSelectedCut(c)}
                                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                                    selectedCut === c
                                      ? "bg-brand-black text-brand-white shadow-md scale-[1.02]"
                                      : "bg-brand-gray-50 text-brand-gray-600 hover:bg-brand-gray-100"
                                  }`}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cleaning Options Selector */}
                        {product.cleaningOptions &&
                          product.cleaningOptions.length > 0 && (
                            <div>
                              <h4 className="text-xs uppercase tracking-wider text-brand-gray-400 font-bold mb-2.5">
                                Preparation
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {product.cleaningOptions.map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => setSelectedCleaning(c)}
                                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                                      selectedCleaning === c
                                        ? "bg-brand-black text-brand-white shadow-md scale-[1.02]"
                                        : "bg-brand-gray-50 text-brand-gray-600 hover:bg-brand-gray-100"
                                    }`}
                                  >
                                    {c}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      key="reviews-tab"
                      className="mb-8"
                    >
                      <ProductReviews productId={product.id} />
                    </motion.div>
                  )}
                </div>

                {/* Interactive Purchase Row */}
                <div className="pt-6 border-t border-brand-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    {/* Delivery Info */}
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full">
                      <DeliveryScootyIcon className="w-4 h-4 text-emerald-600 animate-pulse" />
                      Delivery: {product.deliveryEstimate || "60 mins"}
                    </div>

                    {/* Price display */}
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-brand-gray-400 font-semibold block">
                        Total Price
                      </span>
                      <div className="flex items-baseline justify-end gap-2 mt-0.5">
                        <span className="text-2xl sm:text-3xl font-bold text-brand-black tracking-tight">
                          ₹{Number(currentPrice) * quantity}
                        </span>
                        {product.discount && (
                          <span className="text-sm text-brand-gray-400 line-through">
                            ₹
                            {Math.round(
                              (Number(currentPrice) * quantity) /
                                (1 - product.discount / 100),
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    {/* Quantity Selector */}
                    <div className="bg-brand-gray-50/80 p-1 rounded-2xl flex items-center border border-brand-gray-100 h-[52px]">
                      <button
                        onClick={handleDecrease}
                        disabled={quantity <= 1 || isOutOfStock}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-black hover:bg-brand-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-semibold text-brand-black text-sm">
                        {quantity}
                      </span>
                      <button
                        onClick={handleIncrease}
                        disabled={isOutOfStock}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-black hover:bg-brand-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Wishlist Icon */}
                    <button
                      onClick={() => toggleWishlist(String(product.id))}
                      className="w-[52px] h-[52px] bg-brand-gray-50/80 border border-brand-gray-100 hover:bg-brand-gray-100 rounded-2xl flex items-center justify-center text-brand-black transition-all shrink-0 active:scale-95"
                    >
                      <Heart
                        className="w-5 h-5 transition-transform active:scale-125"
                        fill={
                          wishlist.includes(String(product.id))
                            ? "#EF4444"
                            : "none"
                        }
                        stroke={
                          wishlist.includes(String(product.id))
                            ? "#EF4444"
                            : "currentColor"
                        }
                      />
                    </button>

                    {/* Add to Bag CTA */}
                    <button
                      onClick={handleAddToCart}
                      disabled={isOutOfStock}
                      className="group relative flex-1 h-[52px] text-[11px] font-bold uppercase tracking-[0.15em] text-[#FAF9F5] bg-[#1C1917] transition-all duration-500 cursor-pointer rounded-full overflow-hidden shadow-[0_5px_15px_-5px_rgba(28,25,23,0.3)] hover:shadow-[0_8px_20px_-5px_rgba(28,25,23,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="absolute inset-0 w-full h-full bg-[#292524] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <ShoppingBag className="w-4 h-4" /> 
                        {isOutOfStock ? "Sold Out" : "Add to Bag"}
                      </span>
                    </button>

                    {/* WhatsApp Direct Order CTA */}
                    <button
                      onClick={handleWhatsAppOrder}
                      className="group relative h-[52px] px-6 text-[11px] font-bold uppercase tracking-[0.15em] text-white bg-emerald-600 transition-all duration-500 cursor-pointer rounded-full overflow-hidden shadow-[0_5px_15px_-5px_rgba(5,150,105,0.3)] hover:shadow-[0_8px_20px_-5px_rgba(5,150,105,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] shrink-0"
                      title="Order directly via WhatsApp"
                    >
                      <span className="absolute inset-0 w-full h-full bg-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <MessageCircle className="w-5 h-5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Products Section */}
            {allProducts.length > 0 && (
              <div className="border-t border-brand-gray-100 bg-brand-gray-50/50 p-6 sm:p-8">
                <h3 className="text-lg font-serif font-bold text-brand-black mb-6">
                  You may also like
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {allProducts
                    .filter(
                      (p) =>
                        p.id !== product.id &&
                        p.categoryId === product.categoryId,
                    )
                    .slice(0, 4)
                    .map((relatedProduct) => (
                      <div
                        key={relatedProduct.id}
                        className="bg-brand-white rounded-xl overflow-hidden border border-brand-gray-100 shadow-xs flex flex-col group cursor-pointer"
                        onClick={() => onProductClick?.(relatedProduct)}
                      >
                        <div className="aspect-square bg-brand-gray-50 overflow-hidden">
                          <img
                            src={getOptimizedImageUrl(
                              relatedProduct.image,
                              300,
                              80,
                            )}
                            alt={relatedProduct.name}
                            className="w-full h-full object-contain"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target.dataset.failed) return;

                              const rawFallbackSequence = [
                                relatedProduct.image,
                                '', 
                                settings?.logoUrl || "/logo.jpg",
                                "/logo.jpg",
                              ].filter(Boolean) as string[];

                              const fallbackSequence = Array.from(
                                new Set(rawFallbackSequence),
                              );
                              const currentAttempt = parseInt(
                                target.dataset.attempt || "0",
                                10,
                              );

                              if (currentAttempt < fallbackSequence.length) {
                                target.dataset.attempt = String(
                                  currentAttempt + 1,
                                );
                                if (
                                  target.src.endsWith(
                                    fallbackSequence[currentAttempt],
                                  ) ||
                                  target.src ===
                                    fallbackSequence[currentAttempt]
                                ) {
                                  target.src =
                                    fallbackSequence[
                                      Math.min(
                                        currentAttempt + 1,
                                        fallbackSequence.length - 1,
                                      )
                                    ];
                                  target.dataset.attempt = String(
                                    currentAttempt + 2,
                                  );
                                } else {
                                  target.src = fallbackSequence[currentAttempt];
                                }
                              } else {
                                target.dataset.failed = "true";
                              }
                            }}
                          />
                        </div>
                        <div className="p-3">
                          <h4 className="text-xs font-semibold text-brand-black line-clamp-1 mb-1">
                            {relatedProduct.name}
                          </h4>
                          <p className="text-xs text-brand-gray-500">
                            ₹{relatedProduct.price}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
