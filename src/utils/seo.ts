import { Category, Product } from '../types';

function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function applyCategorySeo(category?: Category | null, products?: Product[]) {
  if (typeof document === 'undefined') return;
  const label = category?.label || 'Fresh Fruits, Vegetables & Meat';
  const count = Array.isArray(products) ? products.length : 0;
  const title = `${label} Online Delivery in Bengaluru | JIYOO`;
  const description = `Order fresh ${label.toLowerCase()} online in Bengaluru (${count > 0 ? `${count}+ selections` : 'daily harvest'}). Cleaned with pure RO water and delivered cold & fresh by JIYOO Premium Products.`;

  document.title = title;
  setMetaTag('name', 'description', description);
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
}

export function applyWholesaleSeo(productCount = 0) {
  if (typeof document === 'undefined') return;
  const title = `Wholesale Fruit & Produce Boxes Pan-India | JIYOO Wholesale`;
  const description = `Order full wholesale master cartons (${productCount > 0 ? `${productCount} curated bulk lots` : 'imported & Indian fruits'}) at direct wholesale pricing with pan-India delivery from JIYOO.`;

  document.title = title;
  setMetaTag('name', 'description', description);
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
}

export function applyProductModalSeo(product?: Product | null) {
  if (typeof document === 'undefined' || !product) return;
  const title = `${product.name} – Fresh Delivery in Bengaluru | JIYOO`;
  const description =
    product.description ||
    `Buy fresh ${product.name} online from JIYOO Premium Products. Fast doorstep delivery across Bengaluru.`;

  document.title = title;
  setMetaTag('name', 'description', description);
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
}
