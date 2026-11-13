/**
 * One-time sync: pushes the `image` field for each matched product into the live
 * Firestore `products` collection, pointing at the local files copied into
 * public/products/ (served by the VPS itself, no Firebase Storage involved).
 *
 * Run this ON YOUR VPS, after deploying, with the same FIREBASE_SERVICE_ACCOUNT_KEY
 * env var your server already uses:
 *
 *   node scripts/sync-product-images.mjs
 *
 * Safe to re-run — it only ever sets the `image` field on products it has a match
 * for, and skips a product entirely if it doesn't exist yet in Firestore.
 */

import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountJson) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY env var is not set. Aborting.');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
const db = getFirestore();

// Load all 181 product images from .server-data/store-db.json
const storeDbPath = path.resolve(process.cwd(), '.server-data/store-db.json');
const storeDb = JSON.parse(fs.readFileSync(storeDbPath, 'utf8'));
const IMAGE_MAP = Object.fromEntries(
  Object.entries(storeDb.products || {}).map(([id, prod]) => [id, prod.image])
);

async function main() {
  const ids = Object.keys(IMAGE_MAP);
  console.log(`Syncing images for ${ids.length} products...`);

  let updated = 0;
  let skipped = 0;
  const batchSize = 400; // Firestore batch write limit is 500
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = db.batch();
    const chunk = ids.slice(i, i + batchSize);
    const existing = await Promise.all(
      chunk.map((id) => db.collection('products').doc(id).get())
    );
    chunk.forEach((id, idx) => {
      if (existing[idx].exists) {
        batch.update(db.collection('products').doc(id), { image: IMAGE_MAP[id] });
        updated++;
      } else {
        console.warn(`  Skipping ${id} -- no such document in Firestore.`);
        skipped++;
      }
    });
    await batch.commit();
  }

  console.log(`Done. Updated: ${updated}, skipped (not found): ${skipped}`);
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});

