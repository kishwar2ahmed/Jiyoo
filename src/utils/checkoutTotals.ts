import type { RetailAreaItem } from '../constants/deliveryAreas';

export interface CheckoutTotalsInput {
  subtotal: number;
  discountAmount?: number;
  isWholesaleOrder: boolean;
  hasItems: boolean;
  pincodeServiceable: boolean | null;
  overrideFee: number | null;
  defaultDeliveryFee: number;
  freeDeliveryThreshold: number;
}

export interface CheckoutTotalsResult {
  subtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  deliveryFee: number;
  grandTotal: number;
}

/**
 * Computes client checkout totals identically to the server endpoints
 * (`/api/orders/create`, `/api/razorpay/order`, `/api/whatsapp/prepare-order`).
 * Free delivery thresholds are evaluated against pre-discount `subtotal`.
 */
export function computeCheckoutTotals(input: CheckoutTotalsInput): CheckoutTotalsResult {
  const safeSubtotal = Math.max(0, Number(input.subtotal) || 0);
  const safeDiscount = Math.min(
    safeSubtotal,
    Math.max(0, Math.round((Number(input.discountAmount) || 0) * 100) / 100)
  );
  const discountedSubtotal = Math.round(Math.max(0, safeSubtotal - safeDiscount) * 100) / 100;

  if (!input.hasItems) {
    return {
      subtotal: safeSubtotal,
      discountAmount: safeDiscount,
      discountedSubtotal,
      deliveryFee: 0,
      grandTotal: 0,
    };
  }

  const baseDeliveryFee =
    input.pincodeServiceable && input.overrideFee !== null
      ? Math.max(0, Number(input.overrideFee) || 0)
      : Math.max(0, Number(input.defaultDeliveryFee) || 0);

  let deliveryFee: number;
  if (input.isWholesaleOrder) {
    deliveryFee =
      input.pincodeServiceable && input.overrideFee !== null
        ? Math.max(0, Number(input.overrideFee) || 0)
        : 0;
  } else if (input.freeDeliveryThreshold > 0 && safeSubtotal >= input.freeDeliveryThreshold) {
    deliveryFee = 0;
  } else {
    deliveryFee = baseDeliveryFee;
  }

  const grandTotal = Math.round(Math.max(0, discountedSubtotal + deliveryFee) * 100) / 100;

  return {
    subtotal: safeSubtotal,
    discountAmount: safeDiscount,
    discountedSubtotal,
    deliveryFee,
    grandTotal,
  };
}

export function countUniqueActivePincodes(retailAreas: RetailAreaItem[]): number {
  const unique = new Set<string>();
  for (const area of retailAreas) {
    if (area && area.enabled !== false && area.pincode) {
      unique.add(String(area.pincode).trim());
    }
  }
  return unique.size;
}
