import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { computeAnchoredPrice } from "../../../utils/priceAnchoring";

export interface PriceDisplayProps {
  amount: number | string;
  originalAmount?: number | string;
  discountPercent?: number;
  /** When true, automatically generates a higher reference MRP to scratch out if none is explicitly set */
  autoAnchor?: boolean;
  /** Seed key (e.g. product.id) for deterministic reference price calculation */
  seedKey?: string | number;
  currency?: string;
  size?: "xs" | "sm" | "base" | "md" | "lg" | "xl" | "2xl" | "3xl";
  weight?: "semibold" | "bold" | "extrabold";
  isDark?: boolean;
  animated?: boolean;
  unit?: string;
  suffix?: string;
  className?: string;
  numberClassName?: string;
  strikethroughClassName?: string;
}

export const PriceDisplay = React.memo(function PriceDisplay({
  amount,
  originalAmount,
  discountPercent,
  autoAnchor = false,
  seedKey,
  currency = "₹",
  size = "md",
  weight = "extrabold",
  isDark = false,
  animated = false,
  unit,
  suffix,
  className = "",
  numberClassName = "",
  strikethroughClassName = "",
}: PriceDisplayProps) {
  const { sellingPrice: numericVal, strikethroughPrice: strikethroughVal } =
    computeAnchoredPrice({
      sellingPrice: amount,
      explicitOriginal: originalAmount,
      explicitDiscountPercent: discountPercent,
      autoAnchor,
      seedKey,
    });

  // Format with Indian locale for thousands (e.g. 1,250 or 25,000)
  const formattedNumber =
    numericVal >= 1000
      ? numericVal.toLocaleString("en-IN")
      : String(numericVal);

  const formattedStrikethrough =
    strikethroughVal !== null
      ? strikethroughVal >= 1000
        ? strikethroughVal.toLocaleString("en-IN")
        : String(strikethroughVal)
      : null;

  // Size specifications: font size, currency size, baseline alignment
  const sizeMap = {
    xs: {
      wrapper: "text-xs",
      currency: "text-[10px]",
      value: "text-xs",
      strikethrough: "text-[10.5px]",
      unit: "text-[9.5px]",
    },
    sm: {
      wrapper: "text-sm",
      currency: "text-xs",
      value: "text-sm",
      strikethrough: "text-[11.5px]",
      unit: "text-[10.5px]",
    },
    base: {
      wrapper: "text-base",
      currency: "text-xs sm:text-sm",
      value: "text-sm sm:text-base",
      strikethrough: "text-xs",
      unit: "text-xs",
    },
    md: {
      wrapper: "text-base sm:text-lg",
      currency: "text-xs sm:text-sm",
      value: "text-base sm:text-lg",
      strikethrough: "text-xs sm:text-[13px]",
      unit: "text-xs",
    },
    lg: {
      wrapper: "text-lg sm:text-xl",
      currency: "text-sm sm:text-base",
      value: "text-lg sm:text-xl",
      strikethrough: "text-xs sm:text-sm",
      unit: "text-xs sm:text-sm",
    },
    xl: {
      wrapper: "text-xl sm:text-2xl",
      currency: "text-base sm:text-lg",
      value: "text-xl sm:text-2xl",
      strikethrough: "text-sm",
      unit: "text-xs sm:text-sm",
    },
    "2xl": {
      wrapper: "text-2xl sm:text-3xl",
      currency: "text-lg sm:text-xl",
      value: "text-2xl sm:text-3xl",
      strikethrough: "text-sm sm:text-base",
      unit: "text-xs sm:text-sm",
    },
    "3xl": {
      wrapper: "text-3xl sm:text-4xl",
      currency: "text-xl sm:text-2xl",
      value: "text-3xl sm:text-4xl",
      strikethrough: "text-base sm:text-lg",
      unit: "text-sm",
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const weightClass =
    weight === "extrabold"
      ? "font-extrabold"
      : weight === "bold"
        ? "font-bold"
        : "font-semibold";

  const textColor = isDark ? "text-[#FAF9F5]" : "text-[#0C0A09]";
  const currencyColor = isDark ? "text-[#E5C99B]" : "text-[#292524]";
  const strikethroughColor = isDark ? "text-[#A8A29E]" : "text-[#78716C]";
  const unitColor = isDark ? "text-[#D6D1C7]" : "text-[#78716C]";

  return (
    <div
      aria-label={`Price: ${currency}${numericVal}${formattedStrikethrough ? `, originally ${currency}${formattedStrikethrough}` : ""}${unit ? ` per ${unit}` : ""}`}
      className={`inline-flex items-baseline flex-wrap gap-x-1.5 font-price-luxury tabular-nums select-none ${currentSize.wrapper} ${className}`}
    >
      {/* Scratched-Out High Reference Price (Displayed First or Beside for Anchor Effect) */}
      {formattedStrikethrough && (
        <span
          aria-label={`Original price: ${currency}${strikethroughVal}`}
          className={`relative inline-flex items-baseline ${currentSize.strikethrough} ${strikethroughColor} font-semibold px-0.5 ${strikethroughClassName}`}
        >
          <span className="text-[0.88em] mr-[1px]">{currency}</span>
          <span>{formattedStrikethrough}</span>
          {/* Crisp Diagonal Crimson-Bronze Scratch Line */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-[-2px] right-[-2px] top-1/2 h-[1.6px] -translate-y-1/2 -rotate-[11deg] rounded-full bg-[#B91C1C]/85 shadow-[0_0_2px_rgba(255,255,255,0.6)]"
          />
        </span>
      )}

      {/* Existing Selling Price (Bold & Prominent) */}
      <span className="inline-flex items-baseline overflow-hidden">
        <span
          aria-hidden="true"
          className={`price-currency-glyph ${currentSize.currency} ${currencyColor} font-bold select-none`}
        >
          {currency}
        </span>

        {animated ? (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`price-val-${numericVal}`}
              initial={{ y: 9, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -9, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={`inline-block ${currentSize.value} ${weightClass} ${textColor} tracking-tight ${numberClassName}`}
            >
              {formattedNumber}
            </motion.span>
          </AnimatePresence>
        ) : (
          <span
            className={`inline-block ${currentSize.value} ${weightClass} ${textColor} tracking-tight ${numberClassName}`}
          >
            {formattedNumber}
          </span>
        )}
      </span>

      {/* Suffix (e.g. "each") */}
      {suffix && (
        <span className={`text-[0.8em] font-medium ${unitColor}`}>
          {suffix}
        </span>
      )}

      {/* Unit specification (e.g. "/ 500g") */}
      {unit && (
        <span className={`${currentSize.unit} font-medium ${unitColor}`}>
          / {unit}
        </span>
      )}
    </div>
  );
});
