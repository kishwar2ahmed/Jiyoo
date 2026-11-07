import { useState, useEffect, useRef } from "react";
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
import { InstaBlueTickIcon } from "../../core/components/SocialIcons";
import { PremiumShieldMark } from "../../core/components/PremiumShieldMark";
import { RealisticDeliveryScooter } from "../../core/components/RealisticDeliveryScooter";
import { preloadProductCutout } from "../../core/components/FlyingItemsLayer";
import { VelvetyBalloonButton } from "./VelvetyBalloonButton";
import { VelvetWhatsAppButton } from "./VelvetWhatsAppButton";
import { PriceDisplay } from "../../core/components/PriceDisplay";

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
  const [justAdded, setJustAdded] = useState(false);
  const modalImgRef = useRef<HTMLImageElement>(null);

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
  const isWholesaleProduct = Boolean(product.wholesaleEligible && product.wholesalePrice);
  const currentPrice = selectedWeight
    ? selectedWeight.price
    : isWholesaleProduct
    ? product.wholesalePrice!
    : product.price;
  const currentUnit = selectedWeight
    ? selectedWeight.label
    : isWholesaleProduct
    ? product.wholesaleUnit || product.unit
    : product.unit;

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleIncrease = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btnRect = e.currentTarget.getBoundingClientRect();
    const imgEl = modalImgRef.current;
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

    const optimizedModalImage = getOptimizedImageUrl(
      activeImage || product.image,
      800,
      85,
    );
    const activeRenderedImage =
      imgEl?.currentSrc || imgEl?.src || optimizedModalImage;

    triggerFlyingItem({
      image: activeRenderedImage,
      name: product.name,
      price: `₹${Number(currentPrice) * quantity}`,
      badge: currentUnit,
      startX,
      startY,
    });

    let itemName = product.name;
    if (selectedCut) itemName += ` - ${selectedCut}`;
    if (selectedCleaning) itemName += ` (${selectedCleaning})`;

    addToCart(
      {
        id: `${product.id}-${currentUnit || ""}-${selectedCut || ""}-${selectedCleaning || ""}`,
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
        image: activeRenderedImage,
        badge: currentUnit,
        ...(isWholesaleProduct
          ? {
              wholesaleEligible: true,
              wholesaleMinQty: product.wholesaleMinQty || 1,
            }
          : {}),
      } as any,
      isWholesaleProduct
        ? Math.max(quantity, product.wholesaleMinQty || 1)
        : quantity,
    );

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1150);
  };

  const handleWhatsAppOrder = async () => {
    const optimizedModalImage = getOptimizedImageUrl(
      activeImage || product.image,
      800,
      85,
    );
    const imgEl = modalImgRef.current;
    const activeRenderedImage =
      imgEl?.currentSrc || imgEl?.src || optimizedModalImage;

    let itemName = product.name;
    if (selectedCut) itemName += ` - ${selectedCut}`;
    if (selectedCleaning) itemName += ` (${selectedCleaning})`;

    addToCart(
      {
        id: `${product.id}-${currentUnit || ""}-${selectedCut || ""}-${selectedCleaning || ""}`,
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
        image: activeRenderedImage,
        badge: currentUnit,
        ...(isWholesaleProduct
          ? {
              wholesaleEligible: true,
              wholesaleMinQty: product.wholesaleMinQty || 1,
            }
          : {}),
      } as any,
      isWholesaleProduct
        ? Math.max(quantity, product.wholesaleMinQty || 1)
        : quantity,
    );

    onClose();
    showToast(
      "Please enter your delivery details (Name, Phone, Address, Area, City & PIN Code) to complete your WhatsApp order.",
      "info",
    );
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent("open-whatsapp-checkout"));
    }, 50);
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
                <div className="luxury-sheen-sweep relative w-full aspect-[4/3] md:aspect-auto md:min-h-[500px] bg-white p-4 sm:p-6 flex items-center justify-center overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.img
                      key={activeImage || product.image}
                      ref={modalImgRef}
                      src={getOptimizedImageUrl(activeImage || product.image, 800, 85)}
                      alt={product.name}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.015 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="max-w-full max-h-full w-auto h-auto object-contain will-change-transform select-none"
                      loading="eager"
                      onLoad={(e) => {
                        preloadProductCutout(
                          e.currentTarget.currentSrc ||
                            getOptimizedImageUrl(activeImage || product.image, 800, 85)
                        );
                      }}
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
                            target.dataset.attempt = String(currentAttempt + 2);
                          } else {
                            target.src = fallbackSequence[currentAttempt];
                            target.dataset.attempt = String(currentAttempt + 1);
                          }
                        } else {
                          target.dataset.failed = "true";
                        }
                      }}
                    />
                  </AnimatePresence>
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
                    {product.freshnessBadge && (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-850 px-2.5 py-1 rounded-lg text-xs font-semibold">
                        <PremiumShieldMark className="w-3.5 h-3.5 shrink-0" variant="emerald" />
                        <span>{product.freshnessBadge}</span>
                      </span>
                    )}
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs uppercase tracking-wider">
                        Out of Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-brand-black font-semibold text-xs uppercase tracking-wider">
                        <InstaBlueTickIcon className="w-4 h-4 shrink-0" />
                        <span>In Stock</span>
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
                    <div className="group flex items-center gap-2 text-xs text-emerald-900 font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-full shadow-2xs">
                      <RealisticDeliveryScooter className="w-9 h-7.5 shrink-0" />
                      <span>Delivery: {product.deliveryEstimate || "60 mins"}</span>
                    </div>

                    {/* Price display */}
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-brand-gray-400 font-semibold block mb-0.5">
                        Total Price
                      </span>
                      <PriceDisplay
                        amount={Number(currentPrice) * quantity}
                        discountPercent={product.discount}
                        autoAnchor
                        seedKey={product.id}
                        size="2xl"
                        weight="extrabold"
                        animated
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-2">
                    <div className="flex items-center justify-between sm:justify-start gap-2.5 shrink-0">
                      {/* Quantity Selector */}
                      <div className="bg-brand-gray-50/80 p-1 rounded-2xl flex items-center border border-brand-gray-100 h-[50px] sm:h-[52px]">
                        <button
                          onClick={handleDecrease}
                          disabled={quantity <= 1 || isOutOfStock}
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-black hover:bg-brand-white active:scale-90 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center font-semibold text-brand-black text-sm overflow-hidden inline-flex items-center justify-center tabular-nums">
                          <AnimatePresence mode="popLayout" initial={false}>
                            <motion.span
                              key={`modal-qty-${quantity}`}
                              initial={{ y: 8, opacity: 0, scale: 0.85 }}
                              animate={{ y: 0, opacity: 1, scale: 1 }}
                              exit={{ y: -8, opacity: 0, scale: 0.85 }}
                              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                              className="inline-block"
                            >
                              {quantity}
                            </motion.span>
                          </AnimatePresence>
                        </span>
                        <button
                          onClick={handleIncrease}
                          disabled={isOutOfStock}
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-black hover:bg-brand-white active:scale-90 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Wishlist Icon */}
                      <button
                        onClick={() => toggleWishlist(String(product.id))}
                        aria-label="Toggle wishlist"
                        className="w-[50px] h-[50px] sm:w-[52px] sm:h-[52px] bg-brand-gray-50/80 border border-brand-gray-100 hover:bg-brand-gray-100 rounded-2xl flex items-center justify-center text-brand-black transition-all shrink-0 active:scale-95"
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
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                      {/* Add to Bag CTA */}
                      <VelvetyBalloonButton
                        onClick={handleAddToCart}
                        disabled={isOutOfStock}
                        justAdded={justAdded}
                        label={isOutOfStock ? "Sold Out" : "Add to Bag"}
                        size="modal"
                        className="w-full sm:w-auto"
                      />

                      {/* WhatsApp Direct Order CTA in Imperial Maroon Velvet */}
                      <VelvetWhatsAppButton
                        onClick={handleWhatsAppOrder}
                        disabled={isOutOfStock}
                        label={isOutOfStock ? "Out of Stock" : "Order via WhatsApp"}
                        size="modal"
                        className="w-full sm:w-auto"
                      />
                    </div>
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
                    .map((relatedProduct, rIdx) => (
                      <motion.div
                        key={relatedProduct.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.32, delay: rIdx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ y: -4 }}
                        className="bg-brand-white rounded-xl overflow-hidden border border-brand-gray-100 hover:border-[#C5A880] shadow-xs hover:shadow-[0_14px_28px_-10px_rgba(28,25,23,0.12)] transition-all flex flex-col group cursor-pointer"
                        onClick={() => onProductClick?.(relatedProduct)}
                      >
                        <div className="luxury-sheen-sweep aspect-square bg-brand-gray-50 overflow-hidden p-2">
                          <img
                            src={getOptimizedImageUrl(
                              relatedProduct.image,
                              300,
                              80,
                            )}
                            alt={relatedProduct.name}
                            className="w-full h-full object-contain transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
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
                          <h4 className="text-xs font-semibold text-brand-black line-clamp-1 mb-1 group-hover:text-emerald-800 transition-colors">
                            {relatedProduct.name}
                          </h4>
                          <p className="text-xs font-semibold text-brand-gray-500 tabular-nums">
                            ₹{relatedProduct.price}
                          </p>
                        </div>
                      </motion.div>
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
