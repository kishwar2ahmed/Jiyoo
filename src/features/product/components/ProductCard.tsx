import React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
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
      role="button"
      tabIndex={0}
      className="flex items-center gap-1.5 mt-1 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={(e) => {
        e.stopPropagation();
        onProductClick?.(product, "reviews");
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
          e.preventDefault();
          onProductClick?.(product, "reviews");
        }
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

  const isAboveFold = index < 16;
  const optimizedImage = getOptimizedImageUrl(currentImg, 420, 78);

  React.useLayoutEffect(() => {
    if (productImgRef.current?.complete && productImgRef.current?.naturalWidth > 0) {
      setIsImgLoaded(true);
      preloadProductCutout(productImgRef.current.currentSrc || optimizedImage);
    } else {
      setIsImgLoaded(false);
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
      },
      cardQty,
    );

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1100);
  };

  return (
    <motion.div
      initial={false}
      whileHover={{ y: -4, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onProductClick?.(product)}
      onPointerEnter={() => preloadProductCutout(productImgRef.current?.currentSrc || optimizedImage, true)}
      onTouchStart={() => preloadProductCutout(productImgRef.current?.currentSrc || optimizedImage, true)}
      className="group relative flex flex-col bg-white rounded-xl overflow-hidden shadow-xs hover:shadow-[0_20px_40px_-14px_rgba(28,25,23,0.12)] transition-shadow duration-300 border border-[#E7E3DA] hover:border-[#C5A880]/70 cursor-pointer h-full"
    >
      {/* Top Gold Shimmer Accent Line */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C5A880]/70 to-transparent z-20"
      />

      {/* Product Image Area (Full uncropped product view, instant progressive paint) */}
      <div className="luxury-sheen-sweep relative aspect-[4/3] overflow-hidden bg-white p-2 sm:p-3 flex items-center justify-center">
        {!isImgLoaded && (
          <div className="absolute inset-0 z-0 bg-[#F4F1EA]/70 animate-pulse pointer-events-none" />
        )}
        <img
          ref={productImgRef}
          src={optimizedImage}
          alt={product.name}
          onLoad={(e) => {
            setIsImgLoaded(true);
            preloadProductCutout(e.currentTarget.currentSrc || optimizedImage);
          }}
          className="relative z-10 max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:group-hover:scale-[1.045]"
          loading={isAboveFold ? "eager" : "lazy"}
          fetchPriority={index < 8 ? "high" : "auto"}
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
              if (
                target.src.endsWith(fallbackSequence[currentAttempt]) ||
                target.src === fallbackSequence[currentAttempt]
              ) {
                const nextIdx = Math.min(currentAttempt + 1, fallbackSequence.length - 1);
                target.src = fallbackSequence[nextIdx];
                target.dataset.attempt = String(currentAttempt + 2);
              } else {
                target.src = fallbackSequence[currentAttempt];
                target.dataset.attempt = String(currentAttempt + 1);
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
              className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[#FAF9F5] text-[9px] font-mono tracking-wider font-semibold pointer-events-none"
            >
              {activeImgIdx + 1}/{allImages.length}
            </div>

            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-xs"
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
                  className="p-1 flex items-center justify-center cursor-pointer"
                >
                  <span
                    className={`block transition-all duration-200 rounded-full ${
                      i === activeImgIdx
                        ? "w-3.5 h-1.5 bg-[#E5C99B]"
                        : "w-1.5 h-1.5 bg-white/75 hover:bg-white"
                    }`}
                  />
                </button>
              ))}
            </div>
          </>
        )}

        {/* Wishlist Button (Enlarged Apple HIG Touch Area) */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(String(product.id));
            if (isWishlisted) {
              showToast(`Removed from wishlist`, "info");
            } else {
              showToast(`Saved to wishlist`, "success");
            }
          }}
          className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors border cursor-pointer ${
            isWishlisted
              ? "bg-red-50 border-red-200 text-red-600 shadow-sm"
              : "bg-[#FAF9F5]/95 hover:bg-white text-[#1C1917] border-[#E7E3DA]"
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
              className="w-4 h-4 transition-transform"
              fill={isWishlisted ? "#DC2626" : "none"}
              stroke={isWishlisted ? "#DC2626" : "currentColor"}
            />
          </motion.span>
        </motion.button>
      </div>

      {/* Product Information Card (No cropped titles or badges on mobile) */}
      <div className="flex-1 flex flex-col p-3 sm:p-4">
        <div className="flex justify-between items-start mb-1 sm:mb-1.5">
          <div className="min-w-0 w-full">
            <h4 className="text-sm sm:text-lg font-serif-luxury font-semibold text-[#1C1917] leading-tight mb-0.5 break-words line-clamp-2 group-hover:text-[#0C0A09] transition-colors">
              {product.name}
            </h4>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] sm:text-[11px] text-[#57534E] font-medium">
              <span className="uppercase tracking-wider text-[9.5px] sm:text-[10px] text-[#78716C]">
                {product.subcategoryId === "imported-fruits"
                  ? "Imported Fruit"
                  : product.subcategoryId === "indian-fruits"
                  ? "Indian Fruit"
                  : product.subcategoryId === "imported-vegetables"
                  ? "Imported Veg"
                  : product.subcategoryId === "indian-vegetables"
                  ? "Fresh Veg"
                  : product.subcategoryId === "chicken"
                  ? "Fresh Chicken"
                  : product.subcategoryId === "mutton"
                  ? "Fresh Mutton"
                  : product.subcategoryId === "fish-seafood"
                  ? "Fish & Seafood"
                  : product.categoryId === "smoothies"
                  ? "Fresh Smoothie"
                  : product.categoryId === "fast-foods"
                  ? "Fast Food"
                  : product.categoryId}
              </span>
              <span aria-hidden="true">·</span>
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-0.5 text-red-600 font-semibold uppercase text-[9.5px] sm:text-[10px]">
                  Out of Stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#1C1917] font-semibold uppercase text-[9.5px] sm:text-[10px]">
                  <span className="inline-flex items-center justify-center shrink-0">
                    <InstaBlueTickIcon className="w-3.5 h-3.5 shrink-0" />
                  </span>
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
              <div className="mt-1 inline-flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-emerald-800 leading-tight">
                <PremiumShieldMark className="w-3.5 h-3.5 shrink-0" variant="emerald" />
                <span className="break-words">{product.freshnessBadge}</span>
              </div>
            )}
          </div>
        </div>

        {product.description && (
          <p className="hidden sm:line-clamp-2 text-xs text-[#78716C] mb-2 leading-relaxed font-normal">
            {product.description}
          </p>
        )}

        {/* Option selectors (Ergonomic thumb-friendly chips) */}
        <div className="mt-auto space-y-2 sm:space-y-3 pt-1.5">
          <div className="space-y-1.5 sm:space-y-2">
            {/* Weights */}
            {product.weights && product.weights.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.weights.map((w) => (
                  <motion.button
                    key={w.label}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWeight(w);
                    }}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10.5px] sm:text-[11px] font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
                      selectedWeight?.label === w.label
                        ? "bg-[#1C1917] text-[#FAF9F5] border-[#1C1917]"
                        : "bg-[#F4F1EA] text-[#44403C] border-[#E7E3DA] hover:border-[#1C1917]"
                    }`}
                  >
                    {w.label}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Fish Cuts */}
            {product.fishCuts && product.fishCuts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.fishCuts.map((c) => (
                  <motion.button
                    key={c}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCut(c);
                    }}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10.5px] sm:text-[11px] font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
                      selectedCut === c
                        ? "bg-[#1C1917] text-[#FAF9F5] border-[#1C1917]"
                        : "bg-[#F4F1EA] text-[#44403C] border-[#E7E3DA] hover:border-[#1C1917]"
                    }`}
                  >
                    {c}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Cleaning Options */}
            {product.cleaningOptions && product.cleaningOptions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.cleaningOptions.map((c) => (
                  <motion.button
                    key={c}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCleaning(c);
                    }}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10.5px] sm:text-[11px] font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
                      selectedCleaning === c
                        ? "bg-[#1C1917] text-[#FAF9F5] border-[#1C1917]"
                        : "bg-[#F4F1EA] text-[#44403C] border-[#E7E3DA] hover:border-[#1C1917]"
                    }`}
                  >
                    {c}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Action Row (Stacks cleanly when in-cart stepper is active so [-] [Add to Cart] [+] never clip) */}
          <div
            className={`pt-2.5 sm:pt-3.5 border-t border-[#E7E3DA] flex gap-2.5 mt-auto ${
              currentQtyInCart > 0
                ? "flex-col items-stretch"
                : "flex-col sm:flex-row sm:items-center justify-between"
            }`}
          >
            <div
              className={`flex items-center justify-between gap-1 ${
                currentQtyInCart > 0 ? "w-full" : "sm:flex-col sm:items-start"
              }`}
            >
              <span
                className={`group/delivery text-[9px] sm:text-[10px] text-emerald-800 uppercase font-semibold tracking-wider inline-flex items-center gap-1.5 ${
                  currentQtyInCart > 0 ? "order-2" : "order-2 sm:order-1"
                }`}
              >
                <RealisticDeliveryScooter className="w-6 h-5 sm:w-7 sm:h-6 shrink-0" />
                <span className="tabular-nums">{product.deliveryEstimate || "60m"}</span>
              </span>
              <div className={currentQtyInCart > 0 ? "order-1" : "order-1 sm:order-2"}>
                <PriceDisplay
                  amount={currentPrice}
                  discountPercent={product.discount}
                  autoAnchor
                  seedKey={product.id}
                  size="md"
                  weight="extrabold"
                  animated
                />
              </div>
            </div>

            {/* Pill Action Button & Clear Plus-Minus In-Cart Quantity Controls */}
            <div
              onClick={(e) => e.stopPropagation()}
              className={`relative flex items-center gap-1.5 ${
                currentQtyInCart > 0
                  ? "w-full justify-between"
                  : "w-full sm:w-auto justify-end"
              }`}
            >
              {/* Discrete Luxury Decrement (-) Button when In Cart */}
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
                    title="Decrease quantity"
                    className="w-[34px] h-[34px] rounded-full flex items-center justify-center bg-[#1C1917] hover:bg-[#292524] text-[#FAF2E1] hover:text-[#E5C99B] border border-[#C5A880]/70 shadow-[0_3px_10px_rgba(0,0,0,0.25)] cursor-pointer transition-colors shrink-0"
                  >
                    <Minus className="w-3.5 h-3.5" strokeWidth={2.6} />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Velvet Butterfly Pill Button - Permanent, Crisp & Authentic */}
              <div className="relative inline-flex items-center justify-center min-w-0 flex-1 sm:flex-initial">
                <VelvetyBalloonButton
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  justAdded={justAdded}
                  label={isOutOfStock ? "Sold Out" : "Add to Cart"}
                  size="card"
                  className="w-full sm:w-auto flex items-center justify-center"
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
                      className="pointer-events-none absolute -top-1.5 -right-1.5 min-w-[21px] h-[21px] px-1 rounded-full bg-[#1C1917] text-[#FAF2E1] border-2 border-[#C5A880] text-[10.5px] font-bold font-mono flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.4)] z-30"
                    >
                      {currentQtyInCart}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Discrete Luxury Increment (+) Button when In Cart */}
              <AnimatePresence>
                {currentQtyInCart > 0 && !isOutOfStock && (
                  <motion.button
                    type="button"
                    initial={{ scale: 0, opacity: 0, x: -8 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    exit={{ scale: 0, opacity: 0, x: -8 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    whileTap={{ scale: 0.85 }}
                    onClick={handleAddToCart}
                    aria-label="Increase quantity"
                    title="Increase quantity"
                    className="w-[34px] h-[34px] rounded-full flex items-center justify-center bg-[#1C1917] hover:bg-[#292524] text-[#FAF2E1] hover:text-[#E5C99B] border border-[#C5A880]/70 shadow-[0_3px_10px_rgba(0,0,0,0.25)] cursor-pointer transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.6} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
