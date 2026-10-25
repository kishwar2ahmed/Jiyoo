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

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountJson) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY env var is not set. Aborting.');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
const db = getFirestore();

// productId -> image path (relative, served from public/products/ on this VPS)
const IMAGE_MAP = {
  'f_apple_royal_gala': '/products/f_apple_royal_gala.jpg',
  'f_avocado': '/products/f_avocado.jpg',
  'f_banana_yelakki': '/products/f_banana_yelakki.jpg',
  'f_guava_taiwan_pink': '/products/f_guava_taiwan_pink.jpg',
  'f_guava_taiwan_white': '/products/f_guava_taiwan_white.jpg',
  'f_ice_guava': '/products/f_ice_guava.jpg',
  'f_papaya_red_lady': '/products/f_papaya_red_lady.jpg',
  'f_papaya_no15': '/products/f_papaya_no15.jpg',
  'f_kiwi_green': '/products/f_kiwi_green.jpg',
  'f_zespri_sungold_kiwi': '/products/f_zespri_sungold_kiwi.jpg',
  'f_kiwi': '/products/f_kiwi.jpg',
  'f_grapes_red_globe': '/products/f_grapes_red_globe.jpg',
  'f_grapes_sonaka': '/products/f_grapes_sonaka.jpg',
  'f_grapes_shine_muscat': '/products/f_grapes_shine_muscat.jpg',
  'f_grapes_black': '/products/f_grapes_black.jpg',
  'f_grapes_bangalore_blue': '/products/f_grapes_bangalore_blue.jpg',
  'f_citrus_orange': '/products/f_citrus_orange.jpg',
  'f_sweet_lime': '/products/f_sweet_lime.jpg',
  'f_lemon': '/products/f_lemon.jpg',
  'f_lime': '/products/f_lime.jpg',
  'f_clementine': '/products/f_clementine.jpg',
  'f_pomelo_red': '/products/f_pomelo_red.jpg',
  'f_pomelo_white': '/products/f_pomelo_white.jpg',
  'f_muskmelon': '/products/f_muskmelon.jpg',
  'f_honeydew_melon': '/products/f_honeydew_melon.jpg',
  'f_japan_melon': '/products/f_japan_melon.jpg',
  'f_apricot': '/products/f_apricot.jpg',
  'f_cherry': '/products/f_cherry.jpg',
  'f_coconut': '/products/f_coconut.jpg',
  'f_fig': '/products/f_fig.jpg',
  'f_mango': '/products/f_mango.jpg',
  'f_nectarine': '/products/f_nectarine.jpg',
  'f_pomegranate': '/products/f_pomegranate.jpg',
  'f_lychee': '/products/f_lychee.jpg',
  'f_blueberry': '/products/f_blueberry.jpg',
  'f_blackberry': '/products/f_blackberry.jpg',
  'f_raspberry': '/products/f_raspberry.jpg',
  'f_strawberry': '/products/f_strawberry.jpg',
  'f_cranberry': '/products/f_cranberry.jpg',
  'f_jamun': '/products/f_jamun.jpg',
  'v_potato': '/products/v_potato.jpg',
  'v_baby_carrot': '/products/v_baby_carrot.jpg',
  'v_radish': '/products/v_radish.jpg',
  'v_red_radish': '/products/v_red_radish.jpg',
  'v_baby_radish': '/products/v_baby_radish.jpg',
  'v_beetroot': '/products/v_beetroot.jpg',
  'v_baby_beetroot': '/products/v_baby_beetroot.jpg',
  'v_purple_potato': '/products/v_purple_potato.jpg',
  'v_blue_potato': '/products/v_blue_potato.jpg',
  'v_black_potato': '/products/v_black_potato.jpg',
  'v_sweet_potato': '/products/v_sweet_potato.jpg',
  'v_yellow_ginger': '/products/v_yellow_ginger.jpg',
  'v_lettuce': '/products/v_lettuce.jpg',
  'v_mini_lettuce': '/products/v_mini_lettuce.jpg',
  'v_cabbage': '/products/v_cabbage.jpg',
  'v_american_kale': '/products/v_american_kale.jpg',
  'v_kale': '/products/v_kale.jpg',
  'v_celery_root': '/products/v_celery_root.jpg',
  'v_leek': '/products/v_leek.jpg',
  'v_broccoli': '/products/v_broccoli.jpg',
  'v_cauliflower': '/products/v_cauliflower.jpg',
  'v_spring_onion': '/products/v_spring_onion.jpg',
  'v_black_garlic': '/products/v_black_garlic.jpg',
  'v_peas': '/products/v_peas.jpg',
  'v_beans': '/products/v_beans.jpg',
  'v_cucumber': '/products/v_cucumber.jpg',
  'v_pepper': '/products/v_pepper.jpg',
  'v_squash': '/products/v_squash.jpg',
  'v_zucchini': '/products/v_zucchini.jpg',
  'v_eggplant': '/products/v_eggplant.jpg',
  'v_corn': '/products/v_corn.jpg',
  'v_cherry_vine_tomato': '/products/v_cherry_vine_tomato.jpg',
  'v_yellow_cherry_tomato': '/products/v_yellow_cherry_tomato.jpg',
  'v_red_cherry_tomato': '/products/v_red_cherry_tomato.jpg',
  'v_green_asparagus': '/products/v_green_asparagus.jpg',
  'v_green_asparagus_jumbo': '/products/v_green_asparagus_jumbo.jpg',
  'v_white_asparagus': '/products/v_white_asparagus.jpg',
  'v_white_asparagus_peruvian': '/products/v_white_asparagus_peruvian.jpg',
  'v_asparagus_regular': '/products/v_asparagus_regular.jpg',
  'v_artichoke': '/products/v_artichoke.jpg',
  'v_garlic_chives': '/products/v_garlic_chives.jpg',
  'v_parsley': '/products/v_parsley.jpg',
  'm_ch_boneless': '/products/m_ch_boneless.jpg',
  'm_ch_bone': '/products/m_ch_bone.jpg',
  'm_ch_curry': '/products/m_ch_curry.jpg',
  'm_ch_biryani': '/products/m_ch_biryani.jpg',
  'm_ch_kabab': '/products/m_ch_kabab.jpg',
  'm_ch_lollipop': '/products/m_ch_lollipop.jpg',
  'm_ch_wings': '/products/m_ch_wings.jpg',
  'm_mu_boneless': '/products/m_mu_boneless.jpg',
  'm_mu_bone': '/products/m_mu_bone.jpg',
  'm_mu_curry': '/products/m_mu_curry.jpg',
  'm_mu_biryani': '/products/m_mu_biryani.jpg',
  'm_mu_kabab': '/products/m_mu_kabab.jpg',
  'm_fi_rohu': '/products/m_fi_rohu.jpg',
  'm_fi_katla': '/products/m_fi_katla.jpg',
  'm_fi_pomfret': '/products/m_fi_pomfret.jpg',
  'm_fi_surmai': '/products/m_fi_surmai.jpg',
  'm_pr_tiger': '/products/m_pr_tiger.jpg',
  'm_pr_white': '/products/m_pr_white.jpg',
  's_avocado': '/products/s_avocado.jpg',
  's_blueberry': '/products/s_blueberry.jpg',
  's_raspberry': '/products/s_raspberry.jpg',
  's_red_grape': '/products/s_red_grape.jpg',
};

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
