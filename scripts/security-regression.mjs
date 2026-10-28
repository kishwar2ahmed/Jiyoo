import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const server = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'storage.rules'), 'utf8');
const firestoreRules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
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
  ['Storage restricts user private documents to owner and admin', rules.includes("allow read, delete: if isOwner(userId) || isAdmin();")],
  ['Admin uploader allows only safe image formats', uploader.includes("['image/jpeg', 'image/png', 'image/webp']")],
  ['Profile uploader rejects active-content image formats', account.includes("const allowedProfileTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);")],
  ['WhatsApp flow has no customer self-attestation', !/I paid|Yes, I sent|Did you send the message|No, Cancel Order/.test(cart) && cart.includes('Order Reference Created') && cart.includes('Open WhatsApp')],
  ['Razorpay idempotency claim is atomic before reservation', server.includes('async function claimRazorpayIdempotency') && server.includes('await claimRazorpayIdempotency(getFirestore(), `idem_${idempotencyHash}`, requestHash)') && server.indexOf('await claimRazorpayIdempotency(getFirestore(), `idem_${idempotencyHash}`, requestHash)') < server.indexOf('await reserveInventory(getFirestore(), reservationId, userId, safeItems, reservationExpiresAtMs)')],
  ['Account deletion chunks Firestore writes below batch limit', server.includes('async function commitInBatches(') && server.includes('await commitInBatches(db, ordersSnap.docs') && server.includes('await commitInBatches(db, reviewsSnap.docs')],
  ['Git ignores environment secrets', fs.readFileSync(path.join(root, '.gitignore'), 'utf8').includes('.env')],
  ['Zero-secret .env.example template exists', fs.existsSync(path.join(root, '.env.example')) && !/RAZORPAY_KEY_SECRET=\S+/.test(fs.readFileSync(path.join(root, '.env.example'), 'utf8'))],
  ['Session logout revokes Firebase refresh tokens server-side', server.includes('await getAuth().revokeRefreshTokens(decodedClaims.sub)')],
  ['Cron reconciliation uses constant-time token comparison and rate limiting', server.includes("app.get('/api/cron/reconcile', strictApiLimiter") && server.includes('crypto.timingSafeEqual(providedDigest, expectedDigest)')],
  ['WhatsApp status transition runs in a Firestore transaction with strict ownership and reservation finalization', server.includes('await finalizeInventoryReservation(db, txResult.reservationId)') && !server.includes("orderData.userId !== 'guest'")],
  ['Order tracking unifies session/bearer auth and minimizes unauthenticated PII exposure', server.includes('authorizedByOwnerOrAdmin') && server.includes('maskedAddress')],
  ['Delivery pincode lookup and account deletion are rate-limited', server.includes("app.get('/api/delivery/check-pincode', trackOrderLimiter") && server.includes("app.post('/api/account/delete', strictApiLimiter, requireAuth")],
  ['Static uploads and image endpoint enforce nosniff and sandbox CSP', server.includes("res.setHeader('Content-Security-Policy', \"default-src 'none'; sandbox\")") && server.includes("res.set('Content-Security-Policy', \"default-src 'none'; sandbox\")")],
  ['Webhook preserves raw request body for cryptographic signature verification', server.includes("(req as any).rawBody = buf.toString('utf8');")],
  ['Webhook signature verified using constant-time comparison', server.includes("safeEqualHex(signature, expectedSignature)") && server.includes("crypto.timingSafeEqual")],
  ['Webhook enforces freshness window against replay attacks', server.includes("timeDiff < -5 || timeDiff > 300")],
  ['Payment verification confirms captured INR status and paise amount match', server.includes("paymentStatus != 'captured'") && server.includes("expectedAmount = Math.round(Number(pending.amount || 0) * 100)")],
  ['Webhook event processing is transactionally deduplicated', server.includes("db.collection('razorpayWebhookEvents').doc(eventId)") && server.includes("db.runTransaction(async tx => {")],
  ['Firestore rules deny direct client order creation', firestoreRules.includes("match /orders/{orderId}") && firestoreRules.includes("allow create: if false;")],
  ['Firestore rules deny client access to internal payment snapshots and webhook records', firestoreRules.includes("match /razorpayPendingOrders/{orderId}") && firestoreRules.includes("match /razorpayWebhookEvents/{eventId}")],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
  if (!ok) failed++;
}
console.log(`Executed ${checks.length} security regression checks (${checks.length - failed} passed, ${failed} failed).`);
process.exitCode = failed ? 1 : 0;
