import test from "node:test";
import assert from "node:assert/strict";
import { computeAnchoredPrice } from "./priceAnchoring";

test("preserves existing selling price and generates a strictly higher scratched MRP when autoAnchor is true", () => {
  const res = computeAnchoredPrice({
    sellingPrice: 180,
    autoAnchor: true,
    seedKey: "f_apple_washington",
  });
  assert.equal(res.sellingPrice, 180);
  assert.ok(res.strikethroughPrice !== null && res.strikethroughPrice > 180);
  assert.equal(res.savingsAmount, res.strikethroughPrice - 180);
  assert.ok(res.savingsPercent >= 15 && res.savingsPercent <= 35);
});

test("honors explicit originalAmount when provided", () => {
  const res = computeAnchoredPrice({
    sellingPrice: 2200,
    explicitOriginal: 2650,
    autoAnchor: true,
  });
  assert.equal(res.sellingPrice, 2200);
  assert.equal(res.strikethroughPrice, 2650);
  assert.equal(res.savingsAmount, 450);
});

test("scales proportionally when weight option changes", () => {
  const halfKg = computeAnchoredPrice({
    sellingPrice: 120,
    autoAnchor: true,
    seedKey: "f_kiwi",
  });
  const oneKg = computeAnchoredPrice({
    sellingPrice: 240,
    autoAnchor: true,
    seedKey: "f_kiwi",
  });
  assert.equal(halfKg.sellingPrice, 120);
  assert.equal(oneKg.sellingPrice, 240);
  assert.ok((oneKg.strikethroughPrice ?? 0) > (halfKg.strikethroughPrice ?? 0));
});
