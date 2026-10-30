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
  '/banners/diwali-special.png': '/banners/diwali-special.webp',
  '/banners/diwali_special_sale.png': '/banners/diwali_special_sale.webp',
  '/banners/featured_spotlight.png': '/banners/featured_spotlight.webp',
  '/banners/file_000000002410821198a81a83a16d503f-1.png': '/banners/file_000000002410821198a81a83a16d503f-1.webp',
  '/banners/file_00000000e7e48211898141e9b8e21f64.png': '/banners/file_00000000e7e48211898141e9b8e21f64.webp',
  '/banners/whatsapp_order_banner.png': '/banners/whatsapp_order_banner.webp',
  '/file_00000000e7e48211898141e9b8e21f64.png': '/banners/whatsapp_order_banner.webp',
};

export function getOptimizedBannerUrl(url: string | undefined | null): string {
  if (!url) return '/banners/diwali_special_sale.webp';
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
  if (cleanLocal === '/category-icons/fast-foods.png') {
    return '/category-icons/fast-foods.webp';
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
};

export function resolveProductImage(url: string | undefined | null): string | undefined | null {
  if (!url) return url;
  const cleanUrl = url.split('?')[0];
  const migrated = LEGACY_PRODUCT_IMAGE_MIGRATIONS[cleanUrl];
  if (migrated) return migrated;
  return url;
}
