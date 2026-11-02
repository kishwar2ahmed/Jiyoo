import React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  ShoppingBag,
  Check,
  Star,
  Plus,
  Minus,
} from "lucide-react";
import { useCartActions, useCartItemQuantity } from "../../../contexts/CartContext";
import { Product } from "../../../types";
import { useSettings } from "../../../contexts/SettingsContext";
import { getOptimizedImageUrl } from "../../../utils/imageUtils";
import { InstaBlueTickIcon } from "../../core/components/SocialIcons";
import { PremiumShieldMark } from "../../core/components/PremiumShieldMark";
import { RealisticDeliveryScooter } from "../../core/components/RealisticDeliveryScooter";
import { useToast } from "../../core/contexts/ToastContext";
import { preloadProductCutout } from "../../core/components/FlyingItemsLayer";
import { VelvetyBalloonButton } from "./VelvetyBalloonButton";
import { PriceDisplay } from "../../core/components/PriceDisplay";

function ProductCardRating({
  product,
  onProductClick,
}: {
  productId: string | number;
  product: Product;
  onProductClick?: (product: Product, tab: "details" | "reviews") => void;
}) {
  const rating = product.rating || null;
  const count = product.reviewsCount || 0;

  return (
    <div
      className="flex items-center gap-1.5 mt-1 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={(e) => {
        e.stopPropagation();
        onProductClick?.(product, "reviews");
      }}
    >
      <div className="flex items-center text-yellow-500">
        <Star
          className={`w-3 h-3 ${count > 0 ? "fill-current" : "text-gray-300"}`}
        />
      </div>
      {count > 0 ? (
        <span className="text-[11px] font-semibold text-[#1C1917]">
          {rating}
        </span>
      ) : (
        <span className="text-[11px] font-medium text-gray-500">New</span>
      )}
      <span className="text-[10px] text-[#78716C]">({count})</span>
    </div>
  );
}

export const ProductCard = React.memo(function ProductCard({
  product,
  index = 0,
  isWishlisted,
  toggleWishlist,
  onProductClick,
}: {
  key?: React.Key;
  index?: number;
  product: Product;
  isWishlisted: boolean;
  toggleWishlist: (id: string) => void;
  onProductClick?: (product: Product, tab?: "details" | "reviews") => void;
}) {
  const { addToCart, triggerFlyingItem, updateQuantity, removeFromCart } = useCartActions();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const [selectedWeight, setSelectedWeight] = useState(product.weights?.[0]);
  const [selectedCleaning, setSelectedCleaning] = useState(
    product.cleaningOptions?.[0],
  );
  const [selectedCut, setSelectedCut] = useState(product.fishCuts?.[0]);
  const [cardQty] = useState(1);
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const productImgRef = React.useRef<HTMLImageElement>(null);

  const currentPrice = selectedWeight ? selectedWeight.price : product.price;
  const currentUnit = selectedWeight ? selectedWeight.label : product.unit;
  const isOutOfStock = product.stock === 0 || product.stockStatus === 'out_of_stock';

  const activeCartItemId = `${product.id}-${currentUnit || ""}-${selectedCut || ""}-${selectedCleaning || ""}`;
  const currentQtyInCart = useCartItemQuantity(activeCartItemId);

  const allImages = React.useMemo(() => {
    return Array.from(
      new Set([product.image, ...(product.images || [])].filter(Boolean))
    ) as string[];
  }, [product.image, product.images]);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const currentImg = allImages[activeImgIdx] || product.image;

  const isAboveFold = index < 8;
  const optimizedImage = getOptimizedImageUrl(currentImg, 420, 78);

  React.useEffect(() => {
    if (productImgRef.current?.complete && productImgRef.current?.naturalWidth > 0) {
      setIsImgLoaded(true);
    }
  }, [optimizedImage]);

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent opening the detail modal
    const btnRect = e.currentTarget.getBoundingClientRect();
    const imgEl = productImgRef.current;
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

    const activeRenderedImage =
      imgEl?.currentSrc || imgEl?.src || optimizedImage;

    triggerFlyingItem({
      image: activeRenderedImage,
      name: product.name,
      price: `₹${currentPrice}`,
      badge: currentUnit,
      startX,
      startY,
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
        image: activeRenderedImage,
        badge: currentUnit,
      },
      cardQty,
    );

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1100);
  };

  return (
    <motion.article
      initial={{ opacity: isAboveFold ? 1 : 0, y: isAboveFold ? 0 : 14, scale: isAboveFold ? 1 : 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "100px", amount: 0.05 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -4, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
      whileTap={{ scale: 0.99 }}
      transition={{
        duration: 0.36,
        delay: isAboveFold ? 0 : (index % 4) * 0.03,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={() => onProductClick?.(product)}
      onPointerEnter={() => preloadProductCutout(productImgRef.current?.currentSrc || optimizedImage, true)}
      onTouchStart={() => preloadProductCutout(productImgRef.current?.currentSrc || optimizedImage, true)}
      className="group relative flex flex-col bg-gradient-to-b from-white via-white to-[#FCFBF8] rounded-2xl overflow-hidden shadow-[0_6px_22px_-6px_rgba(28,25,23,0.08)] hover:shadow-[0_22px_44px_-12px_rgba(28,25,23,0.16)] transition-all duration-300 border border-[#DFD6C5] hover:border-[#C5A880] cursor-pointer h-full"
    >
      {/* Scroll-Triggered Top Champagne-Gold Shimmer Crest Line */}
      <motion.span
        aria-hidden="true"
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, delay: 0.05 + (index % 4) * 0.04, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#C5A880]/20 via-[#C5A880] to-[#C5A880]/20 origin-left z-20"
      />

      {/* Product Image Area (Warm Studio Spotlight Pedestal + Full Uncropped Product View) */}
      <div className="luxury-sheen-sweep relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_50%_52%,#FAF6EE_0%,#FFFFFF_78%)] border-b border-[#EFEAD8] p-2.5 sm:p-3.5 flex items-center justify-center">
        {!isImgLoaded && (
          <div className="absolute inset-0 z-0 bg-brand-gray-100 animate-pulse" />
        )}
        <img
          ref={productImgRef}
          src={optimizedImage}
          alt={`${product.name} - Buy Online in India | JIYOO`}
          onLoad={(e) => {
            setIsImgLoaded(true);
            preloadProductCutout(e.currentTarget.currentSrc || optimizedImage);
          }}
          className={`w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03] ${isImgLoaded ? "opacity-100" : "opacity-0"}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          fetchPriority={index < 4 ? "high" : "auto"}
          decoding="async"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            const rawFallbackSequence = [
              product.image,
              ...(product.images || []),
              settings?.logoUrl || "/logo.jpg",
            ].filter(Boolean) as string[];

            const fallbackSequence = Array.from(new Set(rawFallbackSequence));
            const currentAttempt = parseInt(target.dataset.attempt || "0", 10);

            if (currentAttempt < fallbackSequence.length) {
              target.dataset.attempt = String(currentAttempt + 1);
              if (
                target.src.endsWith(fallbackSequence[currentAttempt]) ||
                target.src === fallbackSequence[currentAttempt]
              ) {
                target.src =
                  fallbackSequence[
                    Math.min(currentAttempt + 1, fallbackSequence.length - 1)
                  ];
                target.dataset.attempt = String(currentAttempt + 1);
                setIsImgLoaded(true);
              } else {
                target.src = fallbackSequence[currentAttempt];
                setIsImgLoaded(true);
              }
            } else {
              target.dataset.failed = "true";
              setIsImgLoaded(true);
            }
          }}
        />
        {/* Multi-Image Navigation Dots and Photo Count */}
        {allImages.length > 1 && (
          <>
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-stone-950/80 text-white text-[10px] font-medium pointer-events-none"
            >
              {activeImgIdx + 1}/{allImages.length}
            </div>

            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-stone-950/60"
            >
              {allImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImgIdx(i);
                  }}
                  aria-label={`View photo ${i + 1}`}
                  className={`transition-all duration-200 rounded-full cursor-pointer ${
                    i === activeImgIdx
                      ? "w-3 h-1 bg-[#E5C99B]"
                      : "w-1 h-1 bg-white/70 hover:bg-white"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Wishlist Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.82 }}
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(String(product.id));
            if (isWishlisted) {
              showToast(`Removed from wishlist`, "info");
            } else {
              showToast(`Saved to wishlist`, "success");
            }
          }}
          className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all border cursor-pointer shadow-2xs ${
            isWishlisted
              ? "bg-red-50 border-red-200 text-red-600 shadow-sm"
              : "bg-white/95 hover:bg-white text-[#1C1917] border-[#DFD6C5] hover:border-[#C5A880]"
          }`}
          aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
          title={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
        >
          <AnimatePresence>
            {isWishlisted && (
              <motion.span
                key="wishlist-halo"
                initial={{ scale: 0.6, opacity: 0.85 }}
                animate={{ scale: 1.65, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute inset-0 rounded-full border border-red-400"
              />
            )}
          </AnimatePresence>
          <motion.span
            key={isWishlisted ? "liked" : "unliked"}
            initial={{ scale: 0.75 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 18 }}
            className="inline-flex items-center justify-center"
          >
            <Heart
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform"
              fill={isWishlisted ? "#DC2626" : "none"}
              stroke={isWishlisted ? "#DC2626" : "currentColor"}
            />
          </motion.span>
        </motion.button>
      </div>

      {/* Product Information Card (No cropped titles or badges on mobile) */}
      <div className="flex-1 flex flex-col p-3 sm:p-5">
        <div className="flex justify-between items-start mb-1.5 sm:mb-2">
          <div className="min-w-0 w-full">
            <h3 className="text-[15px] sm:text-lg font-serif-luxury font-bold text-[#1C1917] leading-snug mb-1 break-words group-hover:text-[#0C0A09] transition-colors">
              {product.name}
            </h3>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] sm:text-[11px] text-[#78716C] font-medium">
              <span className="uppercase tracking-[0.14em] text-[9px] sm:text-[10px] text-[#8C6D46] font-bold">
                {product.categoryId}
              </span>
              <span aria-hidden="true" className="text-[#C5A880]">•</span>
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-0.5 text-red-600 font-semibold uppercase text-[9px] sm:text-[10px]">
                  Out of Stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#1C1917] font-semibold uppercase text-[9px] sm:text-[10px]">
                  <motion.span
                    initial={{ scale: 0, rotate: -35 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 18,
                      delay: 0.14 + (index % 4) * 0.065,
                    }}
                    className="inline-flex items-center justify-center shrink-0"
                  >
                    <InstaBlueTickIcon className="w-3.5 h-3.5 shrink-0" />
                  </motion.span>
                  <span>In Stock</span>
                </span>
              )}
            </div>
            <ProductCardRating
              productId={product.id}
              product={product}
              onProductClick={onProductClick as any}
            />
            {product.freshnessBadge && (
              <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50/90 border border-emerald-200/80 text-[9px] font-bold uppercase tracking-wider text-emerald-900 leading-tight">
                <PremiumShieldMark className="w-3.5 h-3.5 shrink-0" variant="emerald" />
                <span className="break-words">{product.freshnessBadge}</span>
              </div>
            )}
          </div>
        </div>

        {product.description && (
          <p className="hidden sm:line-clamp-2 text-xs text-[#655E57] mb-3 leading-relaxed font-normal">
            {product.description}
          </p>
        )}

        {/* Option selectors (Wrapped cleanly so options are never cropped off-screen) */}
        <div className="mt-auto space-y-2.5 sm:space-y-4 pt-2">
          <div className="space-y-1.5 sm:space-y-2">
            {/* Weights */}
            {product.weights && product.weights.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {product.weights.map((w) => (
                  <motion.button
                    key={w.label}
                    type="button"
                    whileTap={{ scale: 0.93 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWeight(w);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[9.5px] sm:text-[10.5px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                      selectedWeight?.label === w.label
                        ? "bg-[#1C1917] text-[#F5E6C8] border-[#C5A880] shadow-2xs"
                        : "bg-[#FAF7F0] text-[#44403C] border-[#E2D9C8] hover:border-[#C5A880] hover:bg-white"
                    }`}
                  >
                    {w.label}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Fish Cuts */}
            {product.fishCuts && product.fishCuts.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {product.fishCuts.map((c) => (
                  <motion.button
                    key={c}
                    type="button"
                    whileTap={{ scale: 0.93 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCut(c);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[9.5px] sm:text-[10.5px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                      selectedCut === c
                        ? "bg-[#1C1917] text-[#F5E6C8] border-[#C5A880] shadow-2xs"
                        : "bg-[#FAF7F0] text-[#44403C] border-[#E2D9C8] hover:border-[#C5A880] hover:bg-white"
                    }`}
                  >
                    {c}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Cleaning Options */}
            {product.cleaningOptions && product.cleaningOptions.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {product.cleaningOptions.map((c) => (
                  <motion.button
                    key={c}
                    type="button"
                    whileTap={{ scale: 0.93 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCleaning(c);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[9.5px] sm:text-[10.5px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                      selectedCleaning === c
                        ? "bg-[#1C1917] text-[#F5E6C8] border-[#C5A880] shadow-2xs"
                        : "bg-[#FAF7F0] text-[#44403C] border-[#E2D9C8] hover:border-[#C5A880] hover:bg-white"
                    }`}
                  >
                    {c}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Action Row (Stacked on mobile so price & Add button never crowd or crop) */}
          <div className="pt-2.5 sm:pt-3.5 border-t border-[#EAE3D2] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-2 mt-auto">
            <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
              <span className="group/delivery text-[9px] sm:text-[10px] text-emerald-800 uppercase font-semibold tracking-wider inline-flex items-center gap-1.5 order-2 sm:order-1">
                <RealisticDeliveryScooter className="w-6 h-5 sm:w-7 sm:h-6 shrink-0" />
                <span className="tabular-nums">{product.deliveryEstimate || "60m"}</span>
              </span>
              <div className="order-1 sm:order-2">
                <PriceDisplay
                  amount={currentPrice}
                  discountPercent={product.discount}
                  size="md"
                  weight="extrabold"
                  animated
                />
              </div>

            </div>

            {/* Pill Action Button & In-Cart Quantity Controls */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative flex items-center justify-end gap-1.5 w-full sm:w-auto"
            >
              {/* Discrete Luxury Decrement Button when In Cart */}
              <AnimatePresence>
                {currentQtyInCart > 0 && (
                  <motion.button
                    type="button"
                    initial={{ scale: 0, opacity: 0, x: 8 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    exit={{ scale: 0, opacity: 0, x: 8 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentQtyInCart <= 1) {
                        removeFromCart(activeCartItemId);
                      } else {
                        updateQuantity(activeCartItemId, currentQtyInCart - 1);
                      }
                    }}
                    aria-label="Decrease quantity"
                    className="w-[34px] h-[34px] sm:w-[32px] sm:h-[32px] rounded-full flex items-center justify-center bg-[#1C1917] hover:bg-[#292524] text-[#FAF2E1] hover:text-[#E5C99B] border border-[#C5A880]/70 shadow-[0_3px_10px_rgba(0,0,0,0.25)] cursor-pointer transition-colors shrink-0"
                  >
                    <Minus className="w-3.5 h-3.5" strokeWidth={2.6} />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Velvet Butterfly Pill Button - Permanent, Crisp & Authentic */}
              <div className="relative inline-flex items-center justify-end min-w-0 flex-1 sm:flex-initial">
                <VelvetyBalloonButton
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  justAdded={justAdded}
                  label={isOutOfStock ? "Sold Out" : "Add to Cart"}
                  size="card"
                  className="w-full sm:w-auto flex items-center justify-center sm:justify-end"
                />

                {/* Floating Velvet & Gold Quantity Badge */}
                <AnimatePresence>
                  {currentQtyInCart > 0 && (
                    <motion.span
                      initial={{ scale: 0, y: 4 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0, y: 4 }}
                      key={currentQtyInCart}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      className="pointer-events-none absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-stone-900 text-amber-200 border border-[#C5A880] text-[11px] font-semibold flex items-center justify-center shadow-sm z-30 tabular-nums"
                    >
                      {currentQtyInCart}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
});
