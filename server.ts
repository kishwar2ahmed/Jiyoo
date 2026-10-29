
process.on('uncaughtException', (err: any) => {
  // Never suppress infrastructure failures (including Firestore failures). An
  // uncaught exception can leave process state inconsistent; let the process
  // manager/platform restart it cleanly instead of serving unknown state.
  console.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  // Keep the process alive for isolated promise failures, but always surface
  // the real error. Route handlers are expected to catch request-level errors.
  console.error('UNHANDLED REJECTION (server stays up):', reason);
});
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import compression from 'compression';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import Razorpay from 'razorpay';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { PRODUCTS as BUNDLED_PRODUCTS } from './src/constants/data';
import {
  DEFAULT_RETAIL_AREAS,
  DEFAULT_RETAIL_PINCODES,
  DEFAULT_PAN_INDIA_WHOLESALE_ZONE,
  isValidIndianPincode,
} from './src/constants/deliveryAreas';


const envSchema = z.object({
  NODE_ENV: z.string().optional().default('development'),
  PORT: z.string().optional().default('3000'),
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  // One-time migration bootstrap only: comma-separated emails granted the
  // "admin" custom claim on boot (see syncAdminClaims()) if their Firebase
  // Auth account already exists and lacks it. requireAdmin() itself never
  // consults this list -- ongoing admin changes go through
  // POST /api/admin/users/:uid/role instead.
  ADMIN_SEED_EMAILS: z.string().optional().default(''),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().default('587'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

let env: z.infer<typeof envSchema>;
try {
  env = envSchema.parse(process.env);
} catch (err: any) {
  // Do not log full error object as it may contain partial API keys
  const issues = (err.issues || []).map((i: any) => i.path.join('.')).join(', ');
  console.error('CRITICAL: Invalid env vars:', issues);
  process.exit(1);
}

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountJson) {
      let parsedServiceAccount = null;
      try {
        parsedServiceAccount = JSON.parse(serviceAccountJson);
      } catch (e) {
        console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON, falling back to default initialization.');
      }
      
      if (parsedServiceAccount) {
        initializeApp({ credential: cert(parsedServiceAccount) });
      } else {
        initializeApp();
      }
    } else {
      initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

// One-time migration bootstrap: grants the "admin" custom claim to each
// email in ADMIN_SEED_EMAILS if their Firebase Auth account already exists
// and doesn't have it yet. This preserves already-legitimate administrators
// across the move from hardcoded emails to custom claims, without needing
// direct production access to run a one-off script. Safe to run on every
// boot -- it's a no-op once the claim is already set. Ongoing admin changes
// should go through POST /api/admin/users/:uid/role instead.
async function syncAdminClaims() {
  const seedEmails = env.ADMIN_SEED_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  for (const email of seedEmails) {
    try {
      const userRecord = await getAuth().getUserByEmail(email);
      if (userRecord.customClaims?.admin !== true) {
        await getAuth().setCustomUserClaims(userRecord.uid, { ...(userRecord.customClaims || {}), admin: true });
        console.log(`[Admin Bootstrap] Granted admin claim to ${email}`);
      }
      // Mirror onto the profile doc for display only -- never read back for
      // authorization decisions, only the custom claim above is trusted.
      await getFirestore().collection('users').doc(userRecord.uid).set({ role: 'admin' }, { merge: true });
    } catch (err: any) {
      console.warn(`[Admin Bootstrap] Could not sync admin claim for ${email}:`, err.message || err);
    }
  }
}
syncAdminClaims().catch((err) => console.warn('[Admin Bootstrap] Sync failed:', err));

// Bootstraps and synchronizes the catalog into Firestore so orders, inventory reservations,
// and COD checkouts operate against authentic database records rather than throwing missing-catalog errors.
async function syncCatalogToFirestore() {
  try {
    const db = getFirestore();
    const snap = await db.collection('products').get();
    const existingById = new Map<string, any>();
    snap.docs.forEach((d) => existingById.set(d.id, d.data()));

    const batch = db.batch();
    let updatedCount = 0;

    for (const p of BUNDLED_PRODUCTS) {
      const id = String(p.id);
      const existing = existingById.get(id);
      const docRef = db.collection('products').doc(id);
      const numPrice = Number(p.numericPrice) || parseFloat(String(p.price).replace(/[^0-9.]/g, '')) || 0;

      if (!existing) {
        batch.set(docRef, {
          ...p,
          id,
          name: p.name,
          category: p.category || 'General',
          categoryId: (p as any).categoryId || (p.category ? String(p.category).toLowerCase().replace(/\s+/g, '-') : 'general'),
          subcategoryId: (p as any).subcategoryId || null,
          subSubcategoryId: (p as any).subSubcategoryId || null,
          unit: (p as any).unit || '1 kg',
          price: p.price,
          numericPrice: numPrice,
          wholesalePrice: (p as any).wholesalePrice || numPrice,
          wholesaleEligible: true,
          stock: 100,
          reservedStock: 0,
          stockStatus: 'in_stock',
          description: p.description || '',
          image: p.image || '',
          weights: (p as any).weights || [],
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        updatedCount++;
      } else if (!existing.subcategoryId && (p as any).subcategoryId) {
        // Backfill missing subcategory hierarchy fields without overwriting admin edits
        batch.set(docRef, {
          subcategoryId: (p as any).subcategoryId,
          subSubcategoryId: existing.subSubcategoryId ?? (p as any).subSubcategoryId ?? null,
          categoryId: existing.categoryId || (p as any).categoryId,
          unit: existing.unit || (p as any).unit || '1 kg',
        }, { merge: true });
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`[Catalog Sync] Synchronized ${updatedCount} product records in Firestore.`);
    }
  } catch (err) {
    console.warn('[Catalog Sync] Firestore product sync skipped:', (err as any)?.message || err);
  }
}
syncCatalogToFirestore().catch((err) => console.warn('[Catalog Sync] Error:', err));

// Helper to dynamically obtain Razorpay instance
function getRazorpay() {
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    return new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return null;
}

// Constant-time comparison for HMAC signatures (Razorpay verify + webhook) --
// avoids leaking timing information that could help an attacker guess a
// valid signature byte-by-byte. timingSafeEqual requires equal-length
// buffers, so a length mismatch is treated as "not equal" up front.
function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false; // Reject malformed hex
  }
}

function getIdempotencyKey(req: express.Request): string | null {
  const raw = req.headers['idempotency-key'];
  const key = Array.isArray(raw) ? raw[0] : raw;
  if (!key) return null;
  const normalized = String(key).trim();
  if (normalized.length < 16 || normalized.length > 128) {
    throw new Error('Idempotency-Key must be between 16 and 128 characters.');
  }
  return normalized;
}

function hashIdempotencyKey(route: string, userId: string, key: string): string {
  return crypto.createHash('sha256').update(`${route}:${userId}:${key}`).digest('hex');
}

function requestBodyHash(body: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');
}

const RAZORPAY_IDEMPOTENCY_PROCESSING_TTL_MS = 30 * 60 * 1000;

/**
 * Atomically claims the deterministic Razorpay idempotency record before any
 * inventory reservation or gateway call. A plain read-then-write check is not
 * sufficient: two concurrent requests with the same key can both observe an
 * empty document and create duplicate reservations/orders.
 */
async function claimRazorpayIdempotency(
  db: FirebaseFirestore.Firestore,
  docId: string,
  requestHash: string,
): Promise<{ kind: 'claimed' | 'replay' | 'conflict' | 'in_progress'; razorpayOrder?: any }> {
  const ref = db.collection('razorpayPendingOrders').doc(docId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const existing = snap.data() as any;
      if (existing.requestHash && existing.requestHash !== requestHash) {
        return { kind: 'conflict' as const };
      }
      if (existing.razorpayOrder) {
        return { kind: 'replay' as const, razorpayOrder: existing.razorpayOrder };
      }

      const updatedAt = Date.parse(String(existing.updatedAt || existing.createdAt || ''));
      const stale = !Number.isFinite(updatedAt) || Date.now() - updatedAt >= RAZORPAY_IDEMPOTENCY_PROCESSING_TTL_MS;
      if (existing.status === 'processing' && !stale) {
        return { kind: 'in_progress' as const };
      }
    }

    tx.set(ref, {
      requestHash,
      status: 'processing',
      claimedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return { kind: 'claimed' as const };
  });
}

async function releaseRazorpayIdempotencyClaim(db: FirebaseFirestore.Firestore, docId: string, requestHash: string) {
  const ref = db.collection('razorpayPendingOrders').doc(docId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const existing = snap.data() as any;
    if (existing.requestHash === requestHash && !existing.razorpayOrder) tx.delete(ref);
  });
}

async function fetchRazorpayRefund(paymentId: string, amountPaise: number, idempotencyKey: string, orderId: string, actor: string) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw new Error('Razorpay is not configured on the server.');
  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      'X-Refund-Idempotency': idempotencyKey,
    },
    body: JSON.stringify({
      amount: amountPaise,
      notes: { orderId, refundedBy: actor },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.description || payload?.error?.reason || `Razorpay refund failed (${response.status})`;
    const error = new Error(message);
    (error as any).status = response.status;
    (error as any).razorpayPayload = payload;
    throw error;
  }
  return payload;
}

function normalizePhone(value: unknown): string {
  return String(value ?? '').trim().replace(/[^\d+]/g, '');
}

// Escapes user-supplied text before interpolating into HTML email templates.
function sanitizeHTML(str: any): string {
  if (typeof str !== 'string') return String(str || '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


function formatServerError(errorMsg: string): string {
  if (errorMsg.includes('What happened:') && errorMsg.includes('Why it happened:')) {
    return errorMsg;
  }
  
  let what = "A server operation failed.";
  let why = errorMsg || "Unknown server error.";
  let next = "Please try again or contact support if the problem persists.";

  const lowerMsg = errorMsg.toLowerCase();
  
  if (lowerMsg.includes(' auth ') || lowerMsg.includes('token') || lowerMsg.includes('admin') || lowerMsg.includes('unauthorized')) {
    what = "Authentication or permission denied.";
    why = errorMsg || "Your session may be invalid or you lack necessary permissions.";
    next = "Log out and log back in, or check your account permissions.";
  } else if (lowerMsg.includes('price') || lowerMsg.includes('inventory') || lowerMsg.includes('mismatch')) {
    what = "Order validation failed.";
    why = errorMsg;
    next = "Please clear your cart, refresh the page, and try again.";
  } else if (lowerMsg.includes('payment') || lowerMsg.includes('razorpay') || lowerMsg.includes('signature')) {
    what = "Payment processing failed.";
    why = errorMsg;
    next = "Try a different payment method or try again. If an amount was deducted, contact support with your payment reference and our team will process a refund.";
  } else if (lowerMsg.includes('payload') || lowerMsg.includes('missing') || lowerMsg.includes('invalid')) {
    what = "Invalid request format.";
    why = errorMsg;
    next = "Please check your inputs and try again.";
  }

  return `What happened: \n${what}\n\nWhy it happened: \n${why}\n\nWhat to do next: \n${next}`;
}

// Set up rate limiting

// Stricter rate limiting for sensitive/paid endpoints
const strictApiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // start blocking after 10 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests for this service, please try again after an hour' },
});

// Moderate rate limit for order creation
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 20, // start blocking after 20 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many order requests, please try again later' },
});

// Order tracking is reachable without auth (orderId + phone digits), so it needs its
// own tight limiter -- otherwise it's a brute-forceable lookup against the 4-digit
// random suffix in generateOrderId() for a known/guessed phone number.
const trackOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many order lookup attempts. Please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes' },
});



async function verifyRequestAuth(req: express.Request): Promise<any | null> {
  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  try {
    if (bearer) return await getAuth().verifyIdToken(bearer);
  } catch {
    // fall through to the secure session-cookie path
  }

  const session = (req as any).cookies?.session;
  if (session) {
    try {
      // Session cookies are issued by /api/sessionLogin and are verified by the
      // Firebase Admin SDK. checkRevoked=true makes server-side logout/revocation
      // enforceable for sensitive operations.
      return await getAuth().verifySessionCookie(session, true);
    } catch {
      return null;
    }
  }
  return null;
}

async function optionalAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  (req as any).authUser = await verifyRequestAuth(req);
  next();
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authUser = await verifyRequestAuth(req);
  if (!authUser) return res.status(401).json({ success: false, error: 'Authentication required' });
  (req as any).authUser = authUser;
  next();
}

async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Authoritative check: the server-controlled Firebase Auth custom claim on
  // the caller's verified ID token (granted only via the Admin SDK -- see
  // syncAdminClaims() and POST /api/admin/users/:uid/role). Never trusts a
  // Firestore "role" field, a client-supplied email, or anything else the
  // client controls.
  const authUser = (req as any).authUser;
  if (authUser?.admin === true) return next();
  res.status(403).json({ success: false, error: 'Admin only' });
}

// ENTERPRISE LOGIC: Strict transactional inventory locking
async function decrementInventory(items: any[]) {
  const db = getFirestore();
  const quantities = new Map<string, { quantity: number; name?: string }>();
  const resolveBaseId = (item: any) => {
    if (item.baseId) return String(item.baseId);
    const idStr = String(item.id);
    return idStr.includes('-') ? idStr.split('-')[0] : idStr;
  };

  for (const item of items) {
    const id = resolveBaseId(item);
    const qty = Number(item?.quantity || 0);
    if (!id || !Number.isInteger(qty) || qty <= 0) {
      throw new Error(`Invalid quantity for ${item?.name || item?.id || 'item'}.`);
    }
    const entry = quantities.get(id);
    quantities.set(id, { quantity: (entry?.quantity || 0) + qty, name: entry?.name || item?.name });
  }

  await db.runTransaction(async (transaction) => {
    const productDocs: Array<{ id: string; ref: FirebaseFirestore.DocumentReference; data: any; requestedQty: number; name?: string }> = [];
    for (const [id, meta] of quantities) {
      const productRef = db.collection('products').doc(id);
      const docSnap = await transaction.get(productRef);
      if (!docSnap.exists) {
        const bundled = BUNDLED_PRODUCTS.find((p) => String(p.id) === id);
        if (bundled) {
          const numPrice = Number(bundled.numericPrice) || parseFloat(String(bundled.price).replace(/[^0-9.]/g, '')) || 0;
          const initialProduct = {
            id: String(bundled.id),
            name: bundled.name,
            stock: 100,
            reservedStock: 0,
            numericPrice: numPrice,
            price: bundled.price,
            stockStatus: 'in_stock',
          };
          transaction.set(productRef, initialProduct);
          productDocs.push({ id, ref: productRef, data: initialProduct, requestedQty: meta.quantity, name: meta.name });
          continue;
        }
        throw new Error(`Product ${meta.name || id} is no longer available.`);
      }
      productDocs.push({ id, ref: productRef, data: docSnap.data(), requestedQty: meta.quantity, name: meta.name });
    }

    for (const product of productDocs) {
      if (typeof product.data.stock !== 'number') {
        throw new Error(`Product ${product.data.name || product.name || 'item'} has missing or invalid stock field. Cannot process order.`);
      }
      if (product.data.stock - Number(product.data.reservedStock || 0) - product.requestedQty < 0) {
        throw new Error(`Insufficient stock for ${product.data.name || product.name || 'item'}. Available: ${product.data.stock}, requested: ${product.requestedQty}.`);
      }
    }

    for (const product of productDocs) {
      transaction.update(product.ref, { stock: product.data.stock - product.requestedQty });
    }
  });
}


const INVENTORY_RESERVATION_TTL_MS = 10 * 60 * 1000;

function aggregateInventoryQuantities(items: any[]): Map<string, number> {
  const quantities = new Map<string, number>();
  const resolveBaseId = (item: any) => {
    if (item?.baseId) return String(item.baseId);
    const idStr = String(item?.id ?? '');
    return idStr.includes('-') ? idStr.split('-')[0] : idStr;
  };
  for (const item of items || []) {
    const id = resolveBaseId(item);
    const qty = Number(item?.quantity || 0);
    if (!id || !Number.isInteger(qty) || qty <= 0) throw new Error(`Invalid quantity for ${item?.name || item?.id || 'item'}.`);
    quantities.set(id, (quantities.get(id) || 0) + qty);
  }
  return quantities;
}

async function reserveInventory(
  db: FirebaseFirestore.Firestore,
  reservationId: string,
  userId: string,
  items: any[],
  expiresAtMs: number,
) {
  const quantities = aggregateInventoryQuantities(items);
  const reservationRef = db.collection('inventoryReservations').doc(reservationId);
  await db.runTransaction(async (tx) => {
    const productEntries: Array<{ ref: FirebaseFirestore.DocumentReference; stock: number; reserved: number; qty: number }> = [];
    for (const [id, qty] of quantities) {
      const ref = db.collection('products').doc(id);
      const snap = await tx.get(ref);
      let data = snap.data() as any;
      if (!snap.exists) {
        const bundled = BUNDLED_PRODUCTS.find((p) => String(p.id) === id);
        if (bundled) {
          const numPrice = Number(bundled.numericPrice) || parseFloat(String(bundled.price).replace(/[^0-9.]/g, '')) || 0;
          const initialProduct = {
            id: String(bundled.id),
            name: bundled.name,
            stock: 100,
            reservedStock: 0,
            numericPrice: numPrice,
            price: bundled.price,
            stockStatus: 'in_stock',
          };
          tx.set(ref, initialProduct);
          data = initialProduct;
        } else {
          throw new Error(`Product ${id} is no longer available.`);
        }
      }
      const stock = Number(data?.stock);
      const reserved = Number(data?.reservedStock || 0);
      if (!Number.isFinite(stock) || stock < 0) throw new Error(`Product ${data?.name || id} has invalid stock.`);
      if (stock - reserved < qty) throw new Error(`Insufficient available stock for ${data?.name || id}. Available: ${Math.max(0, stock-reserved)}.`);
      productEntries.push({ ref, stock, reserved, qty });
    }
    for (const entry of productEntries) {
      tx.update(entry.ref, { reservedStock: entry.reserved + entry.qty });
    }
    tx.create(reservationRef, {
      reservationId,
      userId,
      items,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
    });
  });
}

async function finalizeInventoryReservation(db: FirebaseFirestore.Firestore, reservationId: string) {
  const reservationRef = db.collection('inventoryReservations').doc(reservationId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(reservationRef);
    if (!snap.exists) return;
    const reservation = snap.data() as any;
    if (reservation.status === 'finalized') return;
    if (reservation.status !== 'active') throw new Error(`Inventory reservation ${reservationId} is no longer active; manual reconciliation/refund required.`);
    const quantities = aggregateInventoryQuantities(Array.isArray(reservation.items) ? reservation.items : []);
    const entries: Array<{ref: FirebaseFirestore.DocumentReference; stock:number; reserved:number; qty:number}> = [];
    for (const [id, qty] of quantities) {
      const ref = db.collection('products').doc(id);
      const ps = await tx.get(ref);
      if (!ps.exists) throw new Error(`Product ${id} no longer exists; inventory reconciliation required.`);
      const d = ps.data() as any;
      const stock = Number(d?.stock);
      const reserved = Number(d?.reservedStock || 0);
      if (reserved < qty) throw new Error(`Reservation balance missing for product ${id}.`);
      if (stock < qty) throw new Error(`Insufficient physical stock while finalizing reservation for ${id}.`);
      entries.push({ref, stock, reserved, qty});
    }
    for (const e of entries) tx.update(e.ref, { stock: e.stock - e.qty, reservedStock: Math.max(0, e.reserved - e.qty) });
    tx.update(reservationRef, { status:'finalized', finalizedAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
  });
}

async function releaseInventoryReservation(db: FirebaseFirestore.Firestore, reservationId: string, reason = 'released') {
  const reservationRef = db.collection('inventoryReservations').doc(reservationId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(reservationRef);
    if (!snap.exists) return;
    const reservation = snap.data() as any;
    if (reservation.status !== 'active') return;
    const quantities = aggregateInventoryQuantities(Array.isArray(reservation.items) ? reservation.items : []);
    const refs = [...quantities.keys()].map(id => db.collection('products').doc(id));
    const snaps = await Promise.all(refs.map(ref => tx.get(ref)));
    snaps.forEach((ps, i) => {
      if (!ps.exists) return;
      const currentReserved = Number(ps.data()?.reservedStock || 0);
      const qty = quantities.get(refs[i].id) || 0;
      tx.update(refs[i], { reservedStock: Math.max(0, currentReserved - qty) });
    });
    tx.update(reservationRef, { status:'released', releaseReason:reason, releasedAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
  });
}

async function releaseExpiredInventoryReservations(db: FirebaseFirestore.Firestore) {
  const nowIso = new Date().toISOString();
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  while (true) {
    let q: FirebaseFirestore.Query = db.collection('inventoryReservations')
      .where('status', '==', 'active')
      .where('expiresAt', '<=', nowIso)
      .orderBy('expiresAt', 'asc');
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.limit(100).get();
    if (snap.empty) break;
    for (const docSnap of snap.docs) {
      try { await releaseInventoryReservation(db, docSnap.id, 'expired'); }
      catch (err) { console.error('[Inventory] Failed to release expired reservation', docSnap.id, err); }
    }
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < 100) break;
  }
}

async function cleanupExpiredWhatsAppOrders(db: FirebaseFirestore.Firestore) {
  const nowIso = new Date().toISOString();
  for (const statusVal of ['whatsapp_pending', 'AWAITING_WHATSAPP_CONFIRMATION']) {
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    while (true) {
      let q: FirebaseFirestore.Query = db.collection('orders')
        .where('orderStatus', '==', statusVal)
        .where('whatsappExpiresAt', '<=', nowIso)
        .orderBy('whatsappExpiresAt', 'asc');
      if (cursor) q = q.startAfter(cursor);
      const snap = await q.limit(100).get();
      if (snap.empty) break;
      for (const docSnap of snap.docs) {
        try {
          const ref = docSnap.ref;
          const result = await cancelOrderAtomically(db, ref, 'WhatsApp order expired without confirmation.');
          if (result.reservationId) await releaseInventoryReservation(db, result.reservationId, 'whatsapp_expired');
        } catch (err) {
          console.error('[WhatsApp] Failed to expire order', docSnap.id, err);
        }
      }
      cursor = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < 100) break;
    }
  }
}

async function restoreInventoryForRefundOnce(db: FirebaseFirestore.Firestore, orderRef: FirebaseFirestore.DocumentReference, refundId: string, items: any[]) {
  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new Error('ORDER_NOT_FOUND');
    const order = orderSnap.data() as any;
    if (order.inventoryRestored === true) return;
    if (order.inventoryRestoreOperationId && order.inventoryRestoreOperationId !== refundId) {
      throw new Error('INVENTORY_RESTORE_ALREADY_CLAIMED');
    }
    const quantities = new Map<string, number>();
    for (const item of Array.isArray(items) ? items : []) {
      const id = item?.baseId ? String(item.baseId) : (String(item?.id || '').includes('-') ? String(item.id).split('-')[0] : String(item?.id || ''));
      const qty = Number(item?.quantity || 0);
      if (id && Number.isInteger(qty) && qty > 0) quantities.set(id, (quantities.get(id) || 0) + qty);
    }
    const refs = [...quantities.keys()].map(id => db.collection('products').doc(id));
    const snaps = await Promise.all(refs.map(ref => tx.get(ref)));
    snaps.forEach((snap, index) => {
      if (!snap.exists) throw new Error(`REFUND_INVENTORY_PRODUCT_MISSING:${refs[index].id}`);
      const stock = Number(snap.data()?.stock);
      const qty = quantities.get(refs[index].id) || 0;
      if (!Number.isFinite(stock) || stock < 0 || qty <= 0) throw new Error(`REFUND_INVENTORY_INVALID:${refs[index].id}`);
      tx.update(refs[index], { stock: stock + qty });
    });
    tx.update(orderRef, { inventoryRestored: true, inventoryRestoreOperationId: refundId, inventoryRestoreCompletedAt: new Date().toISOString() });
  });
}

async function restoreInventory(items: any[]) {
  const db = getFirestore();
  const quantities = new Map<string, number>();
  const resolveBaseId = (item: any) => {
    if (item.baseId) return String(item.baseId);
    const idStr = String(item.id);
    return idStr.includes('-') ? idStr.split('-')[0] : idStr;
  };

  for (const item of items) {
    const id = resolveBaseId(item);
    const quantity = Number(item?.quantity || 0);
    if (id && Number.isInteger(quantity) && quantity > 0) {
      quantities.set(id, (quantities.get(id) || 0) + quantity);
    }
  }

  await db.runTransaction(async (tx) => {
    const refs = [...quantities.keys()].map((id) => db.collection('products').doc(id));
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    snaps.forEach((snap, index) => {
      if (!snap.exists) return;
      const current = snap.data()?.stock;
      const quantity = quantities.get(refs[index].id) || 0;
      if (typeof current !== 'number' || quantity <= 0) return;
      tx.update(refs[index], { stock: current + quantity });
    });
  });
}

async function cancelOrderAtomically(
  db: FirebaseFirestore.Firestore,
  orderRef: FirebaseFirestore.DocumentReference,
  reason: string | null
): Promise<{ paymentStatus: string; refundRequired: boolean; inventoryAction: 'release_reservation' | 'restore_stock' | 'none'; reservationId: string | null }> {
  return db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new Error('ORDER_NOT_FOUND');
    const data = orderSnap.data() as any;
    const current = String(data?.status || data?.orderStatus || 'pending');
    const cancellable = ['pending', 'confirmed', 'processing', 'packed', 'whatsapp_pending', 'AWAITING_WHATSAPP_CONFIRMATION', 'RECEIVED', 'paid_upi_pending_verify'];
    if (!cancellable.includes(current)) throw new Error('ORDER_NOT_CANCELLABLE');

    const paymentStatus = String(data?.paymentStatus || 'unpaid').toLowerCase();
    const reservationId = data?.reservationId ? String(data.reservationId) : null;
    const refundRequired = paymentStatus === 'paid' || paymentStatus === 'captured';
    const inventoryAction = refundRequired ? 'none' : (reservationId ? 'release_reservation' : 'restore_stock');
    const now = new Date().toISOString();

    // A paid order already had its reserved stock finalized. Never restore it here:
    // the refund operation owns inventory restoration after the gateway confirms the refund.
    // This prevents cancellation + refund from double-restoring stock.
    tx.update(orderRef, {
      status: 'cancelled',
      orderStatus: 'cancelled',
      ...(refundRequired ? { paymentStatus: 'refund_pending', refundStatus: 'pending' } : {}),
      ...(reason ? { cancellationReason: reason } : {}),
      cancelledAt: now,
      updatedAt: now,
      inventoryAction,
    });
    return { paymentStatus: refundRequired ? 'refund_pending' : paymentStatus, refundRequired, inventoryAction, reservationId };
  });
}

async function calculateOrderTotals(items: any[], orderType: 'retail' | 'wholesale' = 'retail'): Promise<{ subtotal: number, validatedItems: any[] }> {
  let subtotal = 0;
  const validatedItems: any[] = [];
  
  const deriveBaseId = (itemId: unknown) => {
    const idStr = String(itemId ?? '');
    return idStr.includes('-') ? idStr.split('-')[0] : idStr;
  };

  const resolveBaseId = (item) => {
    const derivedBaseId = deriveBaseId(item.id);
    if (item.baseId != null && String(item.baseId) !== derivedBaseId) {
      throw new Error('Invalid product variant reference. Please refresh your cart and try again.');
    }
    return derivedBaseId;
  };

  // Query Firestore & fallback catalog to determine authoritative item prices
  const productRefs = items.map(item => getFirestore().collection('products').doc(resolveBaseId(item)));
  let dbProducts: any[] = [];
  
  try {
    if (productRefs.length > 0) {
      const docRefs = await getFirestore().getAll(...productRefs);
      dbProducts = docRefs.map(doc => {
        if (doc.exists) return { id: doc.id, ...doc.data() };
        const bundled = BUNDLED_PRODUCTS.find((p) => String(p.id) === doc.id);
        if (bundled) {
          const numPrice = Number(bundled.numericPrice) || parseFloat(String(bundled.price).replace(/[^0-9.]/g, '')) || 0;
          const initialProduct = {
            ...bundled,
            id: String(bundled.id),
            name: bundled.name,
            category: bundled.category || 'General',
            categoryId: (bundled as any).categoryId || (bundled.category ? String(bundled.category).toLowerCase().replace(/\s+/g, '-') : 'general'),
            subcategoryId: (bundled as any).subcategoryId || null,
            subSubcategoryId: (bundled as any).subSubcategoryId || null,
            unit: (bundled as any).unit || '1 kg',
            price: bundled.price,
            numericPrice: numPrice,
            wholesalePrice: (bundled as any).wholesalePrice || numPrice,
            wholesaleEligible: true,
            stock: 100,
            reservedStock: 0,
            stockStatus: 'in_stock',
            description: bundled.description || '',
            image: bundled.image || '',
            weights: (bundled as any).weights || [],
            isDeleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          getFirestore().collection('products').doc(doc.id).set(initialProduct, { merge: true }).catch(() => {});
          return initialProduct;
        }
        return null;
      });
    }
  } catch (dbErr) {
    // Checkout must fail closed. Falling back to a bundled catalog after a
    // Firestore outage can charge an administrator-retired price or sell a
    // deleted product. The bundled catalog is for storefront bootstrap only.
    console.error('Firestore lookup failed during authoritative checkout validation:', dbErr);
    throw new Error('The live product catalog is temporarily unavailable. Please try again in a moment.', { cause: dbErr });
  }

  // A category being "frozen" by an admin (see /api/admin/categories/:id/freeze)
  // must actually block checkout, not just hide the category tab client-side --
  // otherwise a shopper who already has the item in their cart, or reaches it
  // via search/a stale link, could still buy it.
  const categoryIds = Array.from(new Set(dbProducts.filter(Boolean).map((p: any) => p.categoryId).filter(Boolean)));
  const frozenCategoryIds = new Set<string>();
  if (categoryIds.length > 0) {
    try {
      const categoryDocs = await getFirestore().getAll(...categoryIds.map(id => getFirestore().collection('categories').doc(id)));
      categoryDocs.forEach(doc => {
        if (doc.exists && (doc.data() as any)?.isFrozen) frozenCategoryIds.add(doc.id);
      });
    } catch (catErr) {
      console.error('Firestore lookup failed while checking frozen categories:', catErr);
      throw new Error('The live product catalog is temporarily unavailable. Please try again in a moment.', { cause: catErr });
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let itemPrice = 0;
    
    const pData = dbProducts[i];
    if (pData && pData.isDeleted) {
      throw new Error(`"${item.name || pData.name || item.id}" is no longer available.`);
    }
    if (pData) {
      if (item.selectedWeight && Array.isArray(pData.weights)) {
        const weightOpt = pData.weights.find(
          (w: any) => w.label === item.selectedWeight || w.weight === item.selectedWeight
        );
        if (weightOpt && weightOpt.price) {
          itemPrice = Number(weightOpt.price) || parseFloat(String(weightOpt.price).replace(/[^0-9.]/g, '')) || 0;
        }
      }
      if (!itemPrice) {
        itemPrice = Number(pData.numericPrice) || parseFloat(String(pData.price).replace(/[^0-9.]/g, '')) || 0;
      }
    }

    if (!pData) {
      throw new Error(`Product ${resolveBaseId(item)} is not present in the live catalog.`);
    }

    if (pData.stockStatus === 'out_of_stock') {
      throw new Error(`"${pData.name || item.name || item.id}" is currently out of stock.`);
    }
    if (pData.categoryId && frozenCategoryIds.has(pData.categoryId)) {
      throw new Error(`"${pData.name || item.name || item.id}" is temporarily unavailable.`);
    }

    // Wholesale orders use a completely separate price and eligibility gate.
    // A product is wholesale-eligible ONLY when explicitly flagged true by an
    // admin -- quantity never implies wholesale, so this cannot be bypassed
    // by simply ordering a large quantity through the retail checkout.
    if (orderType === 'wholesale') {
      if (pData.wholesaleEligible !== true) {
        throw new Error(`"${pData.name || item.name || item.id}" is not available for wholesale purchase.`);
      }
      const wholesaleMinQty = Number(pData.wholesaleMinQty) || 1;
      if (item.quantity < wholesaleMinQty) {
        throw new Error(`"${pData.name || item.name}" requires a minimum wholesale quantity of ${wholesaleMinQty}.`);
      }
      const wholesalePrice = Number(pData.wholesalePrice);
      if (!Number.isFinite(wholesalePrice) || wholesalePrice <= 0) {
        throw new Error(`Wholesale price for "${pData.name || item.name || item.id}" is not configured.`);
      }
      itemPrice = wholesalePrice;
    }

    if (item.selectedWeight && Array.isArray(pData.weights)) {
      const validWeight = pData.weights.some((w: any) => w?.label === item.selectedWeight || w?.weight === item.selectedWeight);
      if (!validWeight) {
        throw new Error(`Selected weight for ${pData.name || item.id} is no longer available.`);
      }
    }
    if (item.selectedCut && Array.isArray(pData.fishCuts) && !pData.fishCuts.includes(item.selectedCut)) {
      throw new Error(`Selected preparation for ${pData.name || item.id} is no longer available.`);
    }

    if (!itemPrice) {
      throw new Error(`Price for item ${item.name || item.id} could not be determined. Server authoritative check failed.`);
    }
    if (itemPrice <= 0) {
      throw new Error(`Invalid product or missing price for item ID ${item.id}`);
    }

    if (pData && typeof pData.stock === 'number' && pData.stock >= 0) {
      if (pData.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${pData.name || item.name}. Available: ${pData.stock}`);
      }
    }
    
    subtotal += itemPrice * item.quantity;
    
    validatedItems.push({
      id: item.id,
      name: pData.name || item.name || 'Item',
      quantity: item.quantity,
      price: itemPrice,
      selectedWeight: item.selectedWeight || null,
      selectedCut: item.selectedCut || null,
      image: pData.image || item.image || null,
    });
  }
  return { subtotal, validatedItems };
}

// Atomically claims a pending Razorpay order snapshot so that /verify and the
// webhook can never both build an order for the same payment if they race. Returns
// the pending data if this call won the claim, or null if it was already claimed
// (by the other path) or never existed.
async function claimPendingRazorpayOrder(razorpayOrderId: string): Promise<any | null> {
  const db = getFirestore();
  const pendingRef = db.collection('razorpayPendingOrders').doc(razorpayOrderId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(pendingRef);
    if (!snap.exists) return null;
    const data = snap.data() as any;
    if (data.status === 'committed' || data.consumed === true) return null;
    const processingAt = Date.parse(String(data.processingAt || ''));
    if (data.status === 'processing' && Number.isFinite(processingAt) && Date.now() - processingAt < 5 * 60 * 1000) return null;
    tx.update(pendingRef, { status: 'processing', processingAt: new Date().toISOString(), attempts: FieldValue.increment(1) });
    return data;
  });
}

async function markPendingRazorpayCommitted(razorpayOrderId: string) {
  await getFirestore().collection('razorpayPendingOrders').doc(razorpayOrderId).set({ status: 'committed', consumed: true, committedAt: new Date().toISOString() }, { merge: true });
}

async function resetPendingRazorpayClaim(razorpayOrderId: string, reason: string) {
  await getFirestore().collection('razorpayPendingOrders').doc(razorpayOrderId).set({ status: 'pending', consumed: false, processingError: reason.slice(0, 500), updatedAt: new Date().toISOString() }, { merge: true });
}

// Looks up an order by its Razorpay order id, retrying briefly -- used when this
// request lost the claim race to /verify or the webhook, so the winner's write has
// a moment to become visible.
async function findOrderByRazorpayId(razorpayOrderId: string, retries = 3): Promise<string | null> {
  const db = getFirestore();
  for (let i = 0; i < retries; i++) {
    const snap = await db.collection('orders').where('razorpay_order_id', '==', razorpayOrderId).limit(1).get();
    if (!snap.empty) return snap.docs[0].id;
    if (i < retries - 1) await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

// Reconciles a Razorpay payment against an order record. Acts as the webhook's
// safety net: if verify() already ran, ensures the order is marked paid; if the
// client never completed /api/razorpay/verify (tab closed, network drop, etc.),
// rebuilds the order from the pending snapshot saved in /api/razorpay/order.
async function reconcileRazorpayOrder(razorpayOrderId: string, paymentId?: string | null) {
  const db = getFirestore();
  const razorpayInstance = getRazorpay();
  if (!razorpayInstance) throw new Error('Razorpay is not configured.');
  if (!paymentId) throw new Error(`RETRY_REQUIRED: no payment id available for ${razorpayOrderId}`);

  const payment = await razorpayInstance.payments.fetch(paymentId);
  const paymentOrderId = String(payment?.order_id || '');
  const paymentStatus = String(payment?.status || '').toLowerCase();
  const paymentAmount = Number(payment?.amount);
  const paymentCurrency = String(payment?.currency || '');
  if (paymentOrderId !== razorpayOrderId || paymentStatus !== 'captured' || !Number.isFinite(paymentAmount) || paymentCurrency !== 'INR') {
    throw new Error('RETRY_REQUIRED: gateway payment is not a captured INR payment for this order.');
  }

  const existing = await db.collection('orders').where('razorpay_order_id', '==', razorpayOrderId).limit(1).get();
  if (!existing.empty) {
    const docRef = existing.docs[0].ref;
    const data = existing.docs[0].data() as any;
    if (data.razorpay_payment_id && data.razorpay_payment_id !== paymentId) {
      throw new Error('PERMANENT_FAILURE: a different payment is already attached to this order.');
    }
    const expectedPaise = Math.round(Number(data.grandTotal ?? data.amount ?? 0) * 100);
    if (!Number.isFinite(expectedPaise) || expectedPaise <= 0 || paymentAmount !== expectedPaise) {
      throw new Error('PERMANENT_FAILURE: captured payment amount does not match the order total.');
    }
    if (data.paymentCurrency && String(data.paymentCurrency) !== paymentCurrency) {
      throw new Error('PERMANENT_FAILURE: payment currency does not match the order.');
    }
    if (data.paymentStatus !== 'paid' && data.paymentStatus !== 'refunded') {
      const cancelled = String(data.status || data.orderStatus || '') === 'cancelled';
      await docRef.update({
        paymentStatus: cancelled ? 'refund_pending' : 'paid',
        refundStatus: cancelled ? 'pending' : (data.refundStatus || null),
        status: cancelled ? 'cancelled' : (data.orderStatus || data.status || 'confirmed'),
        orderStatus: cancelled ? 'cancelled' : (data.orderStatus || data.status || 'confirmed'),
        razorpay_payment_id: paymentId,
        updatedAt: new Date().toISOString(),
      });
    }
    await markPendingRazorpayCommitted(razorpayOrderId).catch(() => {});
    return 'ALREADY_RECONCILED';
  }

  const pending = await claimPendingRazorpayOrder(razorpayOrderId);
  if (!pending) {
    const foundOrderId = await findOrderByRazorpayId(razorpayOrderId);
    if (foundOrderId) return 'ALREADY_RECONCILED';
    throw new Error(`RETRY_REQUIRED: no claimable pending checkout snapshot for ${razorpayOrderId}`);
  }

  try {
    if (!pending.userId) throw new Error('PERMANENT_FAILURE: pending Razorpay order has no authenticated owner.');
    const expectedAmount = Math.round(Number(pending.amount || 0) * 100);
    const expectedCurrency = String(pending.currency || 'INR');
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0 || expectedCurrency !== 'INR' || paymentAmount !== expectedAmount || paymentCurrency !== expectedCurrency) {
      throw new Error('PERMANENT_FAILURE: captured payment does not match the trusted checkout snapshot.');
    }
    const rzpOrder = await razorpayInstance.orders.fetch(razorpayOrderId);
    if (Number(rzpOrder?.amount) !== expectedAmount || String(rzpOrder?.currency || '') !== expectedCurrency) {
      throw new Error('PERMANENT_FAILURE: Razorpay order amount/currency does not match the checkout snapshot.');
    }

    const { orderId, payload: orderPayload } = await createOrderWithUniqueId(db, (id) => ({
      id,
      orderId: id,
      items: pending.items || [],
      subtotal: pending.subtotal || 0,
      discountAmount: pending.discountAmount || 0,
      couponCode: pending.couponCode || null,
      deliveryFee: pending.deliveryFee || 0,
      amount: pending.amount || 0,
      grandTotal: pending.amount || 0,
      status: 'confirmed',
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
      paymentCurrency: expectedCurrency,
      paymentMethod: 'Online Payment (Razorpay)',
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: paymentId,
      reservationId: pending.reservationId || null,
      shippingDetails: pending.shippingDetails || {},
      userId: pending.userId,
      orderType: pending.orderType || 'retail',
      ...(pending.wholesaleZoneId ? { wholesaleZoneId: pending.wholesaleZoneId, wholesaleZoneLabel: pending.wholesaleZoneLabel } : {}),
      createdViaWebhook: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }), { couponCode: pending.couponCode, userId: pending.userId, enforceCouponLimit: false });

    try {
      if (pending.reservationId) await finalizeInventoryReservation(db, String(pending.reservationId));
      else await decrementInventory(orderPayload.items);
    } catch (stockErr: any) {
      await db.collection('orders').doc(orderId).update({ stockConflict: true, stockConflictReason: String(stockErr.message || stockErr).slice(0, 500) });
    }
    await markPendingRazorpayCommitted(razorpayOrderId);
    console.log(`[Webhook] Auto-created order ${orderId} from Razorpay payment ${paymentId}.`);
    return 'RECONCILED';
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.startsWith('PERMANENT_FAILURE:')) await markPendingRazorpayCommitted(razorpayOrderId).catch(() => {});
    else await resetPendingRazorpayClaim(razorpayOrderId, msg).catch(() => {});
    throw err;
  }
}

async function getStoreDeliverySettings(): Promise<{ deliveryFee: number; freeDeliveryThreshold: number; minOrderAmount: number; upiId: string }> {
  const fallbackUpiId = 'paytm.s27lek5@pty';
  try {
    const docSnap = await getFirestore().collection('settings').doc('global').get();
    if (docSnap.exists) {
      const data = docSnap.data();
      const fee = typeof data?.deliveryFee === 'number' ? data.deliveryFee : 40;
      const threshold = typeof data?.freeDeliveryThreshold === 'number' ? data.freeDeliveryThreshold : 0;
      const minOrder = typeof data?.minOrderAmount === 'number' ? data.minOrderAmount : 0;
      const upiId = typeof data?.upiId === 'string' && data.upiId.trim() ? data.upiId.trim() : fallbackUpiId;
      return { deliveryFee: fee, freeDeliveryThreshold: threshold, minOrderAmount: minOrder, upiId };
    }
  } catch (err) {
    console.error('Error reading authoritative store settings:', err);
    throw new Error('The live store settings are temporarily unavailable. Please try again in a moment.', { cause: err });
  }
  return { deliveryFee: 40, freeDeliveryThreshold: 0, minOrderAmount: 0, upiId: fallbackUpiId };
}

// ---------------------------------------------------------------------------
// RETAIL DELIVERY PIN CODE SERVICEABILITY
// ---------------------------------------------------------------------------
// Authoritative check: a retail order can only be accepted for a PIN code
// that an admin has explicitly added AND enabled. This is the actual
// enforcement point -- checkout UI calls /api/delivery/check-pincode for
// live feedback, but order creation re-checks this itself rather than
// trusting that earlier client-side check.
function normalizePincode(raw: unknown): string {
  return String(raw ?? '').replace(/\*/g, '').trim();
}

async function getRetailPincode(pincode: string): Promise<DeliveryPincodeRecord | null> {
  const clean = normalizePincode(pincode);
  if (!/^\d{6}$/.test(clean)) return null;
  const defaultEntry = DEFAULT_RETAIL_PINCODES[clean] || null;
  try {
    const snap = await getFirestore().collection('deliveryPincodes').doc(clean).get();
    if (snap.exists) {
      return { pincode: clean, ...(snap.data() as any) };
    }
  } catch (err) {
    console.warn('[Delivery] Firestore lookup unavailable for retail pincode, using default configuration:', err);
  }
  return defaultEntry ? { ...defaultEntry } : null;
}

interface DeliveryPincodeRecord {
  pincode: string;
  enabled: boolean;
  label?: string;
  areas?: string[];
  deliveryFee?: number;
  minOrderAmount?: number;
}

// ---------------------------------------------------------------------------
// WHOLESALE SHIPPING ZONE SERVICEABILITY (PAN-INDIA ACTIVE)
// ---------------------------------------------------------------------------
interface WholesaleZoneRecord {
  id: string;
  label: string;
  pincodePrefixes: string[];
  enabled: boolean;
  shippingFee: number;
  minOrderValue: number;
  etaDays?: string;
}

async function findWholesaleZoneForPincode(pincode: string): Promise<WholesaleZoneRecord | null> {
  const clean = normalizePincode(pincode);
  if (!isValidIndianPincode(clean)) return null;
  const prefix3 = clean.slice(0, 3);
  try {
    const snap = await getFirestore().collection('wholesaleZones').get();
    if (!snap.empty) {
      const enabledZones = snap.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
        .filter((z) => z.enabled === true);
      // Match specific 3-digit prefix first, then 'ALL' / '*' Pan-India zone
      for (const data of enabledZones) {
        const prefixes: string[] = Array.isArray(data.pincodePrefixes) ? data.pincodePrefixes : [];
        if (prefixes.some((p) => String(p).trim() === prefix3)) {
          return {
            id: data.id,
            label: data.label,
            pincodePrefixes: prefixes,
            enabled: true,
            shippingFee: Number(data.shippingFee) || 0,
            minOrderValue: Number(data.minOrderValue) || 0,
            etaDays: data.etaDays,
          };
        }
      }
      for (const data of enabledZones) {
        const prefixes: string[] = Array.isArray(data.pincodePrefixes) ? data.pincodePrefixes : [];
        if (prefixes.some((p) => ['ALL', '*'].includes(String(p).trim().toUpperCase()))) {
          return {
            id: data.id,
            label: data.label,
            pincodePrefixes: prefixes,
            enabled: true,
            shippingFee: Number(data.shippingFee) || 0,
            minOrderValue: Number(data.minOrderValue) || 0,
            etaDays: data.etaDays,
          };
        }
      }
      return null;
    }
  } catch (err) {
    console.warn('[Wholesale] Firestore zone lookup unavailable, using Pan-India default zone:', err);
  }
  return { ...DEFAULT_PAN_INDIA_WHOLESALE_ZONE };
}


function generateOrderId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  // Use crypto-secure randomness to prevent collision attacks on order ID guessing
  const randomSuffix = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `JY-${dateStr}-${randomSuffix}`;
}

// Creates an order document with a collision-safe ID, and -- if a coupon was
// used -- atomically checks and increments its usage counters in the SAME
// transaction. This is what actually makes usage limits concurrency-safe:
// applyCoupon()'s check is a best-effort pre-check for a friendly error
// message, but two simultaneous checkouts could both pass that check before
// either writes anything. This transaction is the real enforcement point.
//
// enforceCouponLimit controls what happens if the limit turns out to be hit
// here: `true` (COD/WhatsApp/UPI-QR, no payment captured yet) throws
// COUPON_LIMIT_REACHED so the order can be cleanly rejected. `false`
// (Razorpay verify/webhook, payment already captured) never blocks order
// creation -- money already moved, so losing the order record would be worse
// than an over-redeemed coupon. It still records the redemption and flags
// `couponConflict: true` for admin review instead.
async function createOrderWithUniqueId(
  db: FirebaseFirestore.Firestore,
  buildPayload: (orderId: string) => Record<string, any>,
  options: { couponCode?: string | null; userId?: string | null; enforceCouponLimit?: boolean; idempotencyKey?: string | null; requestHash?: string | null } = {},
  maxAttempts = 5
): Promise<{ orderId: string; payload: Record<string, any>; replayed: boolean }> {
  const { couponCode, userId, enforceCouponLimit = false, idempotencyKey, requestHash } = options;
  const normalizedCode = couponCode ? String(couponCode).trim().toUpperCase() : null;
  const couponRef = normalizedCode ? db.collection('coupons').doc(normalizedCode) : null;
  const redemptionRef = (couponRef && userId && userId !== 'guest') ? couponRef.collection('redemptions').doc(userId) : null;
  const idempotencyRef = (idempotencyKey && userId) ? db.collection('idempotencyKeys').doc(hashIdempotencyKey('order-create', userId, idempotencyKey)) : null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateId = generateOrderId();
    const orderRef = db.collection('orders').doc(candidateId);
    const result = await db.runTransaction(async (tx) => {
      // ---- reads first (Firestore transactions require all reads before any write) ----
      const orderSnap = await tx.get(orderRef);
      const couponSnap = couponRef ? await tx.get(couponRef) : null;
      const redemptionSnap = redemptionRef ? await tx.get(redemptionRef) : null;
      const idempotencySnap = idempotencyRef ? await tx.get(idempotencyRef) : null;

      if (idempotencySnap?.exists) {
        const idem = idempotencySnap.data() as any;
        if (requestHash && idem.requestHash && idem.requestHash !== requestHash) {
          throw new Error('IDEMPOTENCY_KEY_REUSED');
        }
        if (idem.orderId && idem.payload) return { ...idem.payload, __idempotencyReplay: true };
      }

      if (orderSnap.exists) return null; // order-id collision -- caller retries with a fresh id

      let couponLimitHit = false;
      if (couponSnap && couponSnap.exists) {
        const c = couponSnap.data() as any;
        const maxUses = typeof c.maxUses === 'number' ? c.maxUses : null;
        const usedCount = typeof c.usedCount === 'number' ? c.usedCount : 0;
        const perUserLimit = typeof c.perUserLimit === 'number' ? c.perUserLimit : null;
        const userUsed = redemptionSnap?.exists ? (redemptionSnap.data()?.count || 0) : 0;
        couponLimitHit = (maxUses !== null && usedCount >= maxUses) || (perUserLimit !== null && !!redemptionRef && userUsed >= perUserLimit);
      }

      if (couponLimitHit && enforceCouponLimit) {
        throw new Error('COUPON_LIMIT_REACHED');
      }

      // ---- writes ----
      const payload = buildPayload(candidateId);
      if (couponLimitHit) {
        payload.couponConflict = true; // payment already captured elsewhere; flag for admin instead of blocking
      }
      tx.set(orderRef, payload);
      if (idempotencyRef) {
        tx.set(idempotencyRef, { requestHash: requestHash || null, orderId: candidateId, payload, createdAt: new Date().toISOString() }, { merge: true });
      }
      if (couponSnap && couponSnap.exists && !couponLimitHit) {
        tx.update(couponRef!, { usedCount: FieldValue.increment(1) });
        if (redemptionRef) {
          tx.set(redemptionRef, { count: FieldValue.increment(1), lastUsedAt: new Date().toISOString() }, { merge: true });
        }
      }
      return payload;
    });
    if (result) {
      const replayed = Boolean((result as any).__idempotencyReplay);
      if (replayed) {
        const { __idempotencyReplay, ...payload } = result as any;
        return { orderId: String(payload.id || candidateId), payload, replayed: true };
      }
      return { orderId: candidateId, payload: result, replayed: false };
    }
    console.warn(`[Order ID] Collision on ${candidateId}, retrying (attempt ${attempt + 1}/${maxAttempts})`);
  }
  throw new Error('Could not generate a unique order ID after multiple attempts');
}

// Authoritative server-side coupon validation against the `coupons` collection
// (the same one the Admin Panel's Promotions tab manages). Throws a user-facing
// message if the code is invalid, inactive, or below the minimum order value.
async function applyCoupon(subtotal: number, couponCode?: string | null, userId?: string | null, skipUsageLimitCheck = false): Promise<{ discountAmount: number; couponCode: string | null }> {
  if (!couponCode || !String(couponCode).trim()) {
    return { discountAmount: 0, couponCode: null };
  }
  const code = String(couponCode).trim().toUpperCase();

  const db = getFirestore();
  const couponRef = db.collection('coupons').doc(code);
  const snap = await couponRef.get();
  if (!snap.exists) {
    throw new Error(`Coupon code "${code}" is not valid.`);
  }
  const coupon = snap.data() as any;
  if (coupon.isActive === false) {
    throw new Error(`Coupon code "${code}" is no longer active.`);
  }
  const minOrderValue = Number(coupon.minOrderValue) || 0;
  if (minOrderValue > 0 && subtotal < minOrderValue) {
    throw new Error(`Coupon "${code}" requires a minimum order of ₹${minOrderValue}.`);
  }

  // Usage limits. Both fields are optional -- a coupon with neither set behaves
  // exactly as before (unlimited use). This is a best-effort pre-check for a
  // friendly error message; the actual atomic enforcement (the part that's safe
  // under concurrent checkouts) happens inside createOrderWithUniqueId's
  // transaction at order-creation time.
  const maxUses = typeof coupon.maxUses === 'number' ? coupon.maxUses : null;
  const usedCount = typeof coupon.usedCount === 'number' ? coupon.usedCount : 0;
  if (!skipUsageLimitCheck && maxUses !== null && usedCount >= maxUses) {
    throw new Error(`Coupon "${code}" has reached its usage limit.`);
  }
  const perUserLimit = typeof coupon.perUserLimit === 'number' ? coupon.perUserLimit : null;
  if (!skipUsageLimitCheck && perUserLimit !== null && userId && userId !== 'guest') {
    const redemptionSnap = await couponRef.collection('redemptions').doc(userId).get();
    const userUsed = redemptionSnap.exists ? (redemptionSnap.data()?.count || 0) : 0;
    if (userUsed >= perUserLimit) {
      throw new Error(`You've already used coupon "${code}" the maximum number of times.`);
    }
  }

  let discountAmount: number;
  if (coupon.discountType === 'percentage') {
    discountAmount = (subtotal * (Number(coupon.discountValue) || 0)) / 100;
  } else {
    discountAmount = Number(coupon.discountValue) || 0;
  }
  // Never let a discount exceed the subtotal (e.g. a flat-₹ coupon on a small cart).
  discountAmount = Math.round(Math.max(0, Math.min(discountAmount, subtotal)) * 100) / 100;

  return { discountAmount, couponCode: code };
}

async function rollbackCouponRedemption(db: FirebaseFirestore.Firestore, couponCode: string | null, userId: string) {
  if (!couponCode) return;
  const couponRef = db.collection('coupons').doc(String(couponCode).trim().toUpperCase());
  const redemptionRef = userId && userId !== 'guest' ? couponRef.collection('redemptions').doc(userId) : null;
  await db.runTransaction(async (tx) => {
    const couponSnap = await tx.get(couponRef);
    const redemptionSnap = redemptionRef ? await tx.get(redemptionRef) : null;
    if (couponSnap.exists) {
      const usedCount = Number(couponSnap.data()?.usedCount || 0);
      tx.update(couponRef, { usedCount: Math.max(0, usedCount - 1) });
    }
    if (redemptionRef && redemptionSnap?.exists) {
      const count = Number(redemptionSnap.data()?.count || 0);
      if (count <= 1) tx.delete(redemptionRef);
      else tx.update(redemptionRef, { count: count - 1 });
    }
  });
}

const directOrderSchema = z.object({
  items: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      baseId: z.union([z.string(), z.number()]).optional(),
      name: z.string().optional(),
      quantity: z.number().int().positive().max(100),
      price: z.number().optional(),
      selectedWeight: z.string().nullable().optional(),
      selectedCut: z.string().nullable().optional(),
      image: z.string().optional(),
    })
  ).min(1, 'Cart cannot be empty').max(100, 'Too many items in cart'),
  // Fields are optional at the schema level and validated conditionally in the handler,
  // since WhatsApp Express quick-orders intentionally don't collect a delivery address
  // up front (the customer sends it via WhatsApp chat instead).
  shippingDetails: z.object({
    name: z.string().optional().default(''),
    phone: z.string().optional().default(''),
    address: z.string().optional().default(''),
    pincode: z.string().optional().default(''),
  }),
  paymentMethod: z.string().default('Cash on Delivery'),
  utrNumber: z.string().optional(),
  couponCode: z.string().optional().nullable(),
  orderType: z.enum(['retail', 'wholesale']).optional().default('retail'),
});

const trackOrderSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  phone: z.string().optional(),
});

const couponItemsSchema = z.array(
  z.object({
    id: z.union([z.string(), z.number()]),
    baseId: z.union([z.string(), z.number()]).optional(),
    quantity: z.number().int().positive().max(100).default(1),
    selectedWeight: z.string().nullable().optional(),
    selectedCut: z.string().nullable().optional(),
  })
).min(1, 'Cart cannot be empty');

const couponValidateSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  items: couponItemsSchema,
});

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      baseId: z.union([z.string(), z.number()]).optional(),
      quantity: z.number().int().positive().max(100).default(1),
      selectedWeight: z.string().nullable().optional(),
      selectedCut: z.string().nullable().optional(),
    })
  ).min(1, 'Order must contain at least one item').max(100, 'Too many items in order'),
  currency: z.string().optional().default('INR'),
  couponCode: z.string().optional().nullable(),
  // Captured here (not just at /verify) so a Razorpay webhook that arrives without a
  // matching client-side /verify call still has enough info to build the order record.
  shippingDetails: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    pincode: z.string().optional(),
  }).optional(),
  orderType: z.enum(['retail', 'wholesale']).optional().default('retail'),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'Order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Signature is required'),
  items: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      baseId: z.union([z.string(), z.number()]).optional(),
      quantity: z.number().int().positive().max(100).default(1),
      selectedWeight: z.string().nullable().optional(),
      selectedCut: z.string().nullable().optional(),
      name: z.string().optional(),
      price: z.number().optional(),
      image: z.string().optional(),
    })
  ).min(1, 'Order must contain at least one item').max(100, 'Too many items in payment verification').optional(),
  shippingDetails: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
  userId: z.string().optional(),
  couponCode: z.string().optional().nullable(),
});

const uploadUrlSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().min(1, 'Content type is required'),
});

const sendNotificationSchema = z.object({
  tokens: z.union([z.string().min(1).max(4096), z.array(z.string().min(1).max(4096)).max(500)]).optional(),
  userId: z.string().min(1).max(256).optional(),
  title: z.string().min(1, 'Notification title is required').max(200),
  body: z.string().max(2000).optional(),
  data: z.record(z.string().max(100), z.string().max(2000)).refine((v) => Object.keys(v).length <= 30).optional(),
});

const sendEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  storeName: z.string().optional().default('JIYOO'),
  order: z.object({
    id: z.string().min(1, 'Order ID is required'),
    amount: z.number().optional(),
    items: z.array(
      z.object({
        name: z.string(),
        quantity: z.number(),
        price: z.number(),
      })
    ).optional().default([]),
    shippingDetails: z.object({
      name: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
    }).optional(),
  }),
});

async function createApp() {
  const app = express();

  // Trust only the first proxy hop (Vercel/reverse proxy).
  app.set('trust proxy', 1);
  
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(body) {
    if (body && body.success === false && typeof body.error === 'string') {
      // Never reflect raw exception/database/provider messages from 5xx paths.
      // They can contain implementation details that are useful to attackers.
      body.error = res.statusCode >= 500 ? 'Internal server error. Please try again later.' : formatServerError(body.error);
    }
    return originalJson.call(this, body);
  };
  next();
});

app.use(compression() as unknown as express.RequestHandler);
  const PORT = Number.parseInt(env.PORT || '3000', 10) || 3000;

  // HTTPS should be enforced by the trusted reverse proxy/platform. Avoid constructing
  // redirects from the client-controlled Host header because that can become an
  // open-redirect primitive in misconfigured deployments.

  // Security Middlewares
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(self), payment=(self "https://checkout.razorpay.com")'
    );
    next();
  });

  const isProd = process.env.NODE_ENV === 'production';
  app.use(
    helmet({
      frameguard: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'", "https:", "http:", "data:", "blob:"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          scriptSrc: isProd
            ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "blob:"]
            : ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:", "blob:"],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
          fontSrc: ["'self'", "https:", "http:", "data:"],
          imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
          connectSrc: ["'self'", "https:", "http:", "wss:", "ws:"],
          frameSrc: ["'self'", "https:", "http:"],
          frameAncestors: ["*"],
          objectSrc: ["'none'"],
        },
      },
    })
  );

  app.use(
    express.json({
      limit: '2mb',
      strict: true,
      verify: (req, res, buf) => {
        (req as any).rawBody = buf.toString('utf8');
      },
    })
  );

  app.use(cookieParser());
  app.use('/api/', apiLimiter);

// Cookie-backed state-changing requests must originate from our own site.
  // Bearer-token requests are not CSRF-vulnerable, so they remain unaffected.
  // Requests without Origin/Referer are allowed for non-browser clients.
  const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  app.use((req, res, next) => {
    if (!unsafeMethods.has(req.method) || !req.cookies?.session || req.path === '/api/razorpay/webhook') {
      return next();
    }

    const origin = String(req.headers.origin || '').trim();
    const referer = String(req.headers.referer || '').trim();
    const host = String(req.headers.host || '').trim().toLowerCase();
    const allowedOrigin = origin && (() => {
      try { return new URL(origin).host.toLowerCase() === host; } catch { return false; }
    })();
    const allowedReferer = referer && (() => {
      try { return new URL(referer).host.toLowerCase() === host; } catch { return false; }
    })();

    if (origin && !allowedOrigin && !allowedReferer) {
      return res.status(403).json({ success: false, error: 'Cross-site request blocked.' });
    }

    const fetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
    if (fetchSite === 'cross-site' && !allowedOrigin && !allowedReferer) {
      return res.status(403).json({ success: false, error: 'Cross-site request blocked.' });
    }
    next();
  });


  // =========================================================
  // SESSION MANAGEMENT (HTTP-Only Cookies)
  // =========================================================
  // Registered here (not at the top of createApp()) because these handlers
  // read req.body, which is only populated once express.json() above has run.
  app.post('/api/sessionLogin', strictApiLimiter, async (req, res) => {
    const idToken = req.body?.idToken?.toString();
    if (!idToken) return res.status(401).json({ error: 'UNAUTHORIZED REQUEST!' });

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    try {
      const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
      const options = { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const };
      res.cookie('session', sessionCookie, options);
      res.json({ status: 'success' });
    } catch (error) {
      res.status(401).json({ error: 'UNAUTHORIZED REQUEST!' });
    }
  });

  app.post('/api/sessionLogout', async (req, res) => {
    const session = (req as any).cookies?.session;
    if (session && typeof session === 'string') {
      try {
        const decodedClaims = await getAuth().verifySessionCookie(session);
        if (decodedClaims?.sub) {
          await getAuth().revokeRefreshTokens(decodedClaims.sub);
        }
      } catch {
        // Ignore already-expired or invalid session cookies during logout
      }
    }
    res.clearCookie('session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    });
    res.json({ status: 'success' });
  });

  // High-Quality Binary Image Upload Endpoint to public/uploads
  
  // Image retrieval endpoint (Firestore backed)
  app.get('/api/images/:id', async (req, res) => {
    try {
       const doc = await getFirestore().collection('_images').doc(req.params.id).get();
       if (!doc.exists) {
          return res.status(404).send('Image not found');
       }
       const data = doc.data();
       const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);
       const mimeType = String(data?.mimeType || 'image/jpeg').toLowerCase();
       if (!allowedMime.has(mimeType) || typeof data?.base64 !== 'string') {
          return res.status(415).send('Unsupported image type');
       }
       const buffer = Buffer.from(data.base64, 'base64');
       if (!buffer.length || buffer.length > 10 * 1024 * 1024) {
          return res.status(413).send('Image is too large');
       }
       res.set('Content-Type', mimeType);
       res.set('X-Content-Type-Options', 'nosniff');
       res.set('Content-Security-Policy', "default-src 'none'; sandbox");
       res.set('Cache-Control', 'public, max-age=31536000');
       res.send(buffer);
    } catch (e) {
       res.status(500).send('Failed to load image');
    }
  });

  // Grants or revokes the "admin" custom claim on a target user. This is the
  // ONLY supported way to create a new admin post-migration: there is no
  // customer-facing admin registration path, and a client can never set
  // this claim itself (custom claims are writable only via the Admin SDK).
  app.post('/api/admin/users/:uid/role', strictApiLimiter, requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const targetUid = req.params.uid;
      const { role } = req.body || {};
      if (role !== 'admin' && role !== 'user') {
        return res.status(400).json({ success: false, error: 'role must be "admin" or "user"' });
      }
      const callerUid = (req as any).authUser.uid;
      if (targetUid === callerUid && role === 'user') {
        return res.status(400).json({ success: false, error: 'You cannot remove your own admin access.' });
      }

      const targetRecord = await getAuth().getUser(targetUid);
      await getAuth().setCustomUserClaims(targetUid, {
        ...(targetRecord.customClaims || {}),
        admin: role === 'admin',
      });
      // Mirror onto the profile doc for display only -- never read back for
      // authorization decisions, only the custom claim above is trusted.
      await getFirestore().collection('users').doc(targetUid).set({ role }, { merge: true });

      const actorEmail = (req as any).authUser.email || 'unknown';
      await getFirestore().collection('audit_logs').add({
        action: role === 'admin' ? 'GRANT_ADMIN' : 'REVOKE_ADMIN',
        category: 'USERS',
        actor: actorEmail,
        details: `Set role of ${targetRecord.email || targetUid} to ${role}`,
        createdAt: new Date().toISOString(),
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error('Failed to update admin role:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to update role' });
    }
  });

  // Server-controlled, append-only audit log write. The actor is always
  // taken from the caller's verified ID token, never the request body, so a
  // client can never fabricate who performed an action. firestore.rules
  // denies ALL direct client writes to audit_logs -- this endpoint (via the
  // Admin SDK) is the only path in.
  app.post('/api/admin/audit-log', requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const { action, category, details } = req.body || {};
      if (typeof action !== 'string' || !action.trim()) {
        return res.status(400).json({ success: false, error: 'action is required' });
      }
      const allowedCategories = ['USERS', 'SETTINGS', 'BILLING', 'ORDERS', 'SYSTEM', 'DELIVERY'];
      const safeCategory = allowedCategories.includes(category) ? category : 'SYSTEM';
      const actorEmail = (req as any).authUser.email || (req as any).authUser.uid;

      await getFirestore().collection('audit_logs').add({
        action: action.trim().slice(0, 200),
        category: safeCategory,
        actor: actorEmail,
        details: typeof details === 'string' ? details.slice(0, 2000) : '',
        createdAt: new Date().toISOString(),
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Failed to write audit log:', err);
      res.status(500).json({ success: false, error: 'Failed to write audit log' });
    }
  });

  // Internal helper so server-side admin actions can write an audit entry
  // directly, without an HTTP round trip back to /api/admin/audit-log.
  async function writeAuditLogDirect(actorEmail: string, action: string, category: string, details: string) {
    try {
      await getFirestore().collection('audit_logs').add({
        action: action.slice(0, 200),
        category,
        actor: actorEmail,
        details: details.slice(0, 2000),
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Failed to write audit log entry:', err);
    }
  }

  // -------------------------------------------------------------------------
  // RETAIL DELIVERY PIN CODE MANAGEMENT (admin-only)
  // -------------------------------------------------------------------------
  // Full CRUD lives behind the server, not direct client Firestore writes,
  // because delivery configuration gates whether orders can be accepted at
  // all -- the brief names it alongside payment/refund/inventory/admin-
  // privilege changes as needing protection. This also lets us enforce real
  // server-side format validation (6-digit numeric, no duplicates) beyond
  // what Firestore rules can cleanly express.
  const pincodeBodySchema = z.object({
    pincode: z.string().regex(/^\d{6}$/, 'PIN code must be exactly 6 digits'),
    label: z.string().max(120).optional(),
    enabled: z.boolean().optional().default(false),
    deliveryFee: z.number().min(0).max(100000).optional(),
    minOrderAmount: z.number().min(0).max(1000000).optional(),
  });

  app.get('/api/admin/delivery/pincodes', requireAuth, requireAdmin, async (req, res) => {
    try {
      const mergedMap = new Map<string, any>();
      Object.values(DEFAULT_RETAIL_PINCODES).forEach((item) => {
        mergedMap.set(item.pincode, { ...item });
      });
      try {
        const snap = await getFirestore().collection('deliveryPincodes').orderBy('pincode', 'asc').get();
        snap.docs.forEach((d) => {
          const data = d.data() as any;
          const base = mergedMap.get(d.id) || {};
          mergedMap.set(d.id, {
            ...base,
            pincode: d.id,
            ...data,
            label: data.label || base.label || '',
          });
        });
      } catch (dbErr) {
        console.warn('Firestore deliveryPincodes read failed, returning default active areas:', dbErr);
      }
      const pincodes = Array.from(mergedMap.values()).sort((a, b) => String(a.pincode).localeCompare(String(b.pincode)));
      res.json({ success: true, pincodes, areas: DEFAULT_RETAIL_AREAS });
    } catch (err: any) {
      console.error('Failed to list delivery pincodes:', err);
      res.status(500).json({ success: false, error: 'Failed to list delivery pincodes' });
    }
  });

  app.post('/api/admin/delivery/pincodes', strictApiLimiter, requireAuth, requireAdmin, async (req, res) => {
    try {
      const parsed = pincodeBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid PIN code data' });
      }
      const { pincode, label, enabled, deliveryFee, minOrderAmount } = parsed.data;
      const ref = getFirestore().collection('deliveryPincodes').doc(pincode);
      const actorEmail = (req as any).authUser.email || (req as any).authUser.uid;
      const now = new Date().toISOString();
      await ref.set({
        pincode,
        label: label || '',
        enabled,
        ...(deliveryFee !== undefined ? { deliveryFee } : {}),
        ...(minOrderAmount !== undefined ? { minOrderAmount } : {}),
        createdAt: now,
        updatedAt: now,
        createdBy: actorEmail,
      }, { merge: true });
      await writeAuditLogDirect(actorEmail, 'ADD_DELIVERY_PINCODE', 'DELIVERY', `Saved PIN code ${pincode} (${enabled ? 'enabled' : 'disabled'})`);
      res.json({ success: true, pincode });
    } catch (err: any) {
      console.error('Failed to add delivery pincode:', err);
      res.status(500).json({ success: false, error: 'Failed to add PIN code' });
    }
  });

  app.post('/api/admin/delivery/pincodes/bulk-import', strictApiLimiter, requireAuth, requireAdmin, async (req, res) => {
    try {
      const listSchema = z.object({
        pincodes: z.array(z.object({
          pincode: z.string().regex(/^\d{6}$/),
          label: z.string().max(120).optional(),
          enabled: z.boolean().optional().default(true),
        })).min(1).max(500),
      });
      const parsed = listSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Invalid bulk import payload. Each entry needs a 6-digit pincode.' });
      }
      const actorEmail = (req as any).authUser.email || (req as any).authUser.uid;
      const db = getFirestore();
      const now = new Date().toISOString();
      let added = 0;
      let skipped = 0;
      const seen = new Set<string>();
      const toInsert = parsed.data.pincodes.filter((p) => {
        if (seen.has(p.pincode)) return false;
        seen.add(p.pincode);
        return true;
      });
      for (let i = 0; i < toInsert.length; i += 450) {
        const chunk = toInsert.slice(i, i + 450);
        const batch = db.batch();
        const existingDocs = await db.getAll(...chunk.map((p) => db.collection('deliveryPincodes').doc(p.pincode)));
        chunk.forEach((p, idx) => {
          if (existingDocs[idx].exists) {
            skipped++;
            return;
          }
          added++;
          batch.set(db.collection('deliveryPincodes').doc(p.pincode), {
            pincode: p.pincode,
            label: p.label || '',
            enabled: p.enabled,
            createdAt: now,
            updatedAt: now,
            createdBy: actorEmail,
          });
        });
        await batch.commit();
      }
      await writeAuditLogDirect(actorEmail, 'BULK_IMPORT_DELIVERY_PINCODES', 'DELIVERY', `Bulk-imported ${added} PIN code(s), skipped ${skipped} duplicate(s)`);
      res.json({ success: true, added, skipped });
    } catch (err: any) {
      console.error('Failed to bulk-import delivery pincodes:', err);
      res.status(500).json({ success: false, error: 'Failed to bulk-import PIN codes' });
    }
  });

  app.post('/api/admin/delivery/pincodes/:pincode', strictApiLimiter, requireAuth, requireAdmin, async (req, res) => {
    try {
      const pincode = req.params.pincode;
      if (!/^\d{6}$/.test(pincode)) {
        return res.status(400).json({ success: false, error: 'Invalid PIN code format' });
      }
      const patchSchema = z.object({
        label: z.string().max(120).optional(),
        enabled: z.boolean().optional(),
        deliveryFee: z.number().min(0).max(100000).nullable().optional(),
        minOrderAmount: z.number().min(0).max(1000000).nullable().optional(),
      });
      const parsed = patchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Invalid PIN code update payload' });
      }
      const ref = getFirestore().collection('deliveryPincodes').doc(pincode);
      const existing = await ref.get();
      const defaultPin = DEFAULT_RETAIL_PINCODES[pincode];
      if (!existing.exists && !defaultPin) {
        return res.status(404).json({ success: false, error: `PIN code ${pincode} does not exist.` });
      }
      const actorEmail = (req as any).authUser.email || (req as any).authUser.uid;
      const update: Record<string, any> = {
        pincode,
        ...(defaultPin && !existing.exists ? { label: defaultPin.label, enabled: defaultPin.enabled, areas: defaultPin.areas } : {}),
        updatedAt: new Date().toISOString(),
      };
      if (parsed.data.label !== undefined) update.label = parsed.data.label;
      if (parsed.data.enabled !== undefined) update.enabled = parsed.data.enabled;
      if (parsed.data.deliveryFee !== undefined) update.deliveryFee = parsed.data.deliveryFee;
      if (parsed.data.minOrderAmount !== undefined) update.minOrderAmount = parsed.data.minOrderAmount;
      await ref.set(update, { merge: true });
      await writeAuditLogDirect(actorEmail, 'UPDATE_DELIVERY_PINCODE', 'DELIVERY', `Updated PIN code ${pincode}: ${JSON.stringify(parsed.data)}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Failed to update delivery pincode:', err);
      res.status(500).json({ success: false, error: 'Failed to update PIN code' });
    }
  });

  app.post('/api/admin/delivery/pincodes/:pincode/delete', strictApiLimiter, requireAuth, requireAdmin, async (req, res) => {
    try {
      const pincode = req.params.pincode;
      const ref = getFirestore().collection('deliveryPincodes').doc(pincode);
      await ref.delete();
      const actorEmail = (req as any).authUser.email || (req as any).authUser.uid;
      await writeAuditLogDirect(actorEmail, 'REMOVE_DELIVERY_PINCODE', 'DELIVERY', `Removed PIN code ${pincode}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Failed to remove delivery pincode:', err);
      res.status(500).json({ success: false, error: 'Failed to remove PIN code' });
    }
  });

  // Seeds/syncs the 13 Bangalore retail areas across the 5 PIN codes as ACTIVE.
  app.post('/api/admin/delivery/pincodes/seed-candidates', strictApiLimiter, requireAuth, requireAdmin, async (req, res) => {
    try {
      const db = getFirestore();
      const actorEmail = (req as any).authUser.email || (req as any).authUser.uid;
      const now = new Date().toISOString();
      const batch = db.batch();
      let added = 0;
      for (const item of Object.values(DEFAULT_RETAIL_PINCODES)) {
        added++;
        batch.set(db.collection('deliveryPincodes').doc(item.pincode), {
          pincode: item.pincode,
          label: item.label,
          areas: item.areas,
          enabled: true,
          updatedAt: now,
          createdBy: actorEmail,
        }, { merge: true });
      }
      await batch.commit();
      await writeAuditLogDirect(actorEmail, 'SEED_CANDIDATE_PINCODES', 'DELIVERY', `Activated 13 Bangalore retail areas across ${added} PIN code(s)`);
      res.json({ success: true, added, skipped: 0 });
    } catch (err: any) {
      console.error('Failed to seed retail pincodes:', err);
      res.status(500).json({ success: false, error: 'Failed to seed retail PIN codes' });
    }
  });

  // Public endpoint returning active retail areas & Pan-India wholesale status
  app.get('/api/delivery/active-areas', apiLimiter, async (req, res) => {
    try {
      const mergedMap = new Map<string, any>();
      Object.values(DEFAULT_RETAIL_PINCODES).forEach((item) => {
        mergedMap.set(item.pincode, { ...item });
      });
      try {
        const snap = await getFirestore().collection('deliveryPincodes').get();
        snap.docs.forEach((d) => {
          const data = d.data() as any;
          const base = mergedMap.get(d.id) || {};
          mergedMap.set(d.id, { ...base, pincode: d.id, ...data });
        });
      } catch {
        // Fallback to DEFAULT_RETAIL_PINCODES when Firestore is offline
      }
      const activePincodes = Array.from(mergedMap.values()).filter((p) => p.enabled === true);
      res.json({
        success: true,
        retailAreas: DEFAULT_RETAIL_AREAS,
        activePincodes,
        wholesalePanIndia: true,
      });
    } catch (err: any) {
      res.json({
        success: true,
        retailAreas: DEFAULT_RETAIL_AREAS,
        activePincodes: DEFAULT_RETAIL_PINCODES,
        wholesalePanIndia: true,
      });
    }
  });

  // -------------------------------------------------------------------------
  // GOOGLE MAPS GROUNDING & LOCATION INTELLIGENCE (gemini-3.8-flash + googleMaps)
  // -------------------------------------------------------------------------
  app.post('/api/maps/grounding', trackOrderLimiter, async (req, res) => {
    try {
      const { query, lat, lng } = req.body || {};
      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return res.status(400).json({ success: false, error: 'A valid location query or landmark is required.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ success: false, error: 'Maps intelligence service is currently unconfigured.' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const hasCoordinates = typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Provide accurate real-time geographic details, nearby landmarks, accessibility, and delivery neighborhood guidance for: "${query.trim()}". Mention relevant Bangalore/India locality context for fresh food delivery.`,
        config: {
          tools: [{ googleMaps: {} }],
          ...(hasCoordinates ? {
            toolConfig: {
              retrievalConfig: {
                latLng: {
                  latitude: Number(lat),
                  longitude: Number(lng),
                },
              },
            },
          } : {}),
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const mapsLinks: Array<{ uri: string; title: string }> = [];
      const reviewSnippets: string[] = [];

      for (const chunk of chunks as any[]) {
        if (chunk.maps?.uri) {
          mapsLinks.push({
            uri: chunk.maps.uri,
            title: chunk.maps.title || 'View location on Google Maps',
          });
        }
        if (Array.isArray(chunk.maps?.placeAnswerSources?.reviewSnippets)) {
          for (const s of chunk.maps.placeAnswerSources.reviewSnippets) {
            if (typeof s === 'string') reviewSnippets.push(s);
          }
        }
      }

      return res.json({
        success: true,
        text: response.text || '',
        mapsLinks,
        reviewSnippets,
        groundingChunks: chunks,
      });
    } catch (err: any) {
      console.error('Maps grounding error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve Google Maps intelligence.' });
    }
  });

  // -------------------------------------------------------------------------
  // PUBLIC CATALOG RECOVERY ENDPOINT (RESILIENT AGAINST CLIENT FIRESTORE ERRORS)
  // -------------------------------------------------------------------------
  app.get('/api/catalog/products', async (_req, res) => {
    try {
      const mergedMap = new Map<string, any>();
      for (const p of BUNDLED_PRODUCTS) {
        mergedMap.set(String(p.id), { ...p, id: String(p.id) });
      }
      try {
        const snap = await getFirestore().collection('products').get();
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const id = String(docSnap.id);
          if (data?.isDeleted === true) {
            mergedMap.delete(id);
            return;
          }
          const base = mergedMap.get(id) || {};
          mergedMap.set(id, {
            ...base,
            ...data,
            id,
            categoryId: data.categoryId || base.categoryId || 'general',
            subcategoryId: data.subcategoryId || base.subcategoryId,
            subSubcategoryId: data.subSubcategoryId || base.subSubcategoryId,
            unit: data.unit || base.unit || '1 kg',
            image: data.image || base.image || '',
            weights: Array.isArray(data.weights) && data.weights.length > 0 ? data.weights : base.weights,
          });
        });
      } catch (dbErr) {
        console.warn('[/api/catalog/products] Firestore read failed, serving bundled catalog:', (dbErr as any)?.message || dbErr);
      }
      return res.json({
        success: true,
        products: Array.from(mergedMap.values()),
        syncedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to load catalog.' });
    }
  });

  // -------------------------------------------------------------------------
  // SECURE WHATSAPP ORDER PREPARATION (ALL REQUIRED DETAILS MANDATORY)
  // -------------------------------------------------------------------------
  const whatsappIdempotencyCache = new Map<string, { expiresAt: number; response: any }>();

  const whatsappPrepareSchema = z.object({
    items: z.array(z.object({
      id: z.union([z.string(), z.number()]),
      baseId: z.union([z.string(), z.number()]).optional(),
      name: z.string().max(200).optional(),
      quantity: z.number().int().min(1).max(500),
      selectedWeight: z.string().max(60).nullable().optional(),
      selectedCut: z.string().max(60).nullable().optional(),
    })).min(1).max(100),
    orderType: z.enum(['retail', 'wholesale']).optional().default('retail'),
    couponCode: z.string().max(50).nullable().optional(),
    shippingDetails: z.object({
      name: z.string().trim().min(2, 'Customer full name is mandatory for WhatsApp orders.').max(100),
      phone: z.string().trim().min(7, 'Valid contact phone number is mandatory for WhatsApp orders.').max(30),
      whatsappPhone: z.string().trim().max(30).optional(),
      houseNo: z.string().trim().max(120).optional().default(''),
      street: z.string().trim().max(200).optional().default(''),
      area: z.string().trim().max(120).optional().default(''),
      city: z.string().trim().max(80).optional().default('Bangalore'),
      state: z.string().trim().max(80).optional().default('Karnataka'),
      landmark: z.string().trim().max(200).optional().default(''),
      addressType: z.enum(['Home', 'Work', 'Other']).optional().default('Home'),
      deliveryInstructions: z.string().trim().max(300).optional().default(''),
      address: z.string().trim().min(5, 'Complete delivery street address is mandatory for WhatsApp orders.').max(500),
      pincode: z.string().trim().min(6, 'Valid 6-digit postal PIN code is mandatory for WhatsApp orders.').max(12),
      firstName: z.string().max(80).optional(),
      lastName: z.string().max(80).optional(),
    }),
  });

  app.post('/api/whatsapp/prepare-order', orderLimiter, optionalAuth, async (req, res) => {
    try {
      const idempotencyKey = typeof req.headers['idempotency-key'] === 'string'
        ? req.headers['idempotency-key'].trim().slice(0, 128)
        : '';

      if (idempotencyKey) {
        const cached = whatsappIdempotencyCache.get(idempotencyKey);
        if (cached && cached.expiresAt > Date.now()) {
          return res.json(cached.response);
        }
      }

      const parsed = whatsappPrepareSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: parsed.error.issues[0]?.message || 'All shipping details (Name, Phone, Address, PIN Code) are mandatory for WhatsApp orders.',
        });
      }

      const { items, orderType, couponCode, shippingDetails } = parsed.data;

      const rawPhone = String(shippingDetails.phone || '').trim();
      const normalizedPhone = rawPhone.replace(/[\s().-]/g, '').replace(/^0+/, '');
      if (!/^\+?[1-9]\d{6,14}$/.test(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid international or Indian phone number (e.g. +91 9876543210).',
        });
      }

      const cleanPin = normalizePincode(shippingDetails.pincode);
      if (!isValidIndianPincode(cleanPin)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid 6-digit Indian PIN code.',
        });
      }

      let deliveryFee = 40;
      let freeDeliveryThreshold = 0;
      if (orderType === 'wholesale') {
        const zone = await findWholesaleZoneForPincode(cleanPin);
        deliveryFee = zone ? zone.shippingFee : DEFAULT_PAN_INDIA_WHOLESALE_ZONE.shippingFee;
      } else {
        const pinRecord = await getRetailPincode(cleanPin);
        if (!pinRecord || pinRecord.enabled !== true) {
          return res.status(400).json({
            success: false,
            error: 'Retail delivery via WhatsApp is currently active in our 13 Bangalore service areas (PINs: 560084, 560043, 560045, 560032, 560005).',
          });
        }
        if (typeof pinRecord.deliveryFee === 'number') {
          deliveryFee = pinRecord.deliveryFee;
        }
        try {
          const settings = await getStoreDeliverySettings();
          if (typeof settings.deliveryFee === 'number') deliveryFee = settings.deliveryFee;
          if (typeof (settings as any).freeDeliveryThreshold === 'number') {
            freeDeliveryThreshold = (settings as any).freeDeliveryThreshold;
          }
        } catch {
          // Use default deliveryFee when Firestore settings are offline
        }
      }

      // Compute authoritative item prices: try Firestore first, fallback to bundled catalog if DB is offline
      let subtotal = 0;
      let priceVerified = true;
      const validatedItems: any[] = [];
      try {
        const calc = await calculateOrderTotals(items, orderType);
        subtotal = calc.subtotal;
        validatedItems.push(...calc.validatedItems);
        priceVerified = true;
      } catch {
        // Fallback to server's bundled catalog so WhatsApp ordering works even when Firestore is unreachable
        for (const reqItem of items) {
          const rawId = String(reqItem.baseId ?? reqItem.id ?? '');
          const baseId = rawId.includes('-') ? rawId.split('-')[0] : rawId;
          const bundled = BUNDLED_PRODUCTS.find((p) => String(p.id) === baseId);
          if (!bundled) {
            return res.status(400).json({
              success: false,
              error: `Product "${reqItem.name || baseId}" was not found in the authoritative catalog.`,
            });
          }
          let unitPrice = Number(bundled.numericPrice) || parseFloat(String(bundled.price).replace(/[^0-9.]/g, '')) || 0;
          if (reqItem.selectedWeight && Array.isArray((bundled as any).weights)) {
            const wOpt = (bundled as any).weights.find(
              (w: any) => w.label === reqItem.selectedWeight || w.weight === reqItem.selectedWeight
            );
            if (wOpt && wOpt.price) {
              unitPrice = Number(wOpt.price) || parseFloat(String(wOpt.price).replace(/[^0-9.]/g, '')) || unitPrice;
            }
          }
          if (orderType === 'wholesale' && typeof (bundled as any).wholesalePrice === 'number' && (bundled as any).wholesalePrice > 0) {
            unitPrice = (bundled as any).wholesalePrice;
          }
          if (unitPrice <= 0) {
            return res.status(400).json({
              success: false,
              error: `Invalid price for "${bundled.name}".`,
            });
          }
          subtotal += unitPrice * reqItem.quantity;
          validatedItems.push({
            id: reqItem.id,
            name: bundled.name,
            quantity: reqItem.quantity,
            price: unitPrice,
            selectedWeight: reqItem.selectedWeight || null,
            selectedCut: reqItem.selectedCut || null,
            image: bundled.image || null,
          });
        }
        priceVerified = true;
      }

      if (freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold) {
        deliveryFee = 0;
      }

      let discountAmount = 0;
      if (couponCode && couponCode.trim()) {
        try {
          const cSnap = await getFirestore().collection('coupons').doc(couponCode.trim().toUpperCase()).get();
          if (cSnap.exists) {
            const cData = cSnap.data() as any;
            if (cData && cData.isActive !== false && (!cData.minOrder || subtotal >= Number(cData.minOrder))) {
              if (cData.type === 'percentage') {
                discountAmount = Math.round((subtotal * Number(cData.value || 0)) / 100);
                if (cData.maxDiscount && discountAmount > Number(cData.maxDiscount)) {
                  discountAmount = Number(cData.maxDiscount);
                }
              } else {
                discountAmount = Math.min(subtotal, Number(cData.value || 0));
              }
            }
          }
        } catch {
          // Ignore coupon lookup failure if DB is offline
        }
      }

      const grandTotal = Math.max(0, subtotal - discountAmount) + deliveryFee;
      const orderId = generateOrderId();
      const hmacSecret = env.RAZORPAY_KEY_SECRET || env.CRON_SECRET || 'jiyoo-whatsapp-hmac-v1';
      const signatureDigest = crypto
        .createHmac('sha256', hmacSecret)
        .update(`${orderId}:${grandTotal}:${orderType}:${validatedItems.map((i) => `${i.id}x${i.quantity}@${i.price}`).join(',')}`)
        .digest('hex')
        .slice(0, 10)
        .toUpperCase();
      const verificationCode = `WA-${signatureDigest}`;

      const resolvedArea = shippingDetails.area || '';
      const resolvedCity = shippingDetails.city || 'Bangalore';
      const resolvedState = shippingDetails.state || 'Karnataka';

      // Persist authentic order record to Firestore with status AWAITING_WHATSAPP_CONFIRMATION
      const authUser = (req as any).authUser;
      try {
        await getFirestore().collection('orders').doc(orderId).set({
          id: orderId,
          orderId,
          items: validatedItems,
          subtotal,
          discountAmount,
          couponCode: couponCode ? couponCode.trim().toUpperCase() : null,
          deliveryFee,
          amount: grandTotal,
          grandTotal,
          status: 'AWAITING_WHATSAPP_CONFIRMATION',
          orderStatus: 'AWAITING_WHATSAPP_CONFIRMATION',
          paymentStatus: 'unpaid',
          paymentMethod: 'WhatsApp Express',
          verificationCode,
          priceVerified,
          orderType,
          isGuestWhatsApp: !authUser?.uid,
          userId: authUser?.uid || null,
          shippingDetails: {
            name: shippingDetails.name,
            firstName: shippingDetails.firstName || shippingDetails.name,
            lastName: shippingDetails.lastName || '',
            phone: normalizedPhone,
            whatsappPhone: shippingDetails.whatsappPhone || normalizedPhone,
            houseNo: shippingDetails.houseNo || '',
            street: shippingDetails.street || '',
            area: resolvedArea,
            city: resolvedCity,
            state: resolvedState,
            landmark: shippingDetails.landmark || '',
            addressType: shippingDetails.addressType || 'Home',
            deliveryInstructions: shippingDetails.deliveryInstructions || '',
            address: shippingDetails.address,
            pincode: cleanPin,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          whatsappExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        });
      } catch (persistErr) {
        console.warn('[WhatsApp] Running in stateless verified mode (database write skipped):', (persistErr as any)?.message || persistErr);
      }

      const responsePayload = {
        success: true,
        orderId,
        verificationCode,
        priceVerified,
        subtotal,
        discountAmount,
        deliveryFee,
        grandTotal,
        orderType,
        orderStatus: 'AWAITING_WHATSAPP_CONFIRMATION',
        validatedItems,
      };

      if (idempotencyKey) {
        whatsappIdempotencyCache.set(idempotencyKey, {
          expiresAt: Date.now() + 15 * 60 * 1000,
          response: responsePayload,
        });
      }

      return res.json(responsePayload);
    } catch (err: any) {
      console.error('WhatsApp order prepare error:', err);
      return res.status(500).json({ success: false, error: 'Failed to process WhatsApp order.' });
    }
  });

  // Public, read-only: checkout calls this to validate one address at a
  // time. Never returns the full list, so the set of serviceable localities
  // is never exposed to the client (per the brief's explicit requirement).
  app.get('/api/delivery/check-pincode', trackOrderLimiter, async (req, res) => {
    try {
      const pincode = normalizePincode(req.query.pincode);
      const mode = req.query.mode === 'wholesale' ? 'wholesale' : 'retail';
      if (!/^\d{6}$/.test(pincode)) {
        return res.status(400).json({ success: false, serviceable: false, error: 'Enter a valid 6-digit PIN code.' });
      }
      if (mode === 'wholesale') {
        const zone = await findWholesaleZoneForPincode(pincode);
        if (!zone) {
          return res.json({ success: true, serviceable: false, message: 'We do not currently ship wholesale orders to this PIN code.' });
        }
        return res.json({ success: true, serviceable: true, shippingFee: zone.shippingFee, minOrderValue: zone.minOrderValue, etaDays: zone.etaDays || null, zoneLabel: zone.label });
      }
      const pin = await getRetailPincode(pincode);
      if (!pin || pin.enabled !== true) {
        return res.json({ success: true, serviceable: false, message: 'Sorry, we do not currently deliver retail orders to this PIN code. Switch to Wholesale for Pan-India delivery.' });
      }
      let deliveryFee = 40;
      let minOrderAmount = 0;
      try {
        const settings = await getStoreDeliverySettings();
        deliveryFee = settings.deliveryFee;
        minOrderAmount = settings.minOrderAmount;
      } catch {
        // Fallback to defaults if Firestore is offline
      }
      return res.json({
        success: true,
        serviceable: true,
        label: pin.label || '',
        areas: pin.areas || [],
        deliveryFee: typeof pin.deliveryFee === 'number' ? pin.deliveryFee : deliveryFee,
        minOrderAmount: typeof pin.minOrderAmount === 'number' ? pin.minOrderAmount : minOrderAmount,
      });
    } catch (err: any) {
      console.error('Failed to check pincode serviceability:', err);
      res.status(500).json({ success: false, serviceable: false, error: 'Could not check delivery availability right now.' });
    }
  });

  // -------------------------------------------------------------------------
  // WHOLESALE SHIPPING ZONE MANAGEMENT (admin-only)
  // -------------------------------------------------------------------------
  const zoneBodySchema = z.object({
    label: z.string().min(1).max(120),
    pincodePrefixes: z.array(z.string().regex(/^(\d{3}|ALL|\*)$/i, 'Each prefix must be 3 digits or ALL for Pan-India')).min(1).max(200),
    enabled: z.boolean().optional().default(true),
    shippingFee: z.number().min(0).max(100000),
    minOrderValue: z.number().min(0).max(1000000),
    etaDays: z.string().max(40).optional(),
  });

  app.get('/api/admin/wholesale/zones', requireAuth, requireAdmin, async (req, res) => {
    try {
      let zones: any[] = [];
      try {
        const snap = await getFirestore().collection('wholesaleZones').orderBy('label', 'asc').get();
        zones = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (dbErr) {
        console.warn('Firestore wholesaleZones read failed, returning Pan-India default zone:', dbErr);
      }
      if (zones.length === 0) {
        zones = [{ ...DEFAULT_PAN_INDIA_WHOLESALE_ZONE }];
      }
      res.json({ success: true, zones });
    } catch (err: any) {
      console.error('Failed to list wholesale zones:', err);
      res.status(500).json({ success: false, error: 'Failed to list wholesale zones' });
    }
  });

  app.post('/api/admin/wholesale/zones', strictApiLimiter, requireAuth, requireAdmin, async (req, res) => {
    try {
      const parsed = zoneBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid wholesale zone data' });
      }
      const actorEmail = (req as any).authUser.email || (req as any).authUser.uid;
      const now = new Date().toISOString();
      const ref = getFirestore().collection('wholesaleZones').doc();
      await ref.set({ ...parsed.data, createdAt: now, updatedAt: now });
      await writeAuditLogDirect(actorEmail, 'ADD_WHOLESALE_ZONE', 'DELIVERY', `Added wholesale zone "${parsed.data.label}" (${parsed.data.pincodePrefixes.length} prefixes)`);
      res.json({ success: true, id: ref.id });
    } catch (err: any) {
      console.error('Failed to add wholesale zone:', err);
      res.status(500).json({ success: false, error: 'Failed to add wholesale zone' });
    }
  });

  app.post('/api/admin/wholesale/zones/:id', strictApiLimiter, requireAuth, requireAdmin, async (req, res) => {
    try {
      const parsed = zoneBodySchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Invalid wholesale zone update payload' });
      }
      const ref = getFirestore().collection('wholesaleZones').doc(req.params.id);
      const existing = await ref.get();
      if (!existing.exists && req.params.id !== DEFAULT_PAN_INDIA_WHOLESALE_ZONE.id) {
        return res.status(404).json({ success: false, error: 'Wholesale zone not found' });
      }
      const baseData = !existing.exists && req.params.id === DEFAULT_PAN_INDIA_WHOLESALE_ZONE.id
        ? { ...DEFAULT_PAN_INDIA_WHOLESALE_ZONE }
        : {};
      await ref.set({ ...baseData, ...parsed.data, updatedAt: new Date().toISOString() }, { merge: true });
      const actorEmail = (req as any).authUser.email || (req as any).authUser.uid;
      await writeAuditLogDirect(actorEmail, 'UPDATE_WHOLESALE_ZONE', 'DELIVERY', `Updated wholesale zone ${req.params.id}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Failed to update wholesale zone:', err);
      res.status(500).json({ success: false, error: 'Failed to update wholesale zone' });
    }
  });

  app.post('/api/admin/wholesale/zones/:id/delete', strictApiLimiter, requireAuth, requireAdmin, async (req, res) => {
    try {
      const ref = getFirestore().collection('wholesaleZones').doc(req.params.id);
      await ref.delete();
      const actorEmail = (req as any).authUser.email || (req as any).authUser.uid;
      await writeAuditLogDirect(actorEmail, 'REMOVE_WHOLESALE_ZONE', 'DELIVERY', `Removed wholesale zone ${req.params.id}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Failed to remove wholesale zone:', err);
      res.status(500).json({ success: false, error: 'Failed to remove wholesale zone' });
    }
  });

  // -------------------------------------------------------------------------
  // BANNER / CAMPAIGN PUBLIC FEED
  // -------------------------------------------------------------------------
  // Banners themselves are managed via direct admin Firestore writes (like
  // Products/Categories), but the PUBLIC list is served here so draft,
  // scheduled-future, unpublished, and expired campaigns are never exposed
  // to customers reading Firestore directly.
  app.get('/api/banners/active', async (req, res) => {
    try {
      const nowIso = new Date().toISOString();
      const snap = await getFirestore().collection('banners').where('isPublished', '==', true).get();
      const active = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((b) => (!b.startDate || b.startDate <= nowIso) && (!b.endDate || b.endDate >= nowIso))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((b) => ({
          id: b.id,
          campaignName: b.campaignName,
          heading: b.heading,
          description: b.description || '',
          desktopImage: b.desktopImage,
          mobileImage: b.mobileImage || b.desktopImage,
          ctaLabel: b.ctaLabel || '',
          ctaLinkType: b.ctaLinkType || 'none',
          ctaLinkValue: b.ctaLinkValue || '',
        }));
      res.json({ success: true, banners: active });
    } catch (err: any) {
      console.error('Failed to load active banners:', err);
      res.status(500).json({ success: false, banners: [] });
    }
  });

  // Paginated admin order feed. The browser never downloads the entire order
  // collection: each request returns at most 50 orders. For the All view we
  // merge the status queues server-side in the same business-status order used
  // by the admin UI, then sort newest-first within each queue. Cursors are
  // maintained independently per queue so moving between pages remains stable
  // even while new orders are being created.
  const ADMIN_ORDER_PAGE_SIZE = 50;
  const ADMIN_ORDER_QUEUES: Array<{ key: string; statuses: string[] }> = [
    { key: 'ordered', statuses: ['pending', 'whatsapp_pending', 'AWAITING_WHATSAPP_CONFIRMATION', 'RECEIVED', 'paid_upi_pending_verify'] },
    { key: 'confirmed', statuses: ['confirmed'] },
    { key: 'processing', statuses: ['processing'] },
    { key: 'packed', statuses: ['packed'] },
    { key: 'dispatched', statuses: ['dispatched', 'shipped'] },
    { key: 'out_for_delivery', statuses: ['out_for_delivery'] },
    { key: 'delivered', statuses: ['delivered', 'completed'] },
    { key: 'cancelled', statuses: ['cancelled'] },
  ];

  const encodeAdminOrderCursor = (value: Record<string, any>) =>
    Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  const decodeAdminOrderCursor = (value: unknown): Record<string, any> | null => {
    if (typeof value !== 'string' || value.length > 12000) return null;
    try {
      const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  };

  app.get('/api/admin/orders', strictApiLimiter, requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const requestedQueue = typeof req.query.status === 'string' ? req.query.status : 'all';
      const queue = requestedQueue === 'all'
        ? null
        : ADMIN_ORDER_QUEUES.find((entry) => entry.key === requestedQueue);
      if (requestedQueue !== 'all' && !queue) {
        return res.status(400).json({ success: false, error: 'Invalid order status filter.' });
      }

      const rawPageSize = Number(req.query.pageSize || ADMIN_ORDER_PAGE_SIZE);
      const pageSize = Number.isInteger(rawPageSize) ? Math.max(1, Math.min(ADMIN_ORDER_PAGE_SIZE, rawPageSize)) : ADMIN_ORDER_PAGE_SIZE;
      const decoded = decodeAdminOrderCursor(req.query.cursor);
      const cursors = decoded?.queues && typeof decoded.queues === 'object' ? decoded.queues : {};
      const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const db = getFirestore();

      if (search) {
        const byId = await db.collection('orders').doc(search).get();
        if (byId.exists) {
          const d = byId.data() as any;
          const canonical = String(d.orderStatus || d.status || 'pending');
          if (!queue || queue.statuses.includes(canonical)) return res.json({ success:true, orders:[{ id:byId.id, ...d }], pageSize:1, hasMore:false, nextCursor:null, search:true });
        }
        const normalized = search.toLowerCase();
        const phoneDigits = search.replace(/\D/g,'');
        const statusEntries = queue ? [queue] : ADMIN_ORDER_QUEUES;
        const searchResults = new Map<string, any>();
        for (const entry of statusEntries) {
          const base = db.collection('orders').where('orderStatus','in',entry.statuses);
          const queries: FirebaseFirestore.Query[] = [];
          if (normalized.includes('@')) queries.push(base.where('shippingDetails.email','==',normalized).orderBy('createdAt','desc'));
          if (phoneDigits.length >= 7) queries.push(base.where('shippingDetails.phone','==',phoneDigits).orderBy('createdAt','desc'));
          queries.push(base.where('shippingDetails.name','==',search).orderBy('createdAt','desc'));
          for (const sq of queries) {
            try {
              const snap = await sq.limit(pageSize).get();
              for (const d of snap.docs) searchResults.set(d.id,{ id:d.id, ...d.data() });
            } catch {
              // Ignore missing index or query failure on individual search leg
            }
          }
        }
        const results = [...searchResults.values()].sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || String(b.id).localeCompare(String(a.id))).slice(0,pageSize);
        return res.json({ success:true, orders:results, pageSize, hasMore:false, nextCursor:null, search:true });
      }

      const fetchQueue = async (entry: { key: string; statuses: string[] }) => {
        let q: FirebaseFirestore.Query = db.collection('orders');
        q = q.where('orderStatus', 'in', entry.statuses).orderBy('createdAt', 'desc').orderBy('__name__', 'desc');
        const cursor = cursors[entry.key];
        if (cursor && typeof cursor.createdAt === 'string' && typeof cursor.id === 'string') {
          q = q.startAfter(cursor.createdAt, cursor.id);
        }
        // Fetch a bounded amount from each queue. We only return pageSize
        // records to the browser; the extra buffer lets the server merge queues
        // without ever loading the whole collection.
        const snap = await q.limit(pageSize).get();
        return {
          entry,
          docs: snap.docs,
        };
      };

      const queuesToFetch = queue ? [queue] : ADMIN_ORDER_QUEUES;
      const results = await Promise.all(queuesToFetch.map(fetchQueue));
      const rank = new Map(ADMIN_ORDER_QUEUES.map((entry, index) => [entry.key, index]));
      const candidates = results.flatMap(({ entry, docs }) => docs.map((docSnap) => ({
        queue: entry.key,
        rank: rank.get(entry.key) ?? 999,
        id: docSnap.id,
        data: docSnap.data(),
      })));

      candidates.sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        const aTime = String(a.data?.createdAt || '');
        const bTime = String(b.data?.createdAt || '');
        const timeCompare = bTime.localeCompare(aTime);
        return timeCompare || b.id.localeCompare(a.id);
      });

      const page = candidates.slice(0, pageSize);
      const nextQueues: Record<string, { createdAt: string; id: string }> = { ...cursors };
      for (const item of page) {
        const createdAt = item.data?.createdAt;
        const normalized = typeof createdAt === 'string'
          ? createdAt
          : (createdAt?.toDate ? createdAt.toDate().toISOString() : (createdAt?.seconds ? new Date(createdAt.seconds * 1000).toISOString() : String(createdAt || '')));
        if (normalized) nextQueues[item.queue] = { createdAt: normalized, id: item.id };
      }

      // A cursor only advances queues represented in this page. This is what
      // makes page 2 continue after the last returned record without skipping
      // queues that had not yet reached the first page.
      const hasMore = candidates.length > page.length || results.some(({ docs }) => docs.length === pageSize);
      const nextCursor = hasMore && page.length
        ? encodeAdminOrderCursor({ queues: nextQueues })
        : null;

      const orders = page.map(({ id, data }) => ({ id, ...data }));
      return res.json({ success: true, orders, pageSize, hasMore, nextCursor });
    } catch (err: any) {
      console.error('Admin order feed failed:', err);
      return res.status(500).json({ success: false, error: 'Failed to load orders' });
    }
  });

  // Authoritative admin order-state transition. The client may render only valid
  // transitions for convenience, but the server is the final authority.
  app.post('/api/admin/orders/:id/status', strictApiLimiter, requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const orderId = req.params.id;
      const nextStatus = String(req.body?.status || '').trim();
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : null;
      const allowed: Record<string, string[]> = {
        AWAITING_WHATSAPP_CONFIRMATION: ['RECEIVED', 'pending', 'confirmed', 'cancelled'],
        RECEIVED: ['confirmed', 'processing', 'cancelled'],
        whatsapp_pending: ['RECEIVED', 'pending', 'confirmed', 'cancelled'],
        pending: ['confirmed', 'cancelled'],
        confirmed: ['processing', 'cancelled'],
        processing: ['packed', 'cancelled'],
        paid_upi_pending_verify: ['confirmed', 'cancelled'],
        packed: ['dispatched'],
        dispatched: ['out_for_delivery', 'delivered'],
        out_for_delivery: ['delivered'],
        delivered: [],
        cancelled: [],
        refunded: [],
      };
      const db = getFirestore();
      const ref = db.collection('orders').doc(orderId);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ success: false, error: 'Order not found' });
      const data = snap.data() as any;
      const current = String(data?.orderStatus || data?.status || 'pending');
      if (!(allowed[current] || []).includes(nextStatus)) {
        return res.status(400).json({ success: false, error: `Cannot transition order from ${current} to ${nextStatus}.` });
      }

      if (nextStatus === 'cancelled') {
        const result = await cancelOrderAtomically(db, ref, reason);
        if (result.inventoryAction === 'release_reservation' && result.reservationId) {
          try {
            await releaseInventoryReservation(db, result.reservationId, 'order_cancelled');
            await ref.update({ inventoryReleasedAt: new Date().toISOString(), inventoryReleasePending: false });
          } catch (inventoryErr) {
            console.error('Failed to release reservation after admin cancellation:', inventoryErr);
            await ref.update({ inventoryReleasePending: true, inventoryReleaseError: String((inventoryErr as any)?.message || inventoryErr).slice(0, 500) });
          }
        } else if (result.inventoryAction === 'restore_stock') {
          try {
            await restoreInventory((await ref.get()).data()?.items || []);
            await ref.update({ inventoryReleasedAt: new Date().toISOString(), inventoryReleasePending: false });
          } catch (inventoryErr) {
            console.error('Failed to restore stock after admin cancellation:', inventoryErr);
            await ref.update({ inventoryReleasePending: true, inventoryReleaseError: String((inventoryErr as any)?.message || inventoryErr).slice(0, 500) });
          }
        }
        await db.collection('audit_logs').add({
          action: 'UPDATE_ORDER_STATUS',
          category: 'ORDERS',
          actor: (req as any).authUser?.email || (req as any).authUser?.uid || 'admin',
          details: `Order ${orderId}: ${current} -> cancelled`,
          createdAt: new Date().toISOString(),
        });
        return res.json({ success: true, refundRequired: result.refundRequired, paymentStatus: result.paymentStatus });
      }

      await ref.update({
        status: nextStatus,
        orderStatus: nextStatus,
        ...(reason ? { statusChangeReason: reason } : {}),
        updatedAt: new Date().toISOString(),
      });
      await db.collection('audit_logs').add({
        action: 'UPDATE_ORDER_STATUS',
        category: 'ORDERS',
        actor: (req as any).authUser?.email || (req as any).authUser?.uid || 'admin',
        details: `Order ${orderId}: ${current} -> ${nextStatus}`,
        createdAt: new Date().toISOString(),
      });
      return res.json({ success: true, refundRequired: false });
    } catch (err: any) {
      console.error('Admin order status transition failed:', err);
      return res.status(500).json({ success: false, error: 'Failed to update order status' });
    }
  });

  // Authoritative admin payment-status update. Payment status is financial
  // state, so the admin UI must never write it directly through the client SDK.
  // Manual marking is intentionally limited to operational states; Razorpay
  // captures/refunds remain driven by the gateway verification/refund routes.
  app.post('/api/admin/orders/:id/payment-status', strictApiLimiter, requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const orderId = String(req.params.id);
      const nextPaymentStatus = String(req.body?.status || '').trim().toLowerCase();
      const allowed = ['unpaid', 'payment_pending', 'paid', 'failed'];
      if (!allowed.includes(nextPaymentStatus)) {
        return res.status(400).json({ success: false, error: 'Invalid payment status' });
      }

      const db = getFirestore();
      const orderRef = db.collection('orders').doc(orderId);
      const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(orderRef);
        if (!snap.exists) return { ok: false as const, error: 'ORDER_NOT_FOUND' };
        const data = snap.data() as any;
        const current = String(data?.paymentStatus || 'unpaid').toLowerCase();

        // Never allow a manual UI action to overwrite a completed refund or
        // an already-captured Razorpay payment. Those states are reconciled
        // from the gateway and must not be downgraded accidentally.
        if (current === 'refunded' || current === 'partially_refunded' || current === 'refund_pending') {
          return { ok: false as const, error: 'PAYMENT_FINALIZED' };
        }
        if (current === 'paid' && nextPaymentStatus !== 'paid') {
          return { ok: false as const, error: 'PAYMENT_ALREADY_PAID' };
        }

        const currentOrderStatus = String(data?.orderStatus || data?.status || 'pending');
        const paymentMethod = String(data?.paymentMethod || '').toLowerCase();
        if (nextPaymentStatus === 'paid' && (paymentMethod.includes('razorpay') || paymentMethod.includes('online payment') || paymentMethod.includes('upi qr'))) {
          return { ok: false as const, error: 'GATEWAY_PAYMENT_CONTROLLED' };
        }
        const shouldConfirm = nextPaymentStatus === 'paid' && currentOrderStatus === 'paid_upi_pending_verify';
        tx.update(orderRef, {
          paymentStatus: nextPaymentStatus,
          ...(shouldConfirm ? { status: 'confirmed', orderStatus: 'confirmed' } : {}),
          paymentStatusUpdatedAt: new Date().toISOString(),
          paymentStatusUpdatedBy: (req as any).authUser?.uid || 'admin',
          updatedAt: new Date().toISOString(),
        });
        return { ok: true as const, orderStatus: shouldConfirm ? 'confirmed' : currentOrderStatus };
      });

      if (!result.ok) {
        if (result.error === 'ORDER_NOT_FOUND') return res.status(404).json({ success: false, error: 'Order not found' });
        if (result.error === 'PAYMENT_FINALIZED') return res.status(409).json({ success: false, error: 'This payment is already refunded or being refunded.' });
        if (result.error === 'PAYMENT_ALREADY_PAID') return res.status(409).json({ success: false, error: 'This payment is already marked as paid.' });
        if (result.error === 'GATEWAY_PAYMENT_CONTROLLED') return res.status(409).json({ success: false, error: 'Gateway payments must be verified from the payment provider; they cannot be manually marked paid.' });
        return res.status(400).json({ success: false, error: 'Payment status update was rejected.' });
      }

      await db.collection('audit_logs').add({
        action: 'UPDATE_PAYMENT_STATUS',
        category: 'BILLING',
        actor: (req as any).authUser?.email || (req as any).authUser?.uid || 'admin',
        details: `Order ${orderId}: payment status -> ${nextPaymentStatus}`,
        createdAt: new Date().toISOString(),
      });

      return res.json({ success: true, paymentStatus: nextPaymentStatus, orderStatus: result.orderStatus });
    } catch (err: any) {
      console.error('Admin payment status update failed:', err);
      return res.status(500).json({ success: false, error: 'Failed to update payment status' });
    }
  });

  // Admin-triggered refund. Actually calls the Razorpay refund API instead of
  // "Refunded" just being a status label an admin selects with no effect.
  // Only works for orders with a captured Razorpay payment on file --
  // COD/WhatsApp/UPI-QR orders have no gateway transaction to reverse here
  // and must still be refunded manually through whatever channel collected
  // the money.
  app.post('/api/admin/orders/:id/refund', strictApiLimiter, requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const orderId = req.params.id;
      const db = getFirestore();
      const orderRef = db.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      const orderData: any = orderSnap.data();

      if (String(orderData?.paymentStatus || '') === 'refunded') {
        return res.status(409).json({ success: false, error: 'A refund for this order is already completed.' });
      }
      if (String(orderData?.paymentStatus || '') === 'refund_pending' && String(orderData?.refundStatus || '') !== 'pending') {
        return res.status(409).json({ success: false, error: 'A refund for this order is already in progress.' });
      }
      if (!orderData?.razorpay_payment_id) {
        return res.status(400).json({
          success: false,
          error: 'This order has no captured Razorpay payment on file. COD, WhatsApp, and UPI-QR orders must be refunded manually through the channel that collected payment.',
        });
      }

      const razorpayInstance = getRazorpay();
      if (!razorpayInstance) {
        return res.status(500).json({ success: false, error: 'Razorpay is not configured on the server.' });
      }

      const { amount } = req.body || {};
      const capturedAmount = Math.round(Number(orderData.grandTotal ?? orderData.amount ?? 0) * 100);
      const alreadyRefundedPaise = Math.round(Number(orderData.refundedAmount || 0) * 100);
      const remainingRefundablePaise = Math.max(0, capturedAmount - alreadyRefundedPaise);
      if (remainingRefundablePaise <= 0) {
        return res.status(409).json({ success: false, error: 'No refundable balance remains on this order.' });
      }
      const requestedAmountPaise = typeof amount === 'number' && amount > 0 ? Math.round(amount * 100) : remainingRefundablePaise;
      if (requestedAmountPaise <= 0 || requestedAmountPaise > remainingRefundablePaise) {
        return res.status(400).json({ success: false, error: 'Refund amount is outside the remaining refundable balance.' });
      }
      const refundAmountPaise = requestedAmountPaise;

      // Claim refund work before calling the gateway so concurrent admin clicks
      // cannot enter the gateway call simultaneously for the same order.
      const actor = (req as any).authUser?.email || (req as any).authUser?.uid || 'admin';
      const refundClaim = await db.runTransaction(async (tx) => {
        const fresh = await tx.get(orderRef);
        const data = fresh.data() as any;
        if (!fresh.exists || String(data?.paymentStatus || '') === 'refunded') return false;
        if (String(data?.paymentStatus || '') === 'refund_pending' && String(data?.refundStatus || '') === 'pending' && Number(data?.refundClaimAmountPaise || 0) > 0) return false;
        tx.update(orderRef, { paymentStatus: 'refund_pending', refundStatus: 'pending', refundClaimAmountPaise: refundAmountPaise, refundClaimedAt: new Date().toISOString(), refundClaimedBy: actor, updatedAt: new Date().toISOString() });
        return true;
      });
      if (!refundClaim) return res.status(409).json({ success: false, error: 'A refund is already being processed for this order.' });

      const refundRequestKey = String(orderData.refundRequestKey || `jiyoo-refund-${orderId}-${refundAmountPaise}`);
      await orderRef.update({ refundRequestKey });
      const refund = await fetchRazorpayRefund(orderData.razorpay_payment_id, refundAmountPaise, refundRequestKey, orderId, actor);

      const isFullRefund = refundAmountPaise >= capturedAmount;

      // Only a full-order refund restores the entire order inventory. Partial
      // refunds need item/quantity attribution; silently restoring everything
      // would overstate stock. The issue/refund workflow can later pass affected
      // items explicitly for precise inventory restoration.
      if (isFullRefund) {
        try {
          await restoreInventoryForRefundOnce(db, orderRef, String(refund.id), Array.isArray(orderData.items) ? orderData.items : []);
        } catch (inventoryErr) {
          console.error('Inventory restoration failed after full refund:', inventoryErr);
          await orderRef.update({ inventoryRestorePending: true, inventoryRestoreError: String((inventoryErr as any)?.message || inventoryErr).slice(0, 500) });
          throw inventoryErr;
        }
      }

      await orderRef.update({
        paymentStatus: isFullRefund ? 'refunded' : 'partially_refunded',
        // Payment state is never copied into fulfillment/order status. A refunded payment
        // can belong to a cancelled, delivered, or otherwise separately tracked order.
        status: orderData.status || orderData.orderStatus || 'confirmed',
        orderStatus: orderData.orderStatus || orderData.status || 'confirmed',
        refundStatus: isFullRefund ? 'completed' : 'partial',
        refundedAmount: FieldValue.increment((refundAmountPaise ?? capturedAmount) / 100),
        razorpay_refund_id: refund.id,
        refundedAt: new Date().toISOString(),
        ...(isFullRefund ? { inventoryRestored: true, inventoryRestorePending: false } : {}),
        refundClaimAmountPaise: FieldValue.delete(),
        refundClaimedAt: FieldValue.delete(),
        refundClaimedBy: FieldValue.delete(),
        updatedAt: new Date().toISOString(),
      });

      const actorEmail = (req as any).authUser?.email || 'unknown';
      await db.collection('audit_logs').add({
        action: 'REFUND_ORDER',
        category: 'ORDERS',
        actor: actorEmail,
        details: `Refunded order ${orderId} (Razorpay refund ${refund.id})`,
        createdAt: new Date().toISOString(),
      });

      res.json({ success: true, refundId: refund.id });
    } catch (err: any) {
      console.error('Refund failed:', err);
      // A gateway/network failure must not strand the order permanently in
      // refund_pending. Leave the money untouched and make the operation
      // retryable. This is safe because the gateway call only happened after
      // the claim was acquired; a successful gateway call proceeds to the
      // completed/partial state update above.
      try {
        const db = getFirestore();
        const orderRef = db.collection('orders').doc(String(req.params.id));
        const failedRefundSnap = await orderRef.get();
        const failedRefundData = failedRefundSnap.data() as any;
        const cancelledRefund = String(failedRefundData?.status || failedRefundData?.orderStatus || '') === 'cancelled';
        await orderRef.update({
          paymentStatus: cancelledRefund ? 'refund_pending' : 'paid',
          refundStatus: 'failed',
          refundClaimAmountPaise: FieldValue.delete(),
          refundClaimedAt: FieldValue.delete(),
          refundClaimedBy: FieldValue.delete(),
          refundError: 'Refund gateway request failed; retry is available.',
          updatedAt: new Date().toISOString(),
        });
      } catch (rollbackErr) {
        console.error('Failed to reset refund claim after gateway failure:', rollbackErr);
      }
      res.status(500).json({ success: false, error: 'Failed to process refund. No refund was confirmed; please retry.' });
    }
  });

// Verified-purchase review creation. Customers may only review a product that
// appears in one of their delivered orders. The client never writes reviews directly.
app.post('/api/reviews', strictApiLimiter, requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const schema = z.object({ productId: z.string().min(1).max(200), rating: z.number().int().min(1).max(5), comment: z.string().trim().min(1).max(2000) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success:false, error: parsed.error.issues[0]?.message || 'Invalid review' });
    const uid = (req as any).authUser?.uid;
    const db = getFirestore();
    const delivered = await db.collection('orders').where('userId','==',uid).get();
    const purchased = delivered.docs.some(d => {
      const o=d.data() as any;
      const st=String(o.orderStatus || o.status || '').toLowerCase();
      return st === 'delivered' && Array.isArray(o.items) && o.items.some((it:any)=> String(it.baseId ?? it.id) === parsed.data.productId);
    });
    if (!purchased) return res.status(403).json({ success:false, error:'You can review this product only after it has been delivered to your account.' });
    const profile = await db.collection('users').doc(uid).get();
    const userData=profile.exists ? profile.data() as any : {};
    const reviewId = crypto.createHash('sha256').update(`${uid}:${parsed.data.productId}`).digest('hex').slice(0, 40);
    const reviewRef = db.collection('reviews').doc(reviewId);
    const reviewPayload = { productId:parsed.data.productId, userId:uid, userName:userData?.name || (req as any).authUser?.name || 'Customer', userPicture:userData?.picture || null, rating:parsed.data.rating, comment:parsed.data.comment, verifiedPurchase:true, createdAt:new Date().toISOString() };
    try {
      await db.runTransaction(async tx => {
        const existing = await tx.get(reviewRef);
        if (existing.exists) throw new Error('REVIEW_ALREADY_EXISTS');
        tx.create(reviewRef, reviewPayload);
      });
    } catch (reviewErr: any) {
      if (reviewErr?.message === 'REVIEW_ALREADY_EXISTS') return res.status(409).json({ success:false, error:'You have already reviewed this product.' });
      throw reviewErr;
    }
    return res.status(201).json({ success:true, review:{id:reviewRef.id,...reviewPayload} });
  } catch (err:any) {
    console.error('Verified review creation failed:', err);
    return res.status(500).json({ success:false, error:'Failed to submit review' });
  }
});

// ENTERPRISE LOGIC: Securely update WhatsApp pending orders
app.post('/api/orders/:id/whatsapp-status', trackOrderLimiter, requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body; // 'pending' or 'cancelled'
    
    if (status !== 'pending' && status !== 'cancelled') {
      return res.status(400).json({ success: false, error: 'Invalid status update' });
    }
    
    const authUser = (req as any).authUser;
    if (!authUser?.uid) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const db = getFirestore();
    const orderRef = db.collection('orders').doc(orderId);

    const txResult = await db.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) {
        return { kind: 'not_found' as const };
      }
      const orderData = orderSnap.data() as any;

      // SECURITY: Strict ownership or admin check. Never allow any caller to
      // mutate an order they do not own.
      if (!orderData?.userId || (authUser.uid !== orderData.userId && authUser.admin !== true)) {
        return { kind: 'forbidden' as const };
      }

      // SECURITY: Only allow state transitions from 'whatsapp_pending'
      if (orderData?.status !== 'whatsapp_pending' && orderData?.orderStatus !== 'whatsapp_pending') {
        return { kind: 'invalid_state' as const };
      }

      const reservationId = orderData?.reservationId ? String(orderData.reservationId) : null;
      const now = new Date().toISOString();
      tx.update(orderRef, {
        status,
        orderStatus: status,
        updatedAt: now,
      });

      return { kind: 'updated' as const, reservationId };
    });

    if (txResult.kind === 'not_found') {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    if (txResult.kind === 'forbidden') {
      return res.status(403).json({ success: false, error: 'Unauthorized to update this order' });
    }
    if (txResult.kind === 'invalid_state') {
      return res.status(403).json({ success: false, error: 'Order is no longer in pending verification state.' });
    }

    if (status === 'cancelled') {
      if (txResult.reservationId) await releaseInventoryReservation(db, txResult.reservationId, 'whatsapp_cancelled');
    } else if (txResult.reservationId) {
      await finalizeInventoryReservation(db, txResult.reservationId);
    }
    res.json({ success: true });
  } catch (e: any) {
    console.error('WhatsApp Status Update error:', e);
    res.status(500).json({ success: false, error: 'Failed to update WhatsApp order status' });
  }
});

async function commitInBatches(
  db: FirebaseFirestore.Firestore,
  docs: FirebaseFirestore.DocumentSnapshot[],
  operation: (batch: FirebaseFirestore.WriteBatch, doc: FirebaseFirestore.DocumentSnapshot) => void,
  chunkSize = 450,
) {
  for (let i = 0; i < docs.length; i += chunkSize) {
    const batch = db.batch();
    for (const docSnap of docs.slice(i, i + chunkSize)) operation(batch, docSnap);
    await batch.commit();
  }
}

// Deletes a user account server-side with the Admin SDK: anonymizes their
// orders, removes their reviews and profile doc, then deletes the Auth user
// record. Shared by the self-service delete-my-account flow and the
// admin-triggered user removal flow below.
async function deleteUserAccount(db: FirebaseFirestore.Firestore, uid: string) {
  // 1. Anonymize (don't delete) this user's orders -- order records are typically
  // kept for accounting/audit purposes, but we remove the link to their account.
  const ordersSnap = await db.collection('orders').where('userId', '==', uid).get();
  if (!ordersSnap.empty) {
    await commitInBatches(db, ordersSnap.docs, (batch, docSnap) => {
      batch.update(docSnap.ref, { userId: 'deleted_user', accountDeleted: true });
    });
  }

  // 2. Delete reviews written by this user. Use sub-500-write batches because
  // Firestore rejects a write batch containing more than 500 operations.
  const reviewsSnap = await db.collection('reviews').where('userId', '==', uid).get();
  if (!reviewsSnap.empty) {
    await commitInBatches(db, reviewsSnap.docs, (batch, docSnap) => batch.delete(docSnap.ref));
  }

  // 3. Delete the user's profile document and any subcollections (e.g. saved addresses).
  try {
    await db.recursiveDelete(db.collection('users').doc(uid));
  } catch (cleanupErr) {
    console.warn(`Failed to fully clean up Firestore data for user ${uid}:`, cleanupErr);
  }

  // 4. Finally, delete the Firebase Auth user record itself. Without this step,
  // the account can simply sign back in -- Firebase Auth is untouched by
  // deleting only the Firestore profile doc, and CartContext re-creates that
  // doc on every login via an unconditional setDoc(..., { merge: true }).
  await getAuth().deleteUser(uid);
}

app.post('/api/account/delete', strictApiLimiter, requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const authUser = (req as any).authUser;
    await deleteUserAccount(getFirestore(), authUser.uid);
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Account deletion failed:', err);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

// Admin-triggered user removal. Previously the admin panel only deleted the
// Firestore profile document via the client SDK, which left the Firebase Auth
// account fully intact -- the user could still sign in, and their profile doc
// would be silently recreated on next login (see CartContext.tsx). This is the
// real removal path: it actually deletes the Auth account so access is
// genuinely revoked, using the same cleanup as self-service account deletion.
app.post('/api/admin/users/:uid/delete', strictApiLimiter, requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const targetUid = req.params.uid;
    const callerUid = (req as any).authUser.uid;
    if (targetUid === callerUid) {
      return res.status(400).json({ success: false, error: 'You cannot remove your own account from here.' });
    }

    const db = getFirestore();
    let targetEmail: string | null = null;
    try {
      const targetRecord = await getAuth().getUser(targetUid);
      targetEmail = targetRecord.email || null;
    } catch {
      // User record may already be gone; proceed with cleanup regardless.
    }

    await deleteUserAccount(db, targetUid);

    const actorEmail = (req as any).authUser.email || 'unknown';
    await db.collection('audit_logs').add({
      action: 'REMOVE_USER',
      category: 'USERS',
      actor: actorEmail,
      details: `Removed user ${targetEmail || targetUid}`,
      createdAt: new Date().toISOString(),
    });

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Admin user removal failed:', err);
    res.status(500).json({ success: false, error: 'Failed to remove user' });
  }
});


app.post('/api/orders/:id/cancel', orderLimiter, requireAuth, async (req: express.Request, res: express.Response) => {
  try {
    const orderId = req.params.id;
    const authUser = (req as any).authUser;
    if (!authUser || !authUser.uid) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const db = getFirestore();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    
    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    const orderData = orderSnap.data();
    if (orderData?.userId !== authUser.uid && authUser.admin !== true) {
      return res.status(403).json({ success: false, error: 'Unauthorized to cancel this order' });
    }
    
    // Prevent cancellation if already dispatched or in invalid state
    const currentStatus = orderData?.status || orderData?.orderStatus;
    const validStatuses = ['pending', 'confirmed', 'processing', 'packed'];
    const nonCancellableStatuses = ['dispatched', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(currentStatus) || nonCancellableStatuses.includes(currentStatus)) {
      return res.status(400).json({ success: false, error: 'Order cannot be cancelled at this stage' });
    }
    
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : null;
    try {
      const result = await cancelOrderAtomically(db, orderRef, reason);
      if (result.inventoryAction === 'release_reservation' && result.reservationId) {
        try {
          await releaseInventoryReservation(db, result.reservationId, 'order_cancelled');
          await orderRef.update({ inventoryReleasedAt: new Date().toISOString(), inventoryReleasePending: false });
        } catch (inventoryErr) {
          console.error('Failed to release reservation after cancellation:', inventoryErr);
          await orderRef.update({ inventoryReleasePending: true, inventoryReleaseError: String((inventoryErr as any)?.message || inventoryErr).slice(0, 500) });
        }
      } else if (result.inventoryAction === 'restore_stock') {
        try {
          await restoreInventory((await orderRef.get()).data()?.items || []);
          await orderRef.update({ inventoryReleasedAt: new Date().toISOString(), inventoryReleasePending: false });
        } catch (inventoryErr) {
          console.error('Failed to restore stock after cancellation:', inventoryErr);
          await orderRef.update({ inventoryReleasePending: true, inventoryReleaseError: String((inventoryErr as any)?.message || inventoryErr).slice(0, 500) });
        }
      }
      return res.json({ success: true, refundRequired: result.refundRequired, paymentStatus: result.paymentStatus });
    } catch (err: any) {
      if (err.message === 'ORDER_NOT_FOUND') return res.status(404).json({ success: false, error: 'Order not found' });
      if (err.message === 'ORDER_NOT_CANCELLABLE') return res.status(400).json({ success: false, error: 'Order cannot be cancelled at this stage' });
      throw err;
    }
  } catch (e: any) {
    console.error('Cancel Order error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/orders/create', orderLimiter, requireAuth, async (req: express.Request, res: express.Response) => {
    try {
      const parseResult = directOrderSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: parseResult.error.issues[0]?.message || 'Invalid order creation payload',
        });
      }

      const { items, shippingDetails, paymentMethod, utrNumber, couponCode, orderType } = parseResult.data;
      const authUser = (req as any).authUser;
      if (!authUser?.uid) {
        return res.status(401).json({ success: false, error: 'Authentication required. Please log in before checkout.' });
      }
      const userId = authUser.uid;

      const isWhatsAppExpress = paymentMethod === 'WhatsApp Express';
      if (orderType === 'wholesale' && isWhatsAppExpress) {
        return res.status(400).json({ success: false, error: 'WhatsApp Express quick-order is a retail-only flow. Please use standard checkout for wholesale orders.' });
      }

      // WhatsApp Express quick-orders don't collect a full delivery address up front
      // (the customer sends it in the WhatsApp chat), but every other payment method
      // still needs full, validated shipping details.
      if (!isWhatsAppExpress) {
        if (!shippingDetails.name?.trim()) {
          return res.status(400).json({ success: false, error: 'Name is required' });
        }
        const rawPhone = String(shippingDetails.phone || '').trim();
        const normalizedPhone = rawPhone.replace(/[\s().-]/g, '');
        // Global phone validation: prefer E.164-style values (+country code + subscriber),
        // while also allowing a locally formatted subscriber number when the app has
        // not collected a country prefix separately. Avoid assuming India-specific numbering.
        if (!/^\+?[1-9]\d{6,14}$/.test(normalizedPhone)) {
          return res.status(400).json({ success: false, error: 'Invalid phone number format. Please enter a valid international phone number.' });
        }
        if (!shippingDetails.address?.trim()) {
          return res.status(400).json({ success: false, error: 'Address is required' });
        }
        // Address is free-form user data. Enforce reasonable length and reject
        // control characters without blocking legitimate Indian-language addresses.
        const addressValue = shippingDetails.address.trim();
        // eslint-disable-next-line no-control-regex
        if (addressValue.length < 5 || addressValue.length > 500 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(addressValue)) {
          return res.status(400).json({ success: false, error: 'Please enter a valid delivery address.' });
        }
        const postalCode = String(shippingDetails.pincode || '').trim();
        // eslint-disable-next-line no-control-regex
        if (!postalCode || postalCode.length < 2 || postalCode.length > 12 || /[\u0000-\u001F]/.test(postalCode)) {
          return res.status(400).json({ success: false, error: 'Valid postal/ZIP code required' });
        }
      }
      // WhatsApp Express doesn't require a phone number here -- the quick
      // single-product flow collects it later via the WhatsApp chat itself.

      const { subtotal, validatedItems: safeItems } = await calculateOrderTotals(items, orderType);
      if (subtotal <= 0) {
        return res.status(400).json({ success: false, error: 'Order subtotal must be greater than zero' });
      }

      // Authoritative, server-side coupon discount (see applyCoupon()) -- the client
      // total shown at checkout is never trusted directly.
      let discountAmount = 0;
      let appliedCouponCode: string | null = null;
      if (couponCode) {
        try {
          const couponResult = await applyCoupon(subtotal, couponCode, userId);
          discountAmount = couponResult.discountAmount;
          appliedCouponCode = couponResult.couponCode;
        } catch (couponErr: any) {
          return res.status(400).json({ success: false, error: couponErr.message || 'Invalid coupon code' });
        }
      }
      const discountedSubtotal = subtotal - discountAmount;

      // Delivery/shipping validation branches by order type. WhatsApp Express
      // quick-orders don't collect a pincode up front (see above), so retail
      // pincode gating only applies once an address has actually been
      // collected -- a WhatsApp Express order is verified for serviceability
      // manually over chat, matching its existing pre-checkout-address design.
      let effectiveDeliveryFee = 0;
      let wholesaleZoneId: string | null = null;
      let wholesaleZoneLabel: string | null = null;

      if (orderType === 'wholesale') {
        const zone = await findWholesaleZoneForPincode(shippingDetails.pincode);
        if (!zone) {
          return res.status(400).json({ success: false, error: 'We currently do not ship wholesale orders to this PIN code. Please check your delivery address.' });
        }
        if (zone.minOrderValue > 0 && discountedSubtotal < zone.minOrderValue) {
          return res.status(400).json({ success: false, error: `Minimum wholesale order value for this area is ₹${zone.minOrderValue}. Add ₹${(zone.minOrderValue - discountedSubtotal).toFixed(2)} more to checkout.` });
        }
        effectiveDeliveryFee = zone.shippingFee;
        wholesaleZoneId = zone.id;
        wholesaleZoneLabel = zone.label;
      } else if (!isWhatsAppExpress) {
        const pin = await getRetailPincode(shippingDetails.pincode);
        if (!pin || pin.enabled !== true) {
          return res.status(400).json({ success: false, error: 'Sorry, we do not currently deliver to this PIN code. Please check your delivery address or try a different address.' });
        }
        const { deliveryFee, freeDeliveryThreshold, minOrderAmount: globalMinOrder } = await getStoreDeliverySettings();
        const effectiveMinOrder = typeof pin.minOrderAmount === 'number' ? pin.minOrderAmount : globalMinOrder;
        if (effectiveMinOrder > 0 && discountedSubtotal < effectiveMinOrder) {
          return res.status(400).json({ success: false, error: `Minimum order amount is ₹${effectiveMinOrder}. Add ₹${(effectiveMinOrder - discountedSubtotal).toFixed(2)} more to checkout.` });
        }
        const baseFee = typeof pin.deliveryFee === 'number' ? pin.deliveryFee : deliveryFee;
        effectiveDeliveryFee = (freeDeliveryThreshold > 0 && discountedSubtotal >= freeDeliveryThreshold) ? 0 : baseFee;
      } else {
        // WhatsApp Express: fee/minimum are settled over chat, not here.
        const { deliveryFee, freeDeliveryThreshold } = await getStoreDeliverySettings();
        effectiveDeliveryFee = (freeDeliveryThreshold > 0 && discountedSubtotal >= freeDeliveryThreshold) ? 0 : deliveryFee;
      }

      const grandTotal = discountedSubtotal + effectiveDeliveryFee;

      // This endpoint never marks an order as paid -- online payments are only
      // confirmed via the Razorpay verify/webhook flow.
      // Restrict payment methods so a caller cannot create a misleading order
      // with an unsupported/privileged-looking method label.
      const allowedPaymentMethods = new Set(['Cash on Delivery', 'WhatsApp Express']);
      if (!allowedPaymentMethods.has(paymentMethod)) {
        return res.status(400).json({ success: false, error: 'Unsupported payment method.' });
      }

      let initialStatus = 'pending';
      const initialPaymentStatus = 'unpaid';
      
      if (paymentMethod === 'WhatsApp Express') {
        initialStatus = 'whatsapp_pending';
      }

      let orderId: string, orderPayload: Record<string, any>;
      const idempotencyKey = getIdempotencyKey(req);
      const requestHash = requestBodyHash(req.body);
      try {
        const created = await createOrderWithUniqueId(getFirestore(), (id) => ({
          id,
          orderId: id,
          userId,
          items: safeItems,
          subtotal,
          discountAmount,
          couponCode: appliedCouponCode,
          deliveryFee: effectiveDeliveryFee,
          amount: grandTotal,
          grandTotal,
          shippingDetails: { ...shippingDetails, phoneNormalized: normalizePhone(shippingDetails.phone) },
          paymentMethod,
          orderStatus: initialStatus,
          status: initialStatus,
          paymentStatus: initialPaymentStatus,
          utrNumber: utrNumber || null,
          orderType,
          ...(wholesaleZoneId ? { wholesaleZoneId, wholesaleZoneLabel } : {}),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }), { couponCode: appliedCouponCode, userId, enforceCouponLimit: true, idempotencyKey, requestHash });
        orderId = created.orderId;
        orderPayload = created.payload;
        if (created.replayed) {
          return res.status(200).json({ success: true, orderId, order: orderPayload, idempotentReplay: true });
        }
      } catch (err: any) {
        if (err.message === 'COUPON_LIMIT_REACHED') {
          return res.status(400).json({ success: false, error: 'This coupon has just reached its usage limit. Please remove it and try again.' });
        }
        if (err.message === 'IDEMPOTENCY_KEY_REUSED') {
          return res.status(409).json({ success: false, error: 'This checkout request key was already used for different order data.' });
        }
        throw err;
      }

      let whatsappReservationId: string | null = null;
      try {
        if (isWhatsAppExpress) {
          whatsappReservationId = `wares_${crypto.randomBytes(12).toString('hex')}`;
          const expiresAt = Date.now() + 30 * 60 * 1000;
          await reserveInventory(getFirestore(), whatsappReservationId, userId, safeItems, expiresAt);
          await getFirestore().collection('orders').doc(orderId).update({ reservationId: whatsappReservationId, whatsappExpiresAt: new Date(expiresAt).toISOString(), updatedAt: new Date().toISOString() });
        } else {
          await decrementInventory(safeItems);
        }
      } catch (stockErr: any) {
        // No payment captured yet for COD/WhatsApp, so it's safe to reject the order.
        try {
          await rollbackCouponRedemption(getFirestore(), appliedCouponCode, userId);
          await getFirestore().collection('orders').doc(orderId).delete();
          if (idempotencyKey) {
            const idemRef = getFirestore().collection('idempotencyKeys').doc(hashIdempotencyKey('order-create', userId, idempotencyKey));
            await idemRef.delete().catch((cleanupErr) => console.error('Failed to remove stale order idempotency record:', cleanupErr));
          }
        } catch (rollbackErr) {
          console.error('Failed to rollback coupon/order after inventory rejection:', rollbackErr);
          await getFirestore().collection('orders').doc(orderId).update({
            status: 'cancelled',
            orderStatus: 'cancelled',
            cancelReason: stockErr.message || 'Insufficient stock',
            couponRollbackPending: true,
            updatedAt: new Date().toISOString(),
          });
        }
        return res.status(409).json({
          success: false,
          error: stockErr.message || 'One or more items just went out of stock. Please update your cart and try again.',
        });
      }

      return res.status(200).json({
        success: true,
        orderId,
        order: orderPayload,
      });
    } catch (err: any) {
      console.error('Failed to create direct order:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to create order on server' });
    }
  });

  // Customer order history: filtering and pagination happen in Firestore, with resilient fallback when composite indexes are absent.
  app.get('/api/orders/history', trackOrderLimiter, requireAuth, async (req: express.Request, res: express.Response) => {
    try {
      const uid = (req as any).authUser?.uid;
      const pageSize = Math.max(1, Math.min(50, Number(req.query.pageSize) || 50));
      const status = String(req.query.status || 'all');
      const qtext = String(req.query.q || '').trim().replace(/^#/, '');
      const groups: Record<string, string[]> = {
        processing: [
          'pending',
          'confirmed',
          'processing',
          'packed',
          'shipped',
          'dispatched',
          'out_for_delivery',
          'AWAITING_WHATSAPP_CONFIRMATION',
          'whatsapp_pending',
          'RECEIVED',
          'paid_upi_pending_verify',
        ],
        delivered: ['delivered', 'completed'],
        cancelled: ['cancelled', 'refunded', 'failed'],
      };
      const db = getFirestore();

      const getOrderTimeMs = (val: any): number => {
        if (!val) return 0;
        if (typeof val === 'string') return Date.parse(val) || 0;
        if (typeof val?.toDate === 'function') return val.toDate().getTime();
        if (typeof val?.seconds === 'number') return val.seconds * 1000;
        return new Date(val).getTime() || 0;
      };

      const matchesSearch = (order: any, queryStr: string): boolean => {
        if (!queryStr) return true;
        const needle = queryStr.toLowerCase();
        const idStr = String(order.orderId || order.id || '').toLowerCase();
        if (idStr.includes(needle)) return true;
        const statusStr = String(order.orderStatus || order.status || '').toLowerCase();
        if (statusStr.includes(needle)) return true;
        const phoneStr = String(order.shippingDetails?.phone || '').replace(/\D/g, '');
        const needleDigits = queryStr.replace(/\D/g, '');
        if (needleDigits.length >= 4 && phoneStr.includes(needleDigits)) return true;
        if (Array.isArray(order.items)) {
          if (order.items.some((it: any) => String(it?.name || '').toLowerCase().includes(needle))) {
            return true;
          }
        }
        return false;
      };

      if (qtext) {
        const byId = await db.collection('orders').doc(qtext).get();
        if (byId.exists && String(byId.data()?.userId || '') === uid) {
          return res.json({ success: true, orders: [{ id: byId.id, ...byId.data() }], hasMore: false, nextCursor: null, pageSize });
        }
      }

      // Primary query path using indexed Firestore query, with automatic fallback to single-field userId query
      // if composite index is not provisioned or when free-text item search is active.
      try {
        if (qtext) {
          throw new Error('USE_IN_MEMORY_FILTER_FOR_TEXT_SEARCH');
        }
        let q: FirebaseFirestore.Query = db.collection('orders').where('userId', '==', uid);
        const statuses = groups[status];
        if (statuses?.length) q = q.where('orderStatus', 'in', statuses.slice(0, 10));
        q = q.orderBy('createdAt', 'desc').orderBy('__name__', 'desc');
        const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : '';
        if (cursor) {
          try {
            const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
            if (decoded?.createdAt && decoded?.id) q = q.startAfter(decoded.createdAt, decoded.id);
          } catch {
            // Ignore malformed pagination cursor
          }
        }
        const snap = await q.limit(pageSize + 1).get();
        const docs = snap.docs.slice(0, pageSize);
        const last = docs[docs.length - 1];
        const createdAt = last?.data()?.createdAt;
        const cursorValue = last
          ? {
              createdAt:
                typeof createdAt === 'string'
                  ? createdAt
                  : createdAt?.toDate
                  ? createdAt.toDate().toISOString()
                  : String(createdAt || ''),
              id: last.id,
            }
          : null;
        const nextCursor = snap.docs.length > pageSize && cursorValue ? Buffer.from(JSON.stringify(cursorValue), 'utf8').toString('base64url') : null;
        return res.json({
          success: true,
          orders: docs.map((d) => ({ id: d.id, ...d.data() })),
          hasMore: Boolean(nextCursor),
          nextCursor,
          pageSize,
        });
      } catch {
        // Fallback: single-field equality query on userId requires no composite index
        const snap = await db.collection('orders').where('userId', '==', uid).limit(200).get();
        const allowedStatuses = groups[status] ? new Set(groups[status].map((s) => s.toLowerCase())) : null;
        const allOrders = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((o) => {
            if (allowedStatuses) {
              const st = String(o.orderStatus || o.status || 'pending').toLowerCase();
              if (!allowedStatuses.has(st)) return false;
            }
            return matchesSearch(o, qtext);
          })
          .sort((a, b) => getOrderTimeMs(b.createdAt) - getOrderTimeMs(a.createdAt));

        const sliced = allOrders.slice(0, pageSize);
        return res.json({
          success: true,
          orders: sliced,
          hasMore: allOrders.length > pageSize,
          nextCursor: null,
          pageSize,
        });
      }
    } catch (err) {
      console.error('[Orders] history query failed:', err);
      return res.status(500).json({ success: false, error: 'Failed to load order history' });
    }
  });

  // Server-side coupon validation, backed by the same `coupons` Firestore collection
  // the Admin Panel's Promotions tab writes to. Used by the cart UI to preview a
  // discount before checkout; the authoritative discount is still recomputed inside
  // /api/orders/create, /api/razorpay/order, and /api/razorpay/verify.
  app.post('/api/coupons/validate', orderLimiter, optionalAuth, async (req: express.Request, res: express.Response) => {
    try {
      const parseResult = couponValidateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: parseResult.error.issues[0]?.message || 'Invalid coupon request',
        });
      }
      const { code, items } = parseResult.data;
      const { subtotal } = await calculateOrderTotals(items);
      const authUser = (req as any).authUser;
      const { discountAmount, couponCode } = await applyCoupon(subtotal, code, authUser ? authUser.uid : 'guest');

      const snap = await getFirestore().collection('coupons').doc(couponCode!).get();
      const coupon = snap.data() as any;

      return res.status(200).json({
        success: true,
        couponCode,
        discountAmount,
        discountType: coupon?.discountType,
        discountValue: coupon?.discountValue,
        description: coupon?.description,
        subtotal,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Invalid coupon code' });
    }
  });

  // Secure Order Tracking Endpoint
  app.post('/api/orders/track', trackOrderLimiter, async (req: express.Request, res: express.Response) => {
    try {
      const parseResult = trackOrderSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: parseResult.error.issues[0]?.message || 'Invalid tracking parameters',
        });
      }

      const { orderId, phone } = parseResult.data;
      const docSnap = await getFirestore().collection('orders').doc(orderId).get();

      if (!docSnap.exists) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const orderData = docSnap.data() as any;
      const orderPhone = (orderData?.shippingDetails?.phone || '').replace(/\D/g, '');
      const inputPhone = (phone || '').replace(/\D/g, '');

      let authorizedByOwnerOrAdmin = false;
      const authUser = await verifyRequestAuth(req);
      if (authUser && (authUser.uid === orderData?.userId || authUser.admin === true)) {
        authorizedByOwnerOrAdmin = true;
      }

      // Require a full 10-digit phone on BOTH stored and input phone numbers
      // before comparing -- without this, a short guess (e.g. a single digit)
      // would have a real chance of matching a real customer's phone by luck.
      const authorizedByPhone =
        !authorizedByOwnerOrAdmin &&
        Boolean(inputPhone && inputPhone.length >= 10 && orderPhone && orderPhone.length >= 10 && orderPhone.endsWith(inputPhone.slice(-10)));

      if (!authorizedByOwnerOrAdmin && !authorizedByPhone) {
        return res.status(403).json({ success: false, error: 'Unauthorized to view this order' });
      }

      if (authorizedByOwnerOrAdmin) {
        return res.status(200).json({
          success: true,
          order: { id: docSnap.id, ...orderData },
        });
      }

      // Minimize sensitive payment/internal identifiers and mask street address when
      // accessed via unauthenticated orderId + phone lookup.
      const rawAddress = String(orderData?.shippingDetails?.address || '');
      const maskedAddress = rawAddress.length > 12 ? `${rawAddress.slice(0, 6)}...${rawAddress.slice(-6)}` : 'On file';
      res.status(200).json({
        success: true,
        order: {
          id: docSnap.id,
          orderId: orderData?.orderId || docSnap.id,
          status: orderData?.status || orderData?.orderStatus || 'pending',
          orderStatus: orderData?.orderStatus || orderData?.status || 'pending',
          paymentStatus: orderData?.paymentStatus || 'unpaid',
          paymentMethod: orderData?.paymentMethod || '',
          items: Array.isArray(orderData?.items) ? orderData.items : [],
          subtotal: orderData?.subtotal ?? 0,
          discountAmount: orderData?.discountAmount ?? 0,
          deliveryFee: orderData?.deliveryFee ?? 0,
          amount: orderData?.amount ?? orderData?.grandTotal ?? 0,
          grandTotal: orderData?.grandTotal ?? orderData?.amount ?? 0,
          createdAt: orderData?.createdAt || null,
          updatedAt: orderData?.updatedAt || null,
          shippingDetails: {
            name: orderData?.shippingDetails?.name || 'Customer',
            pincode: orderData?.shippingDetails?.pincode || '',
            address: maskedAddress,
          },
        },
      });
    } catch (err: any) {
      console.error('Order tracking error:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve order details' });
    }
  });

  const handleCreateOrder = async (req: express.Request, res: express.Response) => {
    try {
      const parseResult = createOrderSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: parseResult.error.issues[0]?.message || 'Invalid order payload',
        });
      }

      const { items, couponCode, shippingDetails, orderType } = parseResult.data;
      const authUser = (req as any).authUser;
      if (!authUser?.uid) {
        return res.status(401).json({ success: false, error: 'Authentication required. Please log in before starting payment.' });
      }
      const userId = authUser.uid;
      const { subtotal, validatedItems: safeItems } = await calculateOrderTotals(items, orderType);

      // Authoritative, server-side coupon discount -- applied before the Razorpay order
      // amount is calculated, so the customer is actually charged the discounted price.
      let discountAmount = 0;
      let appliedCouponCode: string | null = null;
      if (couponCode) {
        try {
          const couponResult = await applyCoupon(subtotal, couponCode, userId);
          discountAmount = couponResult.discountAmount;
          appliedCouponCode = couponResult.couponCode;
        } catch (couponErr: any) {
          return res.status(400).json({ success: false, error: couponErr.message || 'Invalid coupon code' });
        }
      }
      const discountedSubtotal = subtotal - discountAmount;

      const { deliveryFee, freeDeliveryThreshold, minOrderAmount, upiId } = await getStoreDeliverySettings();

      // Delivery/shipping validation branches by order type -- see the
      // matching logic (and its rationale) in /api/orders/create above.
      let effectiveDeliveryFee = deliveryFee;
      let wholesaleZoneId: string | null = null;
      let wholesaleZoneLabel: string | null = null;

      if (orderType === 'wholesale') {
        const zone = await findWholesaleZoneForPincode(shippingDetails?.pincode);
        if (!zone) {
          return res.status(400).json({ success: false, error: 'We currently do not ship wholesale orders to this PIN code. Please check your delivery address.' });
        }
        if (zone.minOrderValue > 0 && discountedSubtotal < zone.minOrderValue) {
          return res.status(400).json({ success: false, error: `Minimum wholesale order value for this area is ₹${zone.minOrderValue}. Add ₹${(zone.minOrderValue - discountedSubtotal).toFixed(2)} more to checkout.` });
        }
        effectiveDeliveryFee = zone.shippingFee;
        wholesaleZoneId = zone.id;
        wholesaleZoneLabel = zone.label;
      } else {
        const pin = await getRetailPincode(shippingDetails?.pincode);
        if (!pin || pin.enabled !== true) {
          return res.status(400).json({ success: false, error: 'Sorry, we do not currently deliver to this PIN code. Please check your delivery address or try a different address.' });
        }
        const effectiveMinOrder = typeof pin.minOrderAmount === 'number' ? pin.minOrderAmount : minOrderAmount;
        if (effectiveMinOrder > 0 && discountedSubtotal < effectiveMinOrder) {
          return res.status(400).json({ success: false, error: `Minimum order amount is ₹${effectiveMinOrder}. Add ₹${(effectiveMinOrder - discountedSubtotal).toFixed(2)} more to checkout.` });
        }
        const baseFee = typeof pin.deliveryFee === 'number' ? pin.deliveryFee : deliveryFee;
        effectiveDeliveryFee = (freeDeliveryThreshold > 0 && discountedSubtotal >= freeDeliveryThreshold) ? 0 : baseFee;
      }
      const totalAmount = discountedSubtotal + effectiveDeliveryFee;

      if (totalAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Calculated order total must be greater than zero' });
      }

      const razorpayInstance = getRazorpay();
      const idempotencyKey = getIdempotencyKey(req);
      const requestHash = requestBodyHash(req.body);
      const idempotencyHash = idempotencyKey ? hashIdempotencyKey('razorpay-order', userId, idempotencyKey) : null;
      const pendingCollection = getFirestore().collection('razorpayPendingOrders');

      // Resolve an existing idempotent checkout BEFORE reserving inventory.
      // Claim the deterministic idempotency record atomically BEFORE reserving
      // inventory. A read-before-write check is race-prone under concurrent retries.
      let razorpayIdempotencyClaimed = false;
      if (idempotencyHash) {
        const claim = await claimRazorpayIdempotency(getFirestore(), `idem_${idempotencyHash}`, requestHash);
        if (claim.kind === 'conflict') {
          return res.status(409).json({ success: false, error: 'This checkout request key was already used for different order data.' });
        }
        if (claim.kind === 'replay') {
          return res.status(200).json({ success: true, order: claim.razorpayOrder, key_id: env.RAZORPAY_KEY_ID, isLive: true, idempotentReplay: true });
        }
        if (claim.kind === 'in_progress') {
          return res.status(409).json({ success: false, error: 'This checkout request is already being prepared. Please retry shortly.' });
        }
        razorpayIdempotencyClaimed = true;
      }

      // Online-payment stock is reserved before the gateway is opened so two
      // simultaneous customers cannot both pay for the same last units.
      await releaseExpiredInventoryReservations(getFirestore()).catch(err => console.warn('[Inventory] cleanup warning:', err));
      await cleanupExpiredWhatsAppOrders(getFirestore()).catch(err => console.warn('[WhatsApp] expiry cleanup warning:', err));
      const reservationId = `res_${crypto.randomBytes(12).toString('hex')}`;
      const reservationExpiresAtMs = Date.now() + INVENTORY_RESERVATION_TTL_MS;
      try {
        await reserveInventory(getFirestore(), reservationId, userId, safeItems, reservationExpiresAtMs);
        if (idempotencyHash) {
          await pendingCollection.doc(`idem_${idempotencyHash}`).set({
            reservationId,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (reserveErr: any) {
        if (razorpayIdempotencyClaimed && idempotencyHash) {
          await releaseRazorpayIdempotencyClaim(getFirestore(), `idem_${idempotencyHash}`, requestHash).catch((cleanupErr) => console.error('Failed to release Razorpay idempotency claim:', cleanupErr));
        }
        return res.status(409).json({ success: false, error: reserveErr.message || 'One or more items are no longer available.' });
      }

      if (razorpayInstance && env.RAZORPAY_KEY_ID) {

        const receiptKey = idempotencyKey ? `jiyoo_${crypto.createHash('sha256').update(`${userId}:${idempotencyKey}`).digest('hex').slice(0, 30)}` : `jiyoo_${crypto.randomBytes(12).toString('hex')}`;
        const options = {
          amount: Math.round(totalAmount * 100),
          currency: 'INR',
          receipt: receiptKey,
        };

        try {
          const order = await razorpayInstance.orders.create(options);
          // Durable pending snapshot is mandatory. Never return a usable payment
          // order if the server cannot persist the trusted source of truth.
          try {
            await getFirestore().collection('razorpayPendingOrders').doc(order.id).set({
              items: safeItems,
              subtotal,
              discountAmount,
              couponCode: appliedCouponCode,
              deliveryFee: effectiveDeliveryFee,
              amount: totalAmount,
              currency: 'INR',
              shippingDetails: { ...(shippingDetails || {}), phoneNormalized: normalizePhone(shippingDetails?.phone) },
              userId,
              reservationId,
              reservationExpiresAt: new Date(reservationExpiresAtMs).toISOString(),
              consumed: false,
              idempotencyKey: idempotencyKey || null,
              requestHash,
              orderType,
              ...(wholesaleZoneId ? { wholesaleZoneId, wholesaleZoneLabel } : {}),
              createdAt: new Date().toISOString(),
            });
            if (idempotencyHash) {
              await pendingCollection.doc(`idem_${idempotencyHash}`).set({
                requestHash, razorpayOrder: order, razorpayOrderId: order.id, status: 'ready', updatedAt: new Date().toISOString()
              }, { merge: true });
            }
          } catch (persistErr) {
            await releaseInventoryReservation(getFirestore(), reservationId, 'pending_snapshot_failed').catch(() => {});
            if (razorpayIdempotencyClaimed && idempotencyHash) {
              await releaseRazorpayIdempotencyClaim(getFirestore(), `idem_${idempotencyHash}`, requestHash).catch((cleanupErr) => console.error('Failed to release Razorpay idempotency claim:', cleanupErr));
            }
            console.error('Failed to persist pending Razorpay order snapshot:', persistErr);
            return res.status(503).json({ success: false, error: 'Could not prepare the secure payment session. Please try again.' });
          }

          return res.status(200).json({
            success: true,
            order,
            key_id: env.RAZORPAY_KEY_ID,
            isLive: true,
          });
        } catch (e) {
          console.error('Razorpay API Error, falling back to UPI QR:', e);
        }
      }

      await releaseInventoryReservation(getFirestore(), reservationId, 'payment_provider_unavailable').catch(() => {});
      if (razorpayIdempotencyClaimed && idempotencyHash) {
        await releaseRazorpayIdempotencyClaim(getFirestore(), `idem_${idempotencyHash}`, requestHash).catch((cleanupErr) => console.error('Failed to release Razorpay idempotency claim:', cleanupErr));
      }

      // Fallback response for direct online payment when Razorpay keys are not active
      return res.status(200).json({
        success: true,
        isFallback: true,
        upiId,
        amount: totalAmount,
        order: {
          id: `order_upi_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          amount: Math.round(totalAmount * 100),
          currency: 'INR',
        },
      });
    } catch (error: any) {
      console.error('Failed to create order:', error);
      res.status(500).json({ success: false, error: 'Internal order creation failure' });
    }
  };

  app.post('/api/razorpay/order', orderLimiter, requireAuth, handleCreateOrder);

  // Verify Payment
  const handleVerifyPayment = async (req: express.Request, res: express.Response) => {
    try {
      const parseResult = verifyPaymentSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: parseResult.error.issues[0]?.message || 'Missing payment verification details',
        });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parseResult.data;
      const authUser = (req as any).authUser;
      if (!authUser?.uid) {
        return res.status(401).json({ success: false, error: 'Authentication required for payment verification.' });
      }
      const userId = authUser.uid;
      const secret = env.RAZORPAY_KEY_SECRET;

      if (!secret) {
        return res.status(500).json({ success: false, error: 'Razorpay secret key not configured on server' });
      }

      const generated_signature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (!safeEqualHex(generated_signature, razorpay_signature)) {
        return res.status(400).json({ success: false, error: 'Invalid payment signature' });
      }

      const razorpayInstance = getRazorpay();
      if (!razorpayInstance) {
        return res.status(503).json({ success: false, error: 'Payment provider is not configured.' });
      }
      const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
      const paymentOrderId = String(payment?.order_id || '');
      const paymentStatus = String(payment?.status || '').toLowerCase();
      const paymentAmount = Number(payment?.amount);
      const paymentCurrency = String(payment?.currency || '');
      if (paymentOrderId !== razorpay_order_id || paymentStatus != 'captured' || !Number.isFinite(paymentAmount) || paymentAmount <= 0 || paymentCurrency !== 'INR') {
        return res.status(400).json({ success: false, error: 'Payment could not be validated as a captured INR payment for this order.' });
      }

      // The browser payload is NOT authoritative after payment. The trusted
      // pending snapshot created when the Razorpay order was opened is the source
      // of truth for items, pricing, coupon and shipping. This prevents a client
      // from paying for one cart and submitting another payload during verification.
      let orderId: string | null = null;
      const existingSnap = await getFirestore().collection('orders')
        .where('razorpay_order_id', '==', razorpay_order_id).limit(1).get();

      if (!existingSnap.empty) {
        orderId = existingSnap.docs[0].id;
        const existing = existingSnap.docs[0].data();
        if (existing.userId !== userId) return res.status(403).json({ success: false, error: 'Payment does not belong to the authenticated account.' });
        if (existing.paymentStatus !== 'paid') {
          const wasCancelled = String(existing.status || existing.orderStatus || '') === 'cancelled';
          await existingSnap.docs[0].ref.update({
            paymentStatus: wasCancelled ? 'refund_pending' : 'paid',
            refundStatus: wasCancelled ? 'pending' : (existing.refundStatus || null),
            status: wasCancelled ? 'cancelled' : 'confirmed',
            orderStatus: wasCancelled ? 'cancelled' : 'confirmed',
            razorpay_payment_id,
            updatedAt: new Date().toISOString(),
          });
          if (wasCancelled) {
            return res.status(409).json({ success: false, error: 'Payment was captured after the order was cancelled. A refund is required and the order will not be fulfilled.', orderId });
          }
        }
      } else {
        const pending = await claimPendingRazorpayOrder(razorpay_order_id);
        if (!pending) {
          orderId = await findOrderByRazorpayId(razorpay_order_id);
        } else {
          if (pending.userId !== userId) return res.status(403).json({ success: false, error: 'Payment does not belong to the authenticated account.' });
          const trustedItems = Array.isArray(pending.items) ? pending.items : [];
          if (!trustedItems.length) {
            return res.status(400).json({ success: false, error: 'No trusted checkout snapshot exists for this payment.' });
          }

          const rzp = getRazorpay();
          if (!rzp) {
            return res.status(500).json({ success: false, error: 'Payment provider is not configured.' });
          }

          const rzpOrder = await rzp.orders.fetch(razorpay_order_id);
          const expectedAmount = Math.round(Number(pending.amount || 0) * 100);
          const gatewayAmount = Number(rzpOrder.amount);
          const gatewayCurrency = String(rzpOrder.currency || '');
          if (!Number.isFinite(gatewayAmount) || gatewayAmount !== expectedAmount || gatewayCurrency !== String(pending.currency || 'INR')) {
            return res.status(400).json({ success: false, error: 'Payment amount or currency could not be validated.' });
          }
          if (Number(payment.amount) !== expectedAmount || String(payment.currency || 'INR') !== String(pending.currency || 'INR')) {
            return res.status(400).json({ success: false, error: 'Captured payment amount or currency does not match the checkout.' });
          }

          const trustedPayload = {
            items: trustedItems,
            subtotal: Number(pending.subtotal || 0),
            discountAmount: Number(pending.discountAmount || 0),
            couponCode: pending.couponCode || null,
            deliveryFee: Number(pending.deliveryFee || 0),
            amount: Number(pending.amount || 0),
            grandTotal: Number(pending.amount || 0),
            status: 'confirmed',
            orderStatus: 'confirmed',
            paymentStatus: 'paid',
            paymentMethod: 'Online Payment (Razorpay)',
            razorpay_order_id,
            razorpay_payment_id,
            reservationId: pending.reservationId || null,
            shippingDetails: pending.shippingDetails || {},
            userId: pending.userId || null,
            orderType: pending.orderType || 'retail',
            ...(pending.wholesaleZoneId ? { wholesaleZoneId: pending.wholesaleZoneId, wholesaleZoneLabel: pending.wholesaleZoneLabel } : {}),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const created = await createOrderWithUniqueId(
            getFirestore(),
            (id) => ({ ...trustedPayload, id, orderId: id }),
            { couponCode: pending.couponCode, userId: pending.userId, enforceCouponLimit: false }
          );
          orderId = created.orderId;

          try {
            if (pending.reservationId) await finalizeInventoryReservation(getFirestore(), String(pending.reservationId));
            else await decrementInventory(trustedItems);
          } catch (stockErr: any) {
            await getFirestore().collection('orders').doc(orderId).update({ stockConflict: true, stockConflictReason: stockErr.message });
          }
        }
      }

      res.status(200).json({ 
        success: true, 
        message: 'Payment verified successfully',
        orderId: orderId
      });
    } catch (error: any) {
      console.error('Failed to verify Razorpay signature:', error);
      res.status(500).json({ success: false, error: 'Payment verification failed' });
    }
  };

  app.post('/api/razorpay/verify', requireAuth, handleVerifyPayment);

  // Webhook Handling. Razorpay delivers webhooks at-least-once and can deliver
  // events out of order, so the event record is durable and processing is idempotent.
  const handleWebhook = async (req: express.Request, res: express.Response) => {
    try {
      const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
      if (!webhookSecret) return res.status(500).json({ success: false, error: 'Webhook verification not configured' });

      const signature = req.headers['x-razorpay-signature'] as string;
      if (!signature) return res.status(400).json({ success: false, error: 'Missing webhook signature' });
      const rawBody = (req as any).rawBody || '';
      const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      if (!safeEqualHex(signature, expectedSignature)) return res.status(400).json({ success: false, error: 'Invalid webhook signature' });

      const webhookTimestamp = Number(req.headers['x-razorpay-webhook-timestamp']);
      if (Number.isFinite(webhookTimestamp) && webhookTimestamp > 0) {
        const timeDiff = Math.floor(Date.now()/1000) - webhookTimestamp;
        if (timeDiff < -5 || timeDiff > 300) return res.status(400).json({ success: false, error: 'Webhook timestamp verification failed' });
      }

      const eventId = String(req.headers['x-razorpay-event-id'] || '').trim();
      if (!eventId) return res.status(400).json({ success: false, error: 'Missing webhook event id' });
      const event = String(req.body?.event || '');
      const payload = req.body?.payload;
      const paymentEntity = payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id || payload?.order?.entity?.id || null;
      const paymentId = paymentEntity?.id || null;
      const db = getFirestore();
      const eventRef = db.collection('razorpayWebhookEvents').doc(eventId);

      const claim = await db.runTransaction(async tx => {
        const existing = await tx.get(eventRef);
        if (existing.exists) {
          const status = String(existing.data()?.status || 'received');
          if (status === 'processed' || status === 'ignored') return false;
          const last = Date.parse(String(existing.data()?.lastAttemptAt || ''));
          if (status === 'processing' && Number.isFinite(last) && Date.now() - last < 30_000) return false;
        }
        tx.set(eventRef, {
          eventId, event, status:'processing', lastAttemptAt:new Date().toISOString(),
          razorpayOrderId: razorpayOrderId || null, paymentId: paymentId || null,
          updatedAt:new Date().toISOString()
        }, { merge:true });
        return true;
      });
      if (!claim) return res.status(200).json({ success:true, duplicate:true });

      try {
        if (event === 'payment.captured' || event === 'order.paid') {
          if (razorpayOrderId) await reconcileRazorpayOrder(razorpayOrderId, paymentId);
          await eventRef.update({ status:'processed', processedAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
        } else if (event === 'payment.failed') {
          if (razorpayOrderId) {
            const pending = await db.collection('razorpayPendingOrders').doc(String(razorpayOrderId)).get();
            if (pending.exists) {
              const reservationId = String(pending.data()?.reservationId || '');
              if (reservationId) await releaseInventoryReservation(db, reservationId, 'payment_failed');
              await pending.ref.set({ status:'payment_failed', failedAt:new Date().toISOString(), updatedAt:new Date().toISOString() }, { merge:true });
            }
          }
          await eventRef.update({ status:'processed', processedAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
        } else {
          await eventRef.update({ status:'ignored', processedAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
        }
        return res.status(200).json({ success:true });
      } catch (processingErr: any) {
        await eventRef.update({ status:'failed', error:String(processingErr?.message || processingErr).slice(0,500), updatedAt:new Date().toISOString() }).catch(()=>{});
        console.error('[Webhook] processing failed:', processingErr);
        // Non-2xx makes Razorpay retry the delivery. The durable event record also
        // lets our scheduled reconciler retry independently.
        return res.status(500).json({ success:false, error:'Webhook processing failed' });
      }
    } catch (error: any) {
      console.error('Webhook processing failed:', error?.message || error);
      if (!res.headersSent) res.status(500).json({ success:false, error:'Webhook processing failed' });
    }
  };

  app.post('/api/razorpay/webhook', handleWebhook);

  // Serve static public assets with active-content sandboxing and dotfile denial
  const publicUploads = path.join(process.cwd(), 'public', 'uploads');
  app.use(
    '/uploads',
    express.static(publicUploads, {
      dotfiles: 'deny',
      index: false,
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      },
    })
  );

  // Durable scheduled reconciliation for inventory reservations and failed
  // Razorpay webhook work. Vercel cron supplies Authorization: Bearer $CRON_SECRET.
  app.get('/api/cron/reconcile', strictApiLimiter, async (req, res) => {
    try {
      if (!env.CRON_SECRET) return res.status(503).json({ success:false, error:'Cron reconciliation is not configured.' });
      const authorization = String(req.headers.authorization || '');
      const expectedAuth = `Bearer ${env.CRON_SECRET}`;
      const providedDigest = crypto.createHash('sha256').update(authorization).digest();
      const expectedDigest = crypto.createHash('sha256').update(expectedAuth).digest();
      if (!crypto.timingSafeEqual(providedDigest, expectedDigest)) {
        return res.status(401).json({ success:false, error:'Unauthorized' });
      }

      const db = getFirestore();
      await releaseExpiredInventoryReservations(db);
      await cleanupExpiredWhatsAppOrders(db);
      const failed = await db.collection('razorpayWebhookEvents').where('status', '==', 'failed').limit(25).get();
      let retried = 0;
      for (const eventDoc of failed.docs) {
        const event = eventDoc.data() as any;
        try {
          if ((event.event === 'payment.captured' || event.event === 'order.paid') && event.razorpayOrderId) {
            await reconcileRazorpayOrder(String(event.razorpayOrderId), event.paymentId || null);
          } else if (event.event === 'payment.failed' && event.razorpayOrderId) {
            const pending = await db.collection('razorpayPendingOrders').doc(String(event.razorpayOrderId)).get();
            if (pending.exists) {
              const reservationId = String(pending.data()?.reservationId || '');
              if (reservationId) await releaseInventoryReservation(db, reservationId, 'payment_failed_cron');
            }
          }
          await eventDoc.ref.update({ status:'processed', processedAt:new Date().toISOString(), updatedAt:new Date().toISOString(), retryCount: FieldValue.increment(1) });
          retried++;
        } catch (err:any) {
          await eventDoc.ref.update({ retryCount: FieldValue.increment(1), lastRetryError: String(err?.message || err).slice(0,500), updatedAt:new Date().toISOString() }).catch(()=>{});
        }
      }
      return res.json({ success:true, retried });
    } catch (err:any) {
      console.error('[Cron] reconciliation failed:', err);
      return res.status(500).json({ success:false, error:'Reconciliation failed' });
    }
  });

  // Push Notifications
  app.post('/api/send-notification', strictApiLimiter, requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const parseResult = sendNotificationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: parseResult.error.issues[0]?.message || 'Invalid notification payload',
        });
      }

      const { tokens, userId, title, body, data } = parseResult.data;

      if (!getApps().length) {
        return res.status(500).json({ success: false, error: 'Firebase Admin not initialized' });
      }

      let targetTokens: string[] = [];

      if (tokens) {
        targetTokens = Array.isArray(tokens) ? tokens : [tokens];
      } else if (userId) {
        const userDoc = await getFirestore().collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData && Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0) {
            targetTokens = userData.fcmTokens;
          }
        }
      }

      if (targetTokens.length === 0) {
        return res.status(200).json({ success: true, message: 'No devices to notify' });
      }

      const message = {
        notification: { title, body },
        data: data || {},
        tokens: targetTokens,
      };

      const response = await getMessaging().sendEachForMulticast(message);
      res.status(200).json({
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });
    } catch (error: any) {
      console.error('Push Notification Error:', error);
      res.status(500).json({ success: false, error: 'Failed to send notification' });
    }
  });

  // Order Email Sender
  app.post('/api/send-order-email', strictApiLimiter, requireAuth, async (req: express.Request, res: express.Response) => {
    try {
      const parseResult = sendEmailSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: parseResult.error.issues[0]?.message || 'Invalid email request payload',
        });
      }

      const { email, order, storeName } = parseResult.data;

      const authUser = (req as any).authUser;
      if (!authUser?.uid || !authUser.email || authUser.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
        return res.status(403).json({ success: false, error: 'Cannot send email on behalf of another user' });
      }

      // Never trust the client-supplied order body for the contents of a
      // confirmation email. Read the canonical order from Firestore and require
      // ownership before sending it to the authenticated account's email.
      const orderSnap = await getFirestore().collection('orders').doc(order.id).get();
      if (!orderSnap.exists) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      const canonicalOrder = orderSnap.data() as any;
      if (canonicalOrder?.userId !== authUser.uid) {
        return res.status(403).json({ success: false, error: 'You are not authorized to receive this order confirmation' });
      }

      const trustedOrder = {
        ...canonicalOrder,
        id: orderSnap.id,
        amount: Number(canonicalOrder.grandTotal ?? canonicalOrder.amount ?? 0),
      };

      const host = env.SMTP_HOST;
      const port = parseInt(env.SMTP_PORT || '587', 10);
      const user = env.SMTP_USER;
      const pass = env.SMTP_PASS;
      const safeStoreName = String(storeName || 'JIYOO').replace(/[\r\n]/g, ' ').slice(0, 120);
      const from = env.SMTP_FROM || `"${safeStoreName}" <noreply@example.com>`;

      if (!host || !user || !pass) {
        console.warn('[Email] SMTP not configured -- order confirmation email NOT sent to', email, 'for order:', trustedOrder.id || 'unknown');
        return res.status(200).json({ success: false, error: 'Email delivery is not configured on this server.', isMock: true });
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      // Escape dynamic input values to prevent HTML injection / XSS
      const itemsList = (trustedOrder.items || [])
        .map(
          (item: any) =>
            `<li style="padding: 8px 0; border-bottom: 1px solid #eee;">${Number(item.quantity)}x ${sanitizeHTML(
              item.name
            )} <span style="float: right;">₹${Number(item.price) * Number(item.quantity)}</span></li>`
        )
        .join('');

      const mailOptions = {
        from,
        to: email,
        subject: `Order Confirmation - ${String(storeName).replace(/[\r\n]/g, ' ').slice(0, 120)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 20px;">
            <h2 style="color: #111;">Thank you for your order!</h2>
            <p>Hi ${sanitizeHTML(trustedOrder.shippingDetails?.name || 'Customer')},</p>
            <p>We've received your order and are getting it ready for you.</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Order Summary</h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${itemsList}
              </ul>
              <div style="border-top: 1px solid #ddd; margin-top: 10px; padding-top: 10px; font-weight: bold; text-align: right;">
                Total: ₹${Number(trustedOrder.amount || 0)}
              </div>
            </div>
            
            <p><strong>Shipping Address:</strong><br>
              ${sanitizeHTML(trustedOrder.shippingDetails?.address || 'N/A')}<br>
              Phone: ${sanitizeHTML(trustedOrder.shippingDetails?.phone || 'N/A')}
            </p>
            
            <p>If you have any questions, please contact our support team.</p>
            <p>Best regards,<br>${sanitizeHTML(storeName)}</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Email sending error:', error?.message || error);
      res.status(500).json({ success: false, error: 'Failed to send email' });
    }
  });

  // Vite Middleware in Dev vs Static Serving in Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(
      express.static(distPath, {
        setHeaders: (res, path) => {
          if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
          }
        },
      })
    );
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Must be the last app.use() -- error middleware only catches errors from
  // handlers registered before it.
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err.message || err);
    if (res.headersSent) return next(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  // On Vercel there is no persistent process to listen on a port - the
  // platform invokes the exported app per-request instead (see api/index.ts).
  // process.env.VERCEL is set automatically by Vercel's runtime.
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }

  return app;
}

export { createApp };

// Only self-start when run directly (VPS/PM2/local dev). On Vercel this
// module is imported by api/index.ts instead, which calls createApp() itself.
if (!process.env.VERCEL) {
  createApp().catch(console.error);
}
