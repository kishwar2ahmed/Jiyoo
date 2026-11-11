import { BannerSlide } from '../types';

export interface PresetBannerOption {
  id: string;
  label: string;
  url: string;
  defaultBadge: string;
  defaultTitle: string;
  defaultSubtitle: string;
}

export const DEFAULT_HERO_BANNERS: BannerSlide[] = [
  {
    id: 'banner-imported-fruits',
    image: '/banners/03_Imported_Fruits_Original.png',
    alt: 'Imported fresh fruits - apples, kiwi, pears, avocado and berries',
    badge: 'Imported Fresh',
    title: 'Imported Fresh Fruits',
    subtitle: 'Apples, kiwi, avocado, pears, berries & grapes',
    isActive: true,
    order: 0,
  },
  {
    id: 'banner-fresh-meat',
    image: '/banners/05_Fresh_Meat_Cuts.webp',
    alt: 'Fresh chicken and mutton cuts cleaned to order',
    badge: 'Fresh Meat',
    title: 'Fresh Chicken & Mutton',
    subtitle: 'Cleaned and custom cut fresh for your kitchen',
    isActive: true,
    order: 1,
  },
  {
    id: 'banner-wholesale-india',
    image: '/banners/wholesale_india_banner.jpg',
    alt: 'Wholesale Product Boxes - All Over India Delivery',
    badge: 'All India Delivery',
    title: 'Wholesale Product Boxes',
    subtitle: 'Full product boxes at wholesale prices · Save ₹300–₹500 per box',
    isActive: true,
    order: 2,
    isFeatured: true,
    highlightTone: 'amber',
  },
  {
    id: 'banner-whatsapp-order',
    image: '/banners/whatsapp_order_banner.png',
    alt: 'Order via WhatsApp - Fresh Food, Meat, Seafood & Essentials',
    badge: 'WhatsApp Order',
    title: 'Order via WhatsApp',
    subtitle: 'Instant ordering with personal assistance on WhatsApp',
    isActive: true,
    order: 3,
    isFeatured: true,
    highlightTone: 'emerald',
  },
  {
    id: 'banner-indian-fruits',
    image: '/banners/02_Indian_Fruits_Original.webp',
    alt: 'Farm fresh Indian seasonal fruits',
    badge: 'Farm Fresh',
    title: 'Indian Orchard Fruits',
    subtitle: 'Handpicked seasonal mangoes, bananas, papaya, guava & figs',
    isActive: true,
    order: 4,
  },
  {
    id: 'banner-vegetables',
    image: '/banners/04_Indian_Thai_Vegetables_Original.png',
    alt: 'Fresh Indian and Thai culinary vegetables',
    badge: 'Daily Harvest',
    title: 'Indian & Exotic Thai Veggies',
    subtitle: 'Farm-fresh daily greens, herbs, galangal, lemongrass & broccoli',
    isActive: true,
    order: 5,
  },
  {
    id: 'banner-seafood',
    image: '/banners/06_Fish_And_Seafood_Original.webp',
    alt: 'Fresh fish, prawns and coastal seafood',
    badge: 'Fresh Catch',
    title: 'Fish, Prawns & Seafood',
    subtitle: 'Rohu, katla, pomfret, surmai & tiger prawns cleaned with RO water',
    isActive: true,
    order: 6,
  },
  {
    id: 'banner-smoothies',
    image: '/banners/07_Smoothies.webp',
    alt: 'Cold-pressed fruit smoothies and wellness blends',
    badge: 'Pure Wellness',
    title: 'Fresh Fruit Smoothies',
    subtitle: 'Chilled, nutrient-rich blends made from real whole fruits',
    isActive: true,
    order: 7,
  },
  {
    id: 'banner-prep',
    image: '/banners/08_Everyday_Fresh_Preparation_Original.png',
    alt: 'Clean kitchen preparation of fresh vegetables and produce',
    badge: 'Ready to Cook',
    title: 'Clean Kitchen Veggies',
    subtitle: 'Washed, sorted, and hygienically packed for effortless cooking',
    isActive: true,
    order: 8,
  },
  {
    id: 'banner-grocery-basket',
    image: '/banners/09_Grocery_Basket_Original.webp',
    alt: 'Curated basket of fresh daily produce',
    badge: 'Pantry Picks',
    title: 'Daily Freshness Basket',
    subtitle: 'Everything your family kitchen needs, delivered in 60 minutes',
    isActive: true,
    order: 9,
  },
  {
    id: 'banner-fruit-bowl',
    image: '/banners/10_Fruit_Bowl_Lifestyle_Original.webp',
    alt: 'Vibrant bowl of exotic and seasonal fruits',
    badge: 'Artisanal Cuts',
    title: 'Exotic Fruit Platters',
    subtitle: 'Naturally ripened, nutrient-dense fruits for healthy living',
    isActive: true,
    order: 10,
  },
];

export const PRESET_BANNER_IMAGES: PresetBannerOption[] = DEFAULT_HERO_BANNERS.map((b) => ({
  id: b.id,
  label: b.title,
  url: b.image,
  defaultBadge: b.badge,
  defaultTitle: b.title,
  defaultSubtitle: b.subtitle,
}));
