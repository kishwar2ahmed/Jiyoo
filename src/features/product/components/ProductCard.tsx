import React from "react";
import { useState } from "react";
import { motion } from "motion/react";
import {
  Heart,
  ShoppingBag,
  Check,
  Star,
} from "lucide-react";
import { useCart } from "../../../contexts/CartContext";
import { Product } from "../../../types";
import { useSettings } from "../../../contexts/SettingsContext";
import { getOptimizedImageUrl } from "../../../utils/imageUtils";
import { InstaBlueTickIcon } from "../../core/components/SocialIcons";
import { PremiumShieldMark } from "../../core/components/PremiumShieldMark";
import { RealisticDeliveryScooter } from "../../core/components/RealisticDeliveryScooter";
import { useToast } from "../../core/contexts/ToastContext";

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
  const { addToCart, triggerFlyingItem } = useCart();
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

  const optimizedImage = getOptimizedImageUrl(product.image, 500, 80);

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
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-10px", amount: 0.12 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -4, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
      whileTap={{ scale: 0.985 }}
      transition={{
        duration: 0.55,
        delay: (index % 4) * 0.045,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={() => onProductClick?.(product)}
      className="group relative flex flex-col bg-white rounded-xl overflow-hidden shadow-xs hover:shadow-[0_20px_40px_-14px_rgba(28,25,23,0.12)] transition-shadow duration-300 border border-[#E7E3DA] hover:border-[#C5A880]/70 cursor-pointer h-full"
    >
      {/* Scroll-Triggered Top Gold Shimmer Accent Line */}
      <motion.span
        aria-hidden="true"
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.75, delay: 0.1 + (index % 4) * 0.065, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C5A880]/70 to-transparent origin-left z-20"
      />

      {/* Product Image Area (Full uncropped product view with scroll-linked lens settle) */}
      <motion.div
        initial={{ scale: 1.07 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.78, delay: (index % 4) * 0.065, ease: [0.16, 1, 0.3, 1] }}
        className="relative aspect-[4/3] overflow-hidden bg-white p-2 sm:p-3 flex items-center justify-center"
      >
        {!isImgLoaded && (
          <div className="absolute inset-0 z-0 bg-brand-gray-100 animate-pulse" />
        )}
        <img
          ref={productImgRef}
          src={optimizedImage}
          alt={product.name}
          onLoad={() => setIsImgLoaded(true)}
          className={`w-full h-full object-contain transition-all duration-500 ease-out sm:group-hover:scale-[1.06] ${isImgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.dataset.failed) return;

            const rawFallbackSequence = [
              product.image,
              '', 
              settings?.logoUrl || "/logo.jpg",
              "/logo.jpg",
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

        {/* Wishlist Button */}
        <motion.button
          type="button"
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
          className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors border cursor-pointer ${
            isWishlisted
              ? "bg-red-50 border-red-200 text-red-600 shadow-sm"
              : "bg-[#FAF9F5]/95 hover:bg-white text-[#1C1917] border-[#E7E3DA]"
          }`}
          aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
          title={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
        >
          <Heart
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform"
            fill={isWishlisted ? "#DC2626" : "none"}
            stroke={isWishlisted ? "#DC2626" : "currentColor"}
          />
        </motion.button>
      </motion.div>

      {/* Product Information Card (No cropped titles or badges on mobile) */}
      <div className="flex-1 flex flex-col p-3 sm:p-5">
        <div className="flex justify-between items-start mb-1.5 sm:mb-2">
          <div className="min-w-0 w-full">
            <h4 className="text-sm sm:text-lg font-serif-luxury font-semibold text-[#1C1917] leading-snug mb-1 break-words group-hover:text-[#0C0A09] transition-colors">
              {product.name}
            </h4>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] sm:text-[11px] text-[#78716C] font-medium">
              <span className="uppercase tracking-widest text-[9px] sm:text-[10px]">
                {product.categoryId}
              </span>
              <span aria-hidden="true">·</span>
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
              <div className="mt-1 inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-800 leading-tight">
                <PremiumShieldMark className="w-3.5 h-3.5 shrink-0" variant="emerald" />
                <span className="break-words">{product.freshnessBadge}</span>
              </div>
            )}
          </div>
        </div>

        {product.description && (
          <p className="hidden sm:line-clamp-2 text-xs text-[#78716C] mb-3 leading-relaxed font-normal">
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
                    className={`px-2 sm:px-2.5 py-1 rounded-sm text-[9.5px] sm:text-[10px] font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
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
                    className={`px-2 sm:px-2.5 py-1 rounded-sm text-[9.5px] sm:text-[10px] font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
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
                    className={`px-2 sm:px-2.5 py-1 rounded-sm text-[9.5px] sm:text-[10px] font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
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

          {/* Action Row (Stacked on mobile so price & Add button never crowd or crop) */}
          <div className="pt-2.5 sm:pt-4 border-t border-[#E7E3DA] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-2 mt-auto">
            <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
              <span className="text-[9px] sm:text-[10px] text-emerald-800 uppercase font-semibold tracking-wider inline-flex items-center gap-1.5 order-2 sm:order-1">
                <RealisticDeliveryScooter className="w-5 h-3.5 shrink-0" />
                <span className="tabular-nums">{product.deliveryEstimate || "60m"}</span>
              </span>
              <div className="flex items-baseline gap-1.5 tabular-nums order-1 sm:order-2">
                <span className="text-base sm:text-lg font-serif-luxury font-bold text-[#1C1917]">
                  ₹{Number(currentPrice)}
                </span>
                {product.discount && (
                  <span className="text-[10px] sm:text-xs text-[#A8A29E] line-through">
                    ₹{Math.round(Number(currentPrice) / (1 - product.discount / 100))}
                  </span>
                )}
              </div>
            </div>

            <motion.button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              whileTap={isOutOfStock ? undefined : { scale: 0.95 }}
              className={`group relative inline-flex items-center justify-center w-full sm:w-auto h-9 sm:h-10 px-3.5 sm:px-5 text-[10px] font-bold uppercase tracking-[0.12em] rounded-lg transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap ${
                justAdded
                  ? "bg-emerald-700 text-white"
                  : "bg-[#1C1917] hover:bg-[#292524] text-[#FAF9F5]"
              }`}
            >
              <span className="relative z-10 flex items-center gap-1.5">
                {justAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>{isOutOfStock ? "Sold Out" : "Add"}</span>
                  </>
                )}
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
