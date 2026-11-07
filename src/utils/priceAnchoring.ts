/**
 * Retail Price Anchoring & Reference Price Engine
 *
 * Implements behavioral price-anchoring (Kahneman & Tversky Reference Price Effect)
 * for retail catalog items:
 *  - Always keeps the existing selling price 100% unchanged.
 *  - Computes a higher scratched-out reference / MRP price when an explicit
 *    original price or discount is not already provided, so every retail product
 *    visibly displays a scratched-out higher price alongside the existing price.
 */

export interface AnchoredPriceResult {
  /** The actual selling price (always preserved unchanged) */
  sellingPrice: number;
  /** The higher reference / MRP price to display with a scratch/strikethrough */
  strikethroughPrice: number | null;
  /** Exact rupee savings (strikethroughPrice - sellingPrice) */
  savingsAmount: number;
  /** Percentage saved relative to strikethroughPrice (e.g. 22 for 22% OFF) */
  savingsPercent: number;
}

export function parseNumericPrice(val: number | string | undefined | null): number {
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Generates a deterministic small integer offset (0..3) from a seed string or number
 * so different products have natural-looking discount percentages (e.g. 18%–27% off)
 * rather than an artificial identical percentage on every card.
 */
function deterministicBucket(seedKey?: string | number, fallbackNum = 0): number {
  const str = seedKey !== undefined && seedKey !== null ? String(seedKey) : String(fallbackNum);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 4;
}

/**
 * Rounds a raw computed MRP to a realistic Indian retail tag number
 * (multiples of 5 or 10) strictly greater than sellingPrice.
 */
function roundToNaturalRetailMrp(rawMrp: number, sellingPrice: number): number {
  if (sellingPrice <= 0) return 0;
  let rounded: number;
  if (sellingPrice < 60) {
    rounded = Math.ceil(rawMrp / 5) * 5;
  } else if (sellingPrice < 400) {
    rounded = Math.ceil(rawMrp / 5) * 5;
  } else {
    rounded = Math.ceil(rawMrp / 10) * 10;
  }
  if (rounded <= sellingPrice) {
    rounded = sellingPrice + (sellingPrice < 100 ? 15 : 30);
  }
  return rounded;
}

export function computeAnchoredPrice(options: {
  sellingPrice: number | string;
  explicitOriginal?: number | string | null;
  explicitDiscountPercent?: number | null;
  autoAnchor?: boolean;
  seedKey?: string | number;
}): AnchoredPriceResult {
  const sellingPrice = parseNumericPrice(options.sellingPrice);
  if (sellingPrice <= 0) {
    return {
      sellingPrice: 0,
      strikethroughPrice: null,
      savingsAmount: 0,
      savingsPercent: 0,
    };
  }

  // 1. Honor explicit originalAmount if provided and strictly greater than sellingPrice
  if (options.explicitOriginal !== undefined && options.explicitOriginal !== null) {
    const parsedOrig = parseNumericPrice(options.explicitOriginal);
    if (parsedOrig > sellingPrice) {
      const savingsAmount = Math.round(parsedOrig - sellingPrice);
      const savingsPercent = Math.max(1, Math.round((savingsAmount / parsedOrig) * 100));
      return {
        sellingPrice,
        strikethroughPrice: parsedOrig,
        savingsAmount,
        savingsPercent,
      };
    }
  }

  // 2. Honor explicit discountPercent if provided (1..95)
  if (
    typeof options.explicitDiscountPercent === "number" &&
    options.explicitDiscountPercent > 0 &&
    options.explicitDiscountPercent < 95
  ) {
    const computed = Math.round(sellingPrice / (1 - options.explicitDiscountPercent / 100));
    if (computed > sellingPrice) {
      const savingsAmount = computed - sellingPrice;
      return {
        sellingPrice,
        strikethroughPrice: computed,
        savingsAmount,
        savingsPercent: Math.round(options.explicitDiscountPercent),
      };
    }
  }

  // 3. Automatic retail FOMO price anchoring when enabled
  if (options.autoAnchor) {
    const bucket = deterministicBucket(options.seedKey, sellingPrice);
    // Markup ratios corresponding to ~18%, ~21%, ~24%, ~27% off MRP
    const markupMultipliers = [1.22, 1.26, 1.31, 1.36];
    const multiplier = markupMultipliers[bucket];
    const rawMrp = sellingPrice * multiplier;
    const strikethroughPrice = roundToNaturalRetailMrp(rawMrp, sellingPrice);
    const savingsAmount = strikethroughPrice - sellingPrice;
    const savingsPercent = Math.max(1, Math.round((savingsAmount / strikethroughPrice) * 100));

    return {
      sellingPrice,
      strikethroughPrice,
      savingsAmount,
      savingsPercent,
    };
  }

  return {
    sellingPrice,
    strikethroughPrice: null,
    savingsAmount: 0,
    savingsPercent: 0,
  };
}
