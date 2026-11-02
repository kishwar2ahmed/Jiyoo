import React from "react";
import { motion, AnimatePresence } from "motion/react";

export interface PriceDisplayProps {
  amount: number | string;
  originalAmount?: number | string;
  discountPercent?: number;
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

/**
 * Extracts a clean finite number from numbers, string prices ("₹450", "450.00"), etc.
 */
function parsePrice(val: number | string | undefined | null): number {
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const PriceDisplay = React.memo(function PriceDisplay({
  amount,
  originalAmount,
  discountPercent,
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
  const numericVal = parsePrice(amount);

  // Calculate strikethrough original price if discount or originalAmount is provided
  let strikethroughVal: number | null = null;
  if (originalAmount !== undefined && originalAmount !== null) {
    const parsedOrig = parsePrice(originalAmount);
    if (parsedOrig > numericVal) {
      strikethroughVal = parsedOrig;
    }
  } else if (discountPercent && discountPercent > 0 && discountPercent < 100) {
    const computed = Math.round(numericVal / (1 - discountPercent / 100));
    if (computed > numericVal) {
      strikethroughVal = computed;
    }
  }

  // Format with Indian locale for thousands (e.g. 1,250 or 25,000)
  const formattedNumber = numericVal >= 1000
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
      strikethrough: "text-[10px]",
      unit: "text-[9.5px]",
    },
    sm: {
      wrapper: "text-sm",
      currency: "text-xs",
      value: "text-sm",
      strikethrough: "text-[11px]",
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
      strikethrough: "text-xs",
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
  const strikethroughColor = isDark ? "text-[#A8A29E]" : "text-[#8C827A]";
  const unitColor = isDark ? "text-[#D6D1C7]" : "text-[#78716C]";

  return (
    <div
      aria-label={`Price: ${currency}${numericVal}${unit ? ` per ${unit}` : ""}`}
      className={`inline-flex items-baseline font-price-luxury tabular-nums select-none ${currentSize.wrapper} ${className}`}
    >
      <span className="inline-flex items-baseline overflow-hidden">
        {/* Optical Currency Glyph */}
        <span
          aria-hidden="true"
          className={`price-currency-glyph ${currentSize.currency} ${currencyColor} font-bold select-none`}
        >
          {currency}
        </span>

        {/* Dynamic Number Value */}
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
        <span className={`ml-1 text-[0.8em] font-medium ${unitColor}`}>
          {suffix}
        </span>
      )}

      {/* Strikethrough Original MRP / Base Price */}
      {formattedStrikethrough && (
        <span
          aria-label={`Original price: ${currency}${strikethroughVal}`}
          className={`line-through ${currentSize.strikethrough} ${strikethroughColor} font-medium ml-1.5 opacity-80 ${strikethroughClassName}`}
        >
          <span className="text-[0.88em] mr-0.5">{currency}</span>
          {formattedStrikethrough}
        </span>
      )}

      {/* Unit specification (e.g. "/ 500g") */}
      {unit && (
        <span className={`ml-1 ${currentSize.unit} font-medium ${unitColor}`}>
          / {unit}
        </span>
      )}
    </div>
  );
});
