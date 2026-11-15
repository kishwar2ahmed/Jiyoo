import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCheckoutTotals, countUniqueActivePincodes } from './checkoutTotals';
import { DEFAULT_RETAIL_AREAS } from '../constants/deliveryAreas';

test('computeCheckoutTotals returns zero fee and zero total for empty cart', () => {
  const res = computeCheckoutTotals({
    subtotal: 0,
    discountAmount: 50,
    isWholesaleOrder: false,
    hasItems: false,
    pincodeServiceable: true,
    overrideFee: null,
    defaultDeliveryFee: 40,
    freeDeliveryThreshold: 500,
  });
  assert.deepEqual(res, {
    subtotal: 0,
    discountAmount: 0,
    discountedSubtotal: 0,
    deliveryFee: 0,
    grandTotal: 0,
  });
});

test('computeCheckoutTotals caps discount at subtotal and evaluates free delivery threshold before discount', () => {
  const withDiscountUnderThresholdBeforeDiscount = computeCheckoutTotals({
    subtotal: 400,
    discountAmount: 40,
    isWholesaleOrder: false,
    hasItems: true,
    pincodeServiceable: true,
    overrideFee: null,
    defaultDeliveryFee: 40,
    freeDeliveryThreshold: 500,
  });
  assert.equal(withDiscountUnderThresholdBeforeDiscount.discountedSubtotal, 360);
  assert.equal(withDiscountUnderThresholdBeforeDiscount.deliveryFee, 40);
  assert.equal(withDiscountUnderThresholdBeforeDiscount.grandTotal, 400);

  // Subtotal 520 >= threshold 500 earns free delivery even if discount lowers payable to 468
  const freeDeliveryKeptAfterDiscount = computeCheckoutTotals({
    subtotal: 520,
    discountAmount: 52,
    isWholesaleOrder: false,
    hasItems: true,
    pincodeServiceable: true,
    overrideFee: null,
    defaultDeliveryFee: 40,
    freeDeliveryThreshold: 500,
  });
  assert.equal(freeDeliveryKeptAfterDiscount.discountedSubtotal, 468);
  assert.equal(freeDeliveryKeptAfterDiscount.deliveryFee, 0);
  assert.equal(freeDeliveryKeptAfterDiscount.grandTotal, 468);

  // Discount cannot exceed subtotal
  const capped = computeCheckoutTotals({
    subtotal: 120,
    discountAmount: 200,
    isWholesaleOrder: false,
    hasItems: true,
    pincodeServiceable: true,
    overrideFee: null,
    defaultDeliveryFee: 40,
    freeDeliveryThreshold: 0,
  });
  assert.equal(capped.discountAmount, 120);
  assert.equal(capped.discountedSubtotal, 0);
  assert.equal(capped.grandTotal, 40);
});

test('computeCheckoutTotals applies pincode fee overrides and wholesale zero default shipping', () => {
  const wholesaleDefault = computeCheckoutTotals({
    subtotal: 2500,
    discountAmount: 250,
    isWholesaleOrder: true,
    hasItems: true,
    pincodeServiceable: true,
    overrideFee: null,
    defaultDeliveryFee: 40,
    freeDeliveryThreshold: 500,
  });
  assert.equal(wholesaleDefault.deliveryFee, 0);
  assert.equal(wholesaleDefault.grandTotal, 2250);

  const retailOverride = computeCheckoutTotals({
    subtotal: 300,
    discountAmount: 30,
    isWholesaleOrder: false,
    hasItems: true,
    pincodeServiceable: true,
    overrideFee: 25,
    defaultDeliveryFee: 40,
    freeDeliveryThreshold: 500,
  });
  assert.equal(retailOverride.deliveryFee, 25);
  assert.equal(retailOverride.grandTotal, 295);
});

test('countUniqueActivePincodes counts unique enabled 6-digit pincodes across areas', () => {
  assert.equal(countUniqueActivePincodes(DEFAULT_RETAIL_AREAS), 5);
  assert.equal(
    countUniqueActivePincodes([
      ...DEFAULT_RETAIL_AREAS,
      { id: 'x1', slNo: 14, areaName: 'Indiranagar', pincode: '560038', displayPincode: '560038', enabled: true },
      { id: 'x2', slNo: 15, areaName: 'Disabled Area', pincode: '560001', displayPincode: '560001', enabled: false },
    ]),
    6
  );
});
