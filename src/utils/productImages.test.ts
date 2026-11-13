import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PRODUCTS } from '../constants/data';
import { DEFAULT_HERO_BANNERS } from '../constants/banners';
import {
  getOptimizedImageUrl,
  getOptimizedBannerUrl,
  resolveProductImage,
  isCustomAdminUploadedImage,
} from './imageUtils';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const DB_PATH = path.resolve(process.cwd(), '.server-data/store-db.json');

describe('JIYOO Product Images & Asset Integrity (181 Products)', () => {
  it('verifies all 181 baseline products have accurate, existing, unique image files in public/', () => {
    assert.equal(PRODUCTS.length, 181, 'Catalog must contain all 181 products');

    const seenIds = new Set<string>();
    const hashToProduct = new Map<string, string>();

    for (const product of PRODUCTS) {
      const id = String(product.id);
      assert.ok(!seenIds.has(id), `Duplicate product ID found: ${id}`);
      seenIds.add(id);

      assert.ok(product.name && product.name.trim().length > 0, `Product ${id} must have a valid name`);
      assert.ok(product.image && product.image.startsWith('/'), `Product ${id} (${product.name}) must have a local image path`);

      const resolvedPath = resolveProductImage(product.image) || product.image;
      const optimizedPath = getOptimizedImageUrl(resolvedPath, 500, 80);

      for (const relUrl of [product.image, resolvedPath, optimizedPath]) {
        const cleanRel = relUrl.split('?')[0].replace(/^\//, '');
        const fullPath = path.join(PUBLIC_DIR, cleanRel);
        assert.ok(
          fs.existsSync(fullPath),
          `Missing image file on disk for ${id} (${product.name}): ${relUrl}`
        );
        const stat = fs.statSync(fullPath);
        assert.ok(
          stat.size > 500,
          `Image file for ${id} (${product.name}) is unexpectedly small (${stat.size} bytes): ${relUrl}`
        );
      }

      // Verify primary image file has a unique SHA-256 hash so no two products share a duplicate photo
      const primaryCleanRel = (resolveProductImage(product.image) || product.image)
        .split('?')[0]
        .replace(/^\//, '');
      const buf = fs.readFileSync(path.join(PUBLIC_DIR, primaryCleanRel));
      const hash = crypto.createHash('sha256').update(buf).digest('hex');

      assert.ok(
        !hashToProduct.has(hash),
        `Duplicate image binary detected between ${id} (${product.name}) and ${hashToProduct.get(hash)}`
      );
      hashToProduct.set(hash, `${id} (${product.name})`);
    }
  });

  it('verifies .server-data/store-db.json contains all 181 products matching baseline images', () => {
    assert.ok(fs.existsSync(DB_PATH), '.server-data/store-db.json must exist');
    const rawDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    assert.ok(rawDb && rawDb.products, 'store-db.json must contain a products map');

    for (const baseProduct of PRODUCTS) {
      const id = String(baseProduct.id);
      const dbRecord = rawDb.products[id];
      assert.ok(dbRecord, `Product ${id} (${baseProduct.name}) must exist in store-db.json`);
      assert.equal(
        dbRecord.name,
        baseProduct.name,
        `Product ${id} name in store-db.json must match baseline`
      );
      assert.equal(
        dbRecord.image,
        baseProduct.image,
        `Product ${id} image in store-db.json must match baseline jiyoo.co.in image`
      );
    }
  });

  it('verifies all hero banners and category icons exist on disk in public/', () => {
    for (const banner of DEFAULT_HERO_BANNERS) {
      const rawUrl = banner.image;
      const optimizedUrl = getOptimizedBannerUrl(rawUrl);
      for (const u of [rawUrl, optimizedUrl]) {
        const cleanRel = u.split('?')[0].replace(/^\//, '');
        const fullPath = path.join(PUBLIC_DIR, cleanRel);
        assert.ok(fs.existsSync(fullPath), `Banner asset missing from public/: ${u}`);
      }
    }

    const categoryIcons = [
      '/category-icons/fruits-luxury.jpg',
      '/category-icons/vegetables-luxury.jpg',
      '/category-icons/meat-luxury.jpg',
      '/category-icons/smoothies.jpg',
      '/category-icons/fast-foods-luxury.jpg',
    ];
    for (const icon of categoryIcons) {
      const fullPath = path.join(PUBLIC_DIR, icon.replace(/^\//, ''));
      assert.ok(fs.existsSync(fullPath), `Category icon missing from public/: ${icon}`);
    }
  });

  it('verifies isCustomAdminUploadedImage protects baseline product images while permitting real admin uploads', () => {
    assert.equal(isCustomAdminUploadedImage('/products/f_apple_royal_gala.jpg'), false);
    assert.equal(isCustomAdminUploadedImage('/product-images/mandarin-orange.jfif'), false);
    assert.equal(isCustomAdminUploadedImage('https://images.unsplash.com/photo-123'), false);
    assert.equal(isCustomAdminUploadedImage('https://placehold.co/500x500'), false);
    assert.equal(isCustomAdminUploadedImage(''), false);
    assert.equal(isCustomAdminUploadedImage(null), false);

    assert.equal(isCustomAdminUploadedImage('/uploads/custom-mango-123.webp'), true);
    assert.equal(isCustomAdminUploadedImage('uploads/custom-mango-123.webp'), true);
    assert.equal(isCustomAdminUploadedImage('data:image/webp;base64,UklGR...'), true);
    assert.equal(
      isCustomAdminUploadedImage('https://firebasestorage.googleapis.com/v0/b/jiyoo/o/img.jpg'),
      true
    );
  });
});
