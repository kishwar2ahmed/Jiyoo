import React from "react";
import { useState } from "react";
import { motion } from "motion/react";
import {
  Heart,
  ShoppingBag,
  ShieldCheck,
  Check,
  Star,
} from "lucide-react";
import { useCart } from "../../../contexts/CartContext";
import { Product } from "../../../types";
import { useSettings } from "../../../contexts/SettingsContext";
import { getOptimizedImageUrl } from "../../../utils/imageUtils";

function DeliveryScootyIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
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
  const { settings } = useSettings();
  const [selectedWeight, setSelectedWeight] = useState(product.weights?.[0]);
  const [selectedCleaning, setSelectedCleaning] = useState(
    product.cleaningOptions?.[0],
  );
  const [selectedCut, setSelectedCut] = useState(product.fishCuts?.[0]);
  const [cardQty] = useState(1);
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const currentPrice = selectedWeight ? selectedWeight.price : product.price;
  const currentUnit = selectedWeight ? selectedWeight.label : product.unit;
  const isOutOfStock = product.stock === 0 || product.stockStatus === 'out_of_stock';

  const optimizedImage = getOptimizedImageUrl(product.image, 500, 80);

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent opening the detail modal
    const rect = e.currentTarget.getBoundingClientRect();
    triggerFlyingItem({
      image: optimizedImage,
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
        image: optimizedImage,
        badge: currentUnit,
      },
      cardQty,
    );

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.975 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-25px" }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{ y: -4 }}
      transition={{
        duration: 0.52,
        delay: (index % 4) * 0.055,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={() => onProductClick?.(product)}
      className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-300 border border-[#E7E3DA] cursor-pointer h-full"
    >
      {/* Product Image Area (Full uncropped product view) */}
      <div className="relative aspect-[4/3] overflow-hidden bg-white p-2 sm:p-3 flex items-center justify-center">
        {!isImgLoaded && (
          <div className="absolute inset-0 z-0 bg-brand-gray-100 animate-pulse" />
        )}
        <img
          src={optimizedImage}
          alt={product.name}
          onLoad={() => setIsImgLoaded(true)}
          className={`w-full h-full object-contain transition-all duration-500 ease-out sm:group-hover:scale-[1.05] ${isImgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
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
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(String(product.id));
          }}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 w-7 h-7 sm:w-8 sm:h-8 bg-[#FAF9F5]/95 rounded-full flex items-center justify-center text-[#1C1917] hover:bg-white transition-colors border border-[#E7E3DA] cursor-pointer"
          aria-label="Toggle wishlist"
        >
          <Heart
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform"
            fill={isWishlisted ? "#DC2626" : "none"}
            stroke={isWishlisted ? "#DC2626" : "currentColor"}
          />
        </motion.button>
      </div>

      {/* Product Information Card (No cropped titles or badges on mobile) */}
      <div className="flex-1 flex flex-col p-3 sm:p-5">
        <div className="flex justify-between items-start mb-1.5 sm:mb-2">
          <div className="min-w-0 w-full">
            <h4 className="text-sm sm:text-lg font-serif-luxury font-semibold text-[#1C1917] leading-snug mb-1 break-words">
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
                <span className="inline-flex items-center gap-0.5 text-emerald-800 font-semibold uppercase text-[9px] sm:text-[10px]">
                  <Check className="w-2.5 h-2.5 shrink-0" /> In Stock
                </span>
              )}
            </div>
            <ProductCardRating
              productId={product.id}
              product={product}
              onProductClick={onProductClick as any}
            />
            {product.freshnessBadge && (
              <div className="mt-1 inline-flex items-start gap-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-800 leading-tight">
                <ShieldCheck className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" />
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
                  <button
                    key={w.label}
                    type="button"
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
                  </button>
                ))}
              </div>
            )}

            {/* Fish Cuts */}
            {product.fishCuts && product.fishCuts.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {product.fishCuts.map((c) => (
                  <button
                    key={c}
                    type="button"
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
                  </button>
                ))}
              </div>
            )}

            {/* Cleaning Options */}
            {product.cleaningOptions && product.cleaningOptions.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {product.cleaningOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
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
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Row (Stacked on mobile so price & Add button never crowd or crop) */}
          <div className="pt-2.5 sm:pt-4 border-t border-[#E7E3DA] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-2 mt-auto">
            <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
              <span className="text-[9px] sm:text-[10px] text-emerald-800 uppercase font-semibold tracking-wider inline-flex items-center gap-1 order-2 sm:order-1">
                <DeliveryScootyIcon className="w-3 h-3 text-emerald-700 shrink-0" />
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
