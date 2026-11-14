import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeOrderIdInput,
  normalizePhoneLast10,
  isValidTrackingPhone,
  normalizeOrderStatus,
  formatOrderStatusLabel,
  getOrderTrackingPipeline,
  sanitizeTrackingHref,
  formatTrackingDateTime,
} from './orderTracking.ts';

test('normalizeOrderIdInput trims whitespace, strips leading hashes, and uppercases IDs', () => {
  assert.equal(normalizeOrderIdInput('  #jy-12345  '), 'JY-12345');
  assert.equal(normalizeOrderIdInput('ord_abc99'), 'ORD_ABC99');
  assert.equal(normalizeOrderIdInput(''), '');
});

test('normalizePhoneLast10 extracts last 10 digits safely', () => {
  assert.equal(normalizePhoneLast10('+91 98765-43210'), '9876543210');
  assert.equal(normalizePhoneLast10('09876543210'), '9876543210');
  assert.equal(normalizePhoneLast10('98765 43210'), '9876543210');
  assert.equal(isValidTrackingPhone('+91 9876543210'), true);
  assert.equal(isValidTrackingPhone('12345'), false);
});

test('sanitizeTrackingHref permits only http/https tracking links', () => {
  assert.equal(sanitizeTrackingHref('https://track.delhivery.com/123'), 'https://track.delhivery.com/123');
  assert.equal(sanitizeTrackingHref('javascript:alert(1)'), null);
  assert.equal(sanitizeTrackingHref('data:text/html,xss'), null);
  assert.equal(sanitizeTrackingHref(''), null);
});

test('getOrderTrackingPipeline maps order statuses across 6 stages and terminal states', () => {
  assert.equal(getOrderTrackingPipeline('pending').currentIndex, 0);
  assert.equal(getOrderTrackingPipeline('confirmed').currentIndex, 1);
  assert.equal(getOrderTrackingPipeline('packing').currentIndex, 2);
  assert.equal(getOrderTrackingPipeline('shipped').currentIndex, 3);
  assert.equal(getOrderTrackingPipeline('out_for_delivery').currentIndex, 4);
  assert.equal(getOrderTrackingPipeline('delivered').currentIndex, 5);
  assert.equal(getOrderTrackingPipeline('delivered').progressPercent, 100);
  assert.equal(getOrderTrackingPipeline('cancelled').isTerminalNegative, true);
  assert.equal(getOrderTrackingPipeline('refunded').isTerminalNegative, true);
  assert.equal(normalizeOrderStatus('awaiting_whatsapp_confirmation'), 'whatsapp_pending');
  assert.equal(formatOrderStatusLabel('out_for_delivery'), 'Out for Delivery');
  assert.ok(formatTrackingDateTime('2026-11-13T10:00:00Z').length > 0);
});
