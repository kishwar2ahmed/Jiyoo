import React from 'react';

const preloadedImages = new Set<string>();

export function preloadProductCutout(imageUrl?: string | null, _highPriority?: boolean) {
  if (!imageUrl || typeof window === 'undefined') return;
  if (preloadedImages.has(imageUrl)) return;
  preloadedImages.add(imageUrl);
  try {
    const img = new Image();
    img.src = imageUrl;
  } catch {
    // ignore preload errors
  }
}

export function FlyingItemsLayer() {
  return null;
}
