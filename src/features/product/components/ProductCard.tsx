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
  isWishlisted,
  toggleWishlist,
  onProductClick,
}: {
  key?: React.Key;
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
  const [cardQty, setCardQty] = useState(1);
  const [isImgLoaded, setIsImgLoaded] = useState(false);

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
  };

  const incrementQty = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCardQty((prev) => prev + 1);
  };

  const decrementQty = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cardQty > 1) {
      setCardQty((prev) => prev - 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onProductClick?.(product)}
      className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 border border-[#E7E3DA] cursor-pointer h-full"
    >
      {/* Product Image Area */}
      <div className="relative aspect-[4/3] overflow-hidden bg-white">
        {!isImgLoaded && (
          <div className="absolute inset-0 z-0 bg-brand-gray-100 animate-pulse" />
        )}
        <img
          src={optimizedImage}
          alt={product.name}
          onLoad={() => setIsImgLoaded(true)}
          className={`w-full h-full object-contain transition-opacity duration-500 ${isImgLoaded ? "opacity-100" : "opacity-0"}`}
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

        {/* Keep the product photography completely unobstructed. Marketing/freshness
            messaging is rendered in the information area below instead of over the image. */}

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(String(product.id));
          }}
          className="absolute top-3 right-3 z-20 w-8 h-8 bg-[#FAF9F5] rounded-full flex items-center justify-center text-[#1C1917] hover:bg-white transition-colors border border-[#E7E3DA]"
        >
          <Heart
            className="w-4 h-4 transition-transform active:scale-125"
            fill={isWishlisted ? "#DC2626" : "none"}
            stroke={isWishlisted ? "#DC2626" : "currentColor"}
          />
        </button>
      </div>

      {/* Product Information Card */}
      <div className="flex-1 flex flex-col p-3 sm:p-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="text-base sm:text-lg font-serif-luxury font-semibold text-[#1C1917] leading-tight mb-1 line-clamp-1">
              {product.name}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-[#78716C] font-medium">
              <span className="uppercase tracking-widest text-[10px]">
                {product.categoryId}
              </span>
              <span>•</span>
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-0.5 text-red-600 font-semibold uppercase text-[10px]">
                  Out of Stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-emerald-800 font-semibold uppercase text-[10px]">
                  <Check className="w-2.5 h-2.5" /> In Stock
                </span>
              )}
            </div>
            <ProductCardRating
              productId={product.id}
              product={product}
              onProductClick={onProductClick as any}
            />
            {product.freshnessBadge && (
              <div className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-800">
                <ShieldCheck className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>{product.freshnessBadge}</span>
              </div>
            )}
          </div>
        </div>

        {product.description && (
          <p className="text-xs text-[#78716C] line-clamp-2 mb-4 leading-relaxed font-normal">
            {product.description}
          </p>
        )}

        {/* Option selectors */}
        <div className="mt-auto space-y-4">
          <div className="space-y-2">
            {/* Weights */}
            {product.weights && product.weights.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                {product.weights.map((w) => (
                  <button
                    key={w.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWeight(w);
                    }}
                    className={`px-2.5 py-1 rounded-sm text-[10px] font-semibold whitespace-nowrap transition-colors border ${
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
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                {product.fishCuts.map((c) => (
                  <button
                    key={c}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCut(c);
                    }}
                    className={`px-2.5 py-1 rounded-sm text-[10px] font-semibold whitespace-nowrap transition-colors border ${
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
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                {product.cleaningOptions.map((c) => (
                  <button
                    key={c}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCleaning(c);
                    }}
                    className={`px-2.5 py-1 rounded-sm text-[10px] font-semibold whitespace-nowrap transition-colors border ${
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

          {/* Action Row */}
          <div className="pt-3 sm:pt-4 border-t border-[#E7E3DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mt-auto">
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] text-emerald-800 uppercase font-bold tracking-wider mb-1 flex items-center gap-1 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full w-fit">
                <DeliveryScootyIcon className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                {product.deliveryEstimate || "60m"}
              </span>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
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

            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="group relative inline-flex items-center justify-center w-full sm:w-auto h-9 sm:h-10 px-4 sm:px-6 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-[#FAF9F5] bg-[#1C1917] transition-all duration-500 cursor-pointer rounded-full overflow-hidden shadow-[0_5px_15px_-5px_rgba(28,25,23,0.3)] hover:shadow-[0_8px_20px_-5px_rgba(28,25,23,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <span className="absolute inset-0 w-full h-full bg-[#292524] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 
                {isOutOfStock ? "Sold Out" : "Add"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
