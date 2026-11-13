/**
 * Utility to optimize product and media image URLs for ultra-fast, smooth loading.
 */
export function createSvgPlaceholder(title: string = 'Product', width = 500, height = 500): string {
  const cleanTitle = title.replace(/\+/g, ' ');
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="%23FAF9F5"/><rect x="10%" y="10%" width="80%" height="80%" rx="12" fill="%23F3F0E6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="20" fill="%231C1917">${encodeURIComponent(cleanTitle)}</text></svg>`;
}

const BUNDLED_BANNER_WEBP_MAP: Record<string, string> = {
  '/banners/02_Indian_Fruits_Original.png': '/banners/02_Indian_Fruits_Original.webp',
  '/banners/03_Imported_Fruits_Original.png': '/banners/03_Imported_Fruits_Original.webp',
  '/banners/04_Indian_Thai_Vegetables_Original.png': '/banners/04_Indian_Thai_Vegetables_Original.webp',
  '/banners/06_Fish_And_Seafood_Original.png': '/banners/06_Fish_And_Seafood_Original.webp',
  '/banners/08_Everyday_Fresh_Preparation_Original.png': '/banners/08_Everyday_Fresh_Preparation_Original.webp',
  '/banners/09_Grocery_Basket_Original.png': '/banners/09_Grocery_Basket_Original.webp',
  '/banners/10_Fruit_Bowl_Lifestyle_Original.png': '/banners/10_Fruit_Bowl_Lifestyle_Original.webp',
  '/banners/file_00000000e7e48211898141e9b8e21f64.png': '/banners/file_00000000e7e48211898141e9b8e21f64.webp',
  '/banners/whatsapp_order_banner.png': '/banners/whatsapp_order_banner.webp',
  '/file_00000000e7e48211898141e9b8e21f64.png': '/banners/whatsapp_order_banner.webp',
};

export function getOptimizedBannerUrl(url: string | undefined | null): string {
  if (!url) return '/banners/03_Imported_Fruits_Original.webp';
  const cleanUrl = url.split('?')[0];
  if (BUNDLED_BANNER_WEBP_MAP[cleanUrl]) {
    return BUNDLED_BANNER_WEBP_MAP[cleanUrl];
  }
  return getOptimizedImageUrl(url, 1200, 82);
}

export function getOptimizedImageUrl(url: string | undefined | null, width = 500, quality = 80): string {
  if (!url) return createSvgPlaceholder('Product', width, width);

  if (url.startsWith('uploads/')) {
    return '/' + url;
  }

  const cleanLocal = url.split('?')[0];
  if (BUNDLED_BANNER_WEBP_MAP[cleanLocal]) {
    return BUNDLED_BANNER_WEBP_MAP[cleanLocal];
  }
  if (cleanLocal === '/category-icons/fast-foods.png' || cleanLocal === '/category-icons/fast-foods.webp') {
    return '/category-icons/fast-foods-luxury.jpg';
  }
  if (cleanLocal === '/products/pear-red.png') {
    return '/products/pear-red.webp';
  }
  if (cleanLocal === '/products/limpopo-orange-citrus-box.png') {
    return '/products/limpopo-orange-citrus-box.webp';
  }
  if (cleanLocal === '/assets/aistudio/image_d02558fa.png') {
    return '/assets/aistudio/image_d02558fa.webp';
  }

  // 1. Convert placehold.co to zero-latency inline SVG data URIs to eliminate external HTTP 404/AdBlock warnings
  if (url.includes('placehold.co')) {
    try {
      const match = url.match(/text=([^&]+)/);
      const title = match ? decodeURIComponent(match[1]) : 'Product';
      return createSvgPlaceholder(title, width, width);
    } catch {
      return createSvgPlaceholder('Product', width, width);
    }
  }

  // 2. Unsplash URLs -> Force WebP/AVIF via auto=format and optimal width/quality
  if (url.includes('images.unsplash.com')) {
    let updated = url;
    if (updated.includes('?')) {
      updated = updated.replace(/w=\d+/, `w=${width}`).replace(/q=\d+/, `q=${quality}`);
      if (!updated.includes('auto=format')) {
        updated += '&auto=format&fit=crop';
      }
      return updated;
    }
    return `${url}?w=${width}&q=${quality}&auto=format&fit=crop`;
  }

  // 3. Wikimedia Commons URLs -> Automatically convert to fast thumbnail CDN URL
  if (url.includes('upload.wikimedia.org/wikipedia/commons/')) {
    if (url.includes('/thumb/')) {
      return url.replace(/\/\d+px-/, `/${width}px-`);
    }
    const match = url.match(/upload\.wikimedia\.org\/wikipedia\/commons\/([a-f0-9]\/[a-f0-9]{2}\/([^/]+))/i);
    if (match) {
      const fullPath = match[1];
      const fileName = match[2];
      return `https://upload.wikimedia.org/wikipedia/commons/thumb/${fullPath}/${width}px-${fileName}`;
    }
  }

  return url;
}




// Product image migrations for assets that were replaced in the catalog.
// These keep existing Firestore records compatible with the new bundled assets
// without overwriting an administrator's intentional custom image URL.
const LEGACY_PRODUCT_IMAGE_MIGRATIONS: Record<string, string> = {
  '/products/s_avocado.jpg': '/products/s_avocado_jiyoo.jpg',
  '/products/s_blueberry.jpg': '/products/s_blueberry_jiyoo.jpg',
  '/products/s_raspberry.jpg': '/products/s_raspberry_jiyoo.jpg',
  '/products/s_red_grape.jpg': '/products/s_red_grape_jiyoo.jpg',
  '/products/f_red_ice_guava.jpg': '/products/rediceguava.jpeg',
  '/products/f_ice_guava.jpg': '/products/rediceguava.jpeg',
  '/products/limpopo-orange-citrus.jpg': '/assets/aistudio/image_d02558fa.png',
  '/products/dragon-fruit-white-flesh.jpg': '/products/wholesale-dragon-fruit-tiny-moon-boxes.jpg',
  '/products/apple-crisp-pink.jpg': '/products/wholesale-crisp-pink-apples-nz.jpg',
  '/products/beauty-pear-green.jpg': '/products/wholesale-dutoit-pears-box.jpg',
  '/products/blueberry-wholesale.jpg': '/products/wholesale-camposol-blueberries-box.jpg',
  '/products/grapes-black-wholesale.jpg': '/products/wholesale-black-grapes-crate.jpg',
  '/products/grapes-seedless-wholesale.jpg': '/products/wholesale-red-seedless-grapes-box.jpg',
  'https://gosho.store/wp-content/uploads/2025/07/water-melon-NS-295-1.webp': '/products/watermelon-namdhari.jfif',
  'https://tshop.r10s.jp/sembikiya/cabinet/00435283/meron/muskmelon_img.jpg': '/products/f_japan_melon.jpg',
};

export function resolveProductImage(url: string | undefined | null): string | undefined | null {
  if (!url) return url;
  const cleanUrl = url.split('?')[0];
  const migrated = LEGACY_PRODUCT_IMAGE_MIGRATIONS[cleanUrl] || LEGACY_PRODUCT_IMAGE_MIGRATIONS[url];
  if (migrated) return migrated;
  return url;
}

/**
 * Returns true ONLY when an image URL represents an intentional administrator
 * upload (local `/uploads/...`, base64 data URI, or Firebase/Supabase storage URL).
 * This guarantees that the 181 baseline product images from jiyoo.co.in are never
 * accidentally replaced by stale, mismatched, or broken database URLs.
 */
export function isCustomAdminUploadedImage(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) return true;
  if (trimmed.startsWith('data:image/jpeg') || trimmed.startsWith('data:image/png') || trimmed.startsWith('data:image/webp')) {
    return true;
  }
  if (trimmed.includes('firebasestorage.googleapis.com') || trimmed.includes('supabase.co/storage')) {
    return true;
  }
  return false;
}

