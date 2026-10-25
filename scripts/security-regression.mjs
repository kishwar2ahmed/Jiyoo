import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const server = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'storage.rules'), 'utf8');
const uploader = fs.readFileSync(path.join(root, 'src/features/admin/hooks/useImageUploader.ts'), 'utf8');
const account = fs.readFileSync(path.join(root, 'src/features/auth/components/AccountCenter.tsx'), 'utf8');
const cart = fs.readFileSync(path.join(root, 'src/features/cart/components/CartModal.tsx'), 'utf8');

const checks = [
  ['Checkout rejects unsupported payment methods', server.includes("new Set(['Cash on Delivery', 'WhatsApp Express'])") && !server.includes("const allowedPaymentMethods = new Set(['Cash on Delivery', 'WhatsApp Express', 'Online Payment (UPI QR)'])")],
  ['Razorpay idempotency is checked before inventory reservation', server.indexOf('Resolve an existing idempotent checkout BEFORE reserving inventory') < server.indexOf('await reserveInventory(getFirestore(), reservationId, userId, safeItems, reservationExpiresAtMs);')],
  ['5xx JSON responses hide raw internal error text', server.includes("res.statusCode >= 500 ? 'Internal server error. Please try again later.'")],
  ['Inventory rollback removes stale order idempotency record', server.includes("Failed to remove stale order idempotency record")],
  ['WhatsApp status update requires authentication', /app\.post\('\/api\/orders\/:id\/whatsapp-status', trackOrderLimiter, requireAuth/.test(server)],
  ['Storage disallows SVG/GIF uploads', rules.includes("image/(jpeg|png|webp)")],
  ['Admin uploader allows only safe image formats', uploader.includes("['image/jpeg', 'image/png', 'image/webp']")],
  ['Profile uploader rejects active-content image formats', account.includes("const allowedProfileTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);")],
  ['WhatsApp flow has no customer self-attestation', !/I paid|Yes, I sent|Did you send the message|No, Cancel Order/.test(cart) && cart.includes('Order Reference Created') && cart.includes('Open WhatsApp')],
  ['Razorpay idempotency claim is atomic before reservation', server.includes('async function claimRazorpayIdempotency') && server.includes('await claimRazorpayIdempotency(getFirestore(), `idem_${idempotencyHash}`, requestHash)') && server.indexOf('await claimRazorpayIdempotency(getFirestore(), `idem_${idempotencyHash}`, requestHash)') < server.indexOf('await reserveInventory(getFirestore(), reservationId, userId, safeItems, reservationExpiresAtMs)')],
  ['Account deletion chunks Firestore writes below batch limit', server.includes('async function commitInBatches(') && server.includes('await commitInBatches(db, ordersSnap.docs') && server.includes('await commitInBatches(db, reviewsSnap.docs')],
  ['Git ignores environment secrets', fs.readFileSync(path.join(root, '.gitignore'), 'utf8').includes('.env')],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
  if (!ok) failed++;
}
process.exitCode = failed ? 1 : 0;
