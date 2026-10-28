import { Product } from '../types/index';

export const ALL_PRODUCTS: Product[] = [
  // =========================================================
  // 1. FRUITS (70 PRODUCTS)
  // =========================================================
  // APPLES (11)
  {
    id: 'f_apple_royal_gala',
    name: 'Apple Royal Gala Premium',
    slug: 'apple-royal-gala-premium',
    description: 'Fresh, crunchy, and naturally sweet Royal Gala apples with beautiful orange-red striped skin.',
    price: 299,
    numericPrice: 299,
    mrp: 349,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_apple_royal_gala.jpg',
    tags: ['Imported', 'Sweet', 'Crisp'],
    freshnessBadge: 'Premium',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 159 },
      { label: '1kg', price: 299 }
    ]
  },
  {
    id: 'f_washington_apple',
    name: 'Washington Apple',
    slug: 'washington-apple',
    description: 'Classic deep-red Washington apples with a firm, crisp texture and exceptionally juicy sweet flavor.',
    price: 299,
    numericPrice: 299,
    mrp: 349,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/washington-apple.jfif',
    tags: ['Imported', 'Juicy'],
    freshnessBadge: 'Fresh Import',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 159 },
      { label: '1kg', price: 299 }
    ]
  },
  {
    id: 'f_apple_pink_lady',
    name: 'Apple Pink Lady',
    slug: 'apple-pink-lady',
    description: 'Distinctive pink-blushed apples with a crisp, firm crunch and a delightful sweet-tart profile.',
    price: 399,
    numericPrice: 399,
    mrp: 449,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_apple_pink_lady.jpg',
    tags: ['Imported', 'Sweet-Tart', 'Gourmet'],
    freshnessBadge: 'Top Grade',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 209 },
      { label: '1kg', price: 399 }
    ]
  },
  {
    id: 'f_apple_fuji',
    name: 'Apple Fuji',
    slug: 'apple-fuji',
    description: 'Large, dense, crisp, and exceptionally sweet Fuji apples with yellow-red speckled skin.',
    price: 299,
    numericPrice: 299,
    mrp: 349,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/apple-fuji.jfif',
    tags: ['Imported', 'Crisp', 'Sweet'],
    freshnessBadge: 'Daily Pick',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 159 },
      { label: '1kg', price: 299 }
    ]
  },
  {
    id: 'f_apple_queen',
    name: 'Apple Queen',
    slug: 'apple-queen',
    description: 'Aromatic New Zealand Queen apples with intense dark red coloration and crisp sweet white flesh.',
    price: 349,
    numericPrice: 349,
    mrp: 399,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/apple-queen.jfif',
    tags: ['Imported', 'Aromatic'],
    freshnessBadge: 'Premium',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 189 },
      { label: '1kg', price: 349 }
    ]
  },
  {
    id: 'f_apple_granny_smith',
    name: 'Apple Granny Smith',
    slug: 'apple-granny-smith',
    description: 'Vibrant green apples famed for their sharp tart flavor, crisp firm bite, and cooking versatility.',
    price: 279,
    numericPrice: 279,
    mrp: 329,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/apple-granny-smith.jfif',
    tags: ['Imported', 'Tart', 'Green'],
    freshnessBadge: 'Fresh Pick',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 149 },
      { label: '1kg', price: 279 }
    ]
  },
  {
    id: 'f_apple_red_delicious',
    name: 'Apple Red Delicious',
    slug: 'apple-red-delicious',
    description: 'Heart-shaped, glossy deep red apples featuring juicy sweet white flesh and classic apple aroma.',
    price: 279,
    numericPrice: 279,
    mrp: 329,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_apple_red_delicious.jpg',
    tags: ['Imported', 'Classic'],
    freshnessBadge: 'Fresh import',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 149 },
      { label: '1kg', price: 279 }
    ]
  },
  {
    id: 'f_shimla_apple',
    name: 'Apple Shimla',
    slug: 'apple-shimla',
    description: 'Sweet, authentic Indian apples harvested directly from high-altitude Himachal Pradesh orchards.',
    price: 199,
    numericPrice: 199,
    mrp: 239,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/apple-shimla.jfif',
    tags: ['Indian', 'Orchard Fresh'],
    freshnessBadge: 'Local Farm',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 109 },
      { label: '1kg', price: 199 }
    ]
  },
  {
    id: 'f_apple_pittu',
    name: 'Apple Pittu',
    slug: 'apple-pittu',
    description: 'Traditional Indian regional apple known for its firm bite, aromatic skin, and pleasant natural taste.',
    price: 199,
    numericPrice: 199,
    mrp: 239,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/apple-pittu.jfif',
    tags: ['Indian', 'Regional'],
    freshnessBadge: 'Fresh Harvest',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 109 },
      { label: '1kg', price: 199 }
    ]
  },
  {
    id: 'f_apple_iran',
    name: 'Apple Iran',
    slug: 'apple-iran',
    description: 'Smooth, sweet Iranian apples featuring crisp flesh and vibrant pale-red blush.',
    price: 249,
    numericPrice: 249,
    mrp: 289,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/apple-iran.jfif',
    tags: ['Imported', 'Crisp'],
    freshnessBadge: 'Import Grade',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 129 },
      { label: '1kg', price: 249 }
    ]
  },

  // AVOCADO & BANANAS (4)
  {
    id: 'f_avocado',
    name: 'Avocado Hass',
    slug: 'avocado-hass',
    description: 'Rich, buttery Hass avocado imported for smooth texture and perfect creamy ripeness.',
    price: 149,
    numericPrice: 149,
    mrp: 179,
    unit: '1 pc',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_avocado.jpg',
    tags: ['Imported', 'Creamy', 'Nutritious'],
    freshnessBadge: 'Premium',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1 pc', price: 149 },
      { label: '2 pcs', price: 289 }
    ]
  },
  {
    id: 'f_banana_yelakki',
    name: 'Banana Yelakki',
    slug: 'banana-yelakki',
    description: 'Fragrant, small Yelakki (Elaichi) bananas with dense sweet flesh and rich natural aroma.',
    price: 59,
    numericPrice: 59,
    mrp: 69,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_banana_yelakki.jpg',
    tags: ['Indian', 'Sweet', 'Elaichi'],
    freshnessBadge: 'Farm Fresh',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 59 },
      { label: '1kg', price: 109 }
    ]
  },
  {
    id: 'f_robusta_banana',
    name: 'Banana Robusta',
    slug: 'banana-robusta',
    description: 'Large, firm Robusta bananas with thick peel and smooth sweet flavor, ideal for daily wholesome snacking.',
    price: 59,
    numericPrice: 59,
    mrp: 69,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/banana-robusta.jfif',
    tags: ['Indian', 'Wholesome'],
    freshnessBadge: 'Fresh Ripe',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1kg', price: 59 },
      { label: '2kg', price: 109 }
    ]
  },

  // GUAVAS & PAPAYAS (5)
  {
    id: 'f_guava_taiwan_pink',
    name: 'Taiwan Guava Pink Flesh',
    slug: 'taiwan-guava-pink-flesh',
    description: 'Crisp Taiwan guava featuring striking pink inner flesh and fragrant sweet tropical flavor.',
    price: 119,
    numericPrice: 119,
    mrp: 139,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_guava_taiwan_pink.jpg',
    tags: ['Imported', 'Pink Flesh', 'Aromatic'],
    freshnessBadge: 'Exotic',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 119 },
      { label: '1kg', price: 229 }
    ]
  },
  {
    id: 'f_guava_taiwan_white',
    name: 'Taiwan Guava White Flesh',
    slug: 'taiwan-guava-white-flesh',
    description: 'Large, crunchy Taiwan guava with crisp white flesh, thick skin, and delicate subtle sweetness.',
    price: 109,
    numericPrice: 109,
    mrp: 129,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_guava_taiwan_white.jpg',
    tags: ['Imported', 'Crisp'],
    freshnessBadge: 'Top Quality',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 109 },
      { label: '1kg', price: 209 }
    ]
  },
  {
    id: 'f_red_ice_guava',
    name: 'Red Ice Guava',
    slug: 'red-ice-guava',
    description: 'Premium Red Ice Guava with deep red flesh, individually packed for extra freshness and a crisp, cold-sweet bite.',
    price: 159,
    numericPrice: 159,
    mrp: 179,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/rediceguava.jpeg',
    tags: ['Imported', 'Premium', 'Red Flesh'],
    freshnessBadge: 'Specialty',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 159 },
      { label: '1kg', price: 299 }
    ]
  },
  {
    id: 'f_papaya_red_lady',
    name: 'Papaya Red Lady / 786',
    slug: 'papaya-red-lady-786',
    description: 'Sweet, deep-red fleshed Red Lady 786 papaya variety harvested at peak natural ripeness.',
    price: 99,
    numericPrice: 99,
    mrp: 119,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_papaya_red_lady.jpg',
    tags: ['Indian', 'Sweet', 'Red Flesh'],
    freshnessBadge: 'Farm Fresh',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1kg', price: 99 },
      { label: '2kg', price: 189 }
    ]
  },
  {
    id: 'f_papaya_no15',
    name: 'Papaya No. 15',
    slug: 'papaya-no-15',
    description: 'Firm, golden-orange Papaya No. 15 variety known for smooth flesh and pleasant mild sweetness.',
    price: 109,
    numericPrice: 109,
    mrp: 129,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_papaya_no15.jpg',
    tags: ['Indian', 'Golden'],
    freshnessBadge: 'Daily Pick',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1kg', price: 109 },
      { label: '2kg', price: 209 }
    ]
  },

  // KIWIS & GRAPES (8)
  {
    id: 'f_kiwi_green',
    name: 'Kiwi Green',
    slug: 'kiwi-green',
    description: 'Classic green kiwi fruit featuring fuzzy brown skin and vibrant emerald flesh with sweet-tangy taste.',
    price: 149,
    numericPrice: 149,
    mrp: 179,
    unit: '3 pcs',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_kiwi_green.jpg',
    tags: ['Imported', 'Tangy', 'Vitamin C'],
    freshnessBadge: 'Imported',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '3 pcs', price: 149 },
      { label: '6 pcs', price: 289 }
    ]
  },
  {
    id: 'f_zespri_sungold_kiwi',
    name: 'Zespri SunGold™ Kiwi',
    slug: 'zespri-sungold-kiwi',
    description: 'Premium Zespri SunGold™ kiwi with hairless smooth skin and luscious golden tropical sweet flesh.',
    price: 299,
    numericPrice: 299,
    mrp: 349,
    unit: '3 pcs',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_zespri_sungold_kiwi.jpg',
    tags: ['Imported', 'SunGold', 'Ultra Sweet'],
    freshnessBadge: 'Zespri Certified',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '3 pcs', price: 299 },
      { label: '6 pcs', price: 579 }
    ]
  },
  {
    id: 'f_kiwi',
    name: 'Kiwi',
    slug: 'kiwi',
    description: 'Fresh imported kiwi fruit rich in vitamin C, essential fiber, and natural digestive antioxidants.',
    price: 149,
    numericPrice: 149,
    mrp: 179,
    unit: '3 pcs',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_kiwi.jpg',
    tags: ['Imported', 'Healthy'],
    freshnessBadge: 'Fresh Import',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '3 pcs', price: 149 },
      { label: '6 pcs', price: 289 }
    ]
  },
  {
    id: 'f_grapes_red_globe',
    name: 'Grapes Red Globe',
    slug: 'grapes-red-globe',
    description: 'Large, plump red globe grapes with crisp skin, juicy flesh, and rich rosy sweetness.',
    price: 199,
    numericPrice: 199,
    mrp: 239,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_grapes_red_globe.jpg',
    tags: ['Imported', 'Red Globe', 'Juicy'],
    freshnessBadge: 'Import Grade',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 199 },
      { label: '1kg', price: 389 }
    ]
  },
  {
    id: 'f_grapes_sonaka',
    name: 'Grapes Sonaka',
    slug: 'grapes-sonaka',
    description: 'Elongated Indian Sonaka green seedless grapes packed with natural sweetness and crisp texture.',
    price: 119,
    numericPrice: 119,
    mrp: 139,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_grapes_sonaka.jpg',
    tags: ['Indian', 'Seedless', 'Sweet'],
    freshnessBadge: 'Farm Fresh',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 119 },
      { label: '1kg', price: 229 }
    ]
  },
  {
    id: 'f_grapes_shine_muscat',
    name: 'Grapes Shine Muscat',
    slug: 'grapes-shine-muscat',
    description: 'Luxurious Shine Muscat green seedless grapes with jelly-like juicy flesh and distinct floral muscat aroma.',
    price: 299,
    numericPrice: 299,
    mrp: 349,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_grapes_shine_muscat.jpg',
    tags: ['Imported', 'Shine Muscat', 'Gourmet'],
    freshnessBadge: 'Luxury Grade',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 299 },
      { label: '1kg', price: 579 }
    ]
  },
  {
    id: 'f_grapes_black',
    name: 'Grapes Black',
    slug: 'grapes-black',
    description: 'Sweet black seedless grapes with dark purple-black skin and rich juicy flavor.',
    price: 129,
    numericPrice: 129,
    mrp: 149,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_grapes_black.jpg',
    tags: ['Indian', 'Black Seedless'],
    freshnessBadge: 'Daily Pick',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 129 },
      { label: '1kg', price: 249 }
    ]
  },
  {
    id: 'f_grapes_bangalore_blue',
    name: 'Grapes Bangalore Blue',
    slug: 'grapes-bangalore-blue',
    description: 'GI-tagged Bangalore Blue seeded grapes prized for deep dark hue, foxy aroma, and traditional regional taste.',
    price: 179,
    numericPrice: 179,
    mrp: 199,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_grapes_bangalore_blue.jpg',
    tags: ['Indian', 'Bangalore Blue', 'GI Tagged'],
    freshnessBadge: 'Heritage',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 179 },
      { label: '1kg', price: 349 }
    ]
  },

  // CITRUS & ORANGES (11)
  {
    id: 'f_mandarin_orange',
    name: 'Mandarin Orange',
    slug: 'mandarin-orange',
    description: 'Easy-to-peel Mandarin oranges with sweet segment pulp and aromatic citrus fragrance.',
    price: 179,
    numericPrice: 179,
    mrp: 199,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/product-images/mandarin-orange.jfif',
    tags: ['Imported', 'Mandarin', 'Sweet'],
    freshnessBadge: 'Top Grade',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1kg', price: 179 },
      { label: '2kg', price: 349 }
    ]
  },
  {
    id: 'f_malta_orange',
    name: 'Malta Orange',
    slug: 'malta-orange',
    description: 'Imported Malta oranges featuring deep orange color, rich sweetness, and vibrant juice content.',
    price: 149,
    numericPrice: 149,
    mrp: 169,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/product-images/malta-orange.jfif',
    tags: ['Imported', 'Malta'],
    freshnessBadge: 'Fresh Import',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1kg', price: 149 },
      { label: '2kg', price: 289 }
    ]
  },
  {
    id: 'f_nagpur_orange',
    name: 'Nagpur Orange',
    slug: 'nagpur-orange',
    description: 'Famous Indian Nagpur oranges with loose peel, sweet-tangy juice, and quintessential citrus aroma.',
    price: 159,
    numericPrice: 159,
    mrp: 179,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/nagpur-orange.jfif',
    tags: ['Indian', 'Nagpur', 'Juicy'],
    freshnessBadge: 'Local Harvest',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1kg', price: 159 },
      { label: '2kg', price: 309 }
    ]
  },
  {
    id: 'f_sweet_lime',
    name: 'Sweet Lime / Mosambi',
    slug: 'sweet-lime-mosambi',
    description: 'Fresh Indian sweet lime (Mosambi) packed with cooling, mild sweet juice.',
    price: 69,
    numericPrice: 69,
    mrp: 79,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_sweet_lime.jpg',
    tags: ['Indian', 'Mosambi', 'Refreshing'],
    freshnessBadge: 'Daily Fresh',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 69 },
      { label: '1kg', price: 129 }
    ]
  },
  {
    id: 'f_lemon',
    name: 'Lemon',
    slug: 'lemon',
    description: 'Bright yellow Indian lemons rich in natural zest, citric acid, and invigorating fresh juice.',
    price: 49,
    numericPrice: 49,
    mrp: 59,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_lemon.jpg',
    tags: ['Indian', 'Zesty'],
    freshnessBadge: 'Kitchen Essential',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '250g', price: 29 },
      { label: '500g', price: 49 }
    ]
  },
  {
    id: 'f_lime',
    name: 'Lime',
    slug: 'lime',
    description: 'Fresh green limes with sharp citric zing, essential for beverages, marinades, and garnishes.',
    price: 59,
    numericPrice: 59,
    mrp: 69,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_lime.jpg',
    tags: ['Indian', 'Green Lime'],
    freshnessBadge: 'Fresh Cut',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '250g', price: 35 },
      { label: '500g', price: 59 }
    ]
  },
  {
    id: 'f_grapefruit',
    name: 'Grapefruit',
    slug: 'grapefruit',
    description: 'Large citrus grapefruit with ruby-tinted interior flesh and invigorating sweet-bitter flavor.',
    price: 129,
    numericPrice: 129,
    mrp: 149,
    unit: '1 pc',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_grapefruit.jpg',
    tags: ['Imported', 'Grapefruit'],
    freshnessBadge: 'Import Grade',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1 pc', price: 129 },
      { label: '2 pcs', price: 249 }
    ]
  },
  {
    id: 'f_tangerine',
    name: 'Tangerine',
    slug: 'tangerine',
    description: 'Vibrant orange tangerines featuring sweet, juicy flesh and easy peel skin.',
    price: 169,
    numericPrice: 169,
    mrp: 189,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_citrus_orange.jpg',
    tags: ['Imported', 'Tangerine', 'Citrus'],
    freshnessBadge: 'Fresh Import',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 169 },
      { label: '1kg', price: 329 }
    ]
  },
  {
    id: 'f_pomelo_red',
    name: 'Pomelo Red',
    slug: 'pomelo-red',
    description: 'Large citrus pomelo featuring thick protective rind and sweet red interior vesicles.',
    price: 199,
    numericPrice: 199,
    mrp: 229,
    unit: '1 pc',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_pomelo_red.jpg',
    tags: ['Imported', 'Red Pomelo', 'Exotic'],
    freshnessBadge: 'Exotic Grade',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1 pc', price: 199 },
      { label: '2 pcs', price: 389 }
    ]
  },
  {
    id: 'f_pomelo_white',
    name: 'Pomelo White',
    slug: 'pomelo-white',
    description: 'Subtle sweet white pomelo variety with pale yellow vesicles and clean mild citrus taste.',
    price: 179,
    numericPrice: 179,
    mrp: 199,
    unit: '1 pc',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_pomelo_white.jpg',
    tags: ['Imported', 'White Pomelo'],
    freshnessBadge: 'Fresh Selection',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1 pc', price: 179 },
      { label: '2 pcs', price: 349 }
    ]
  },

  // MELONS & EXOTIC FRUITS (11)
  {
    id: 'f_watermelon_kiran',
    name: 'Watermelon Kiran',
    slug: 'watermelon-kiran',
    description: 'Dark green striped Kiran watermelon variety featuring sweet red crisp flesh and high juice content.',
    price: 129,
    numericPrice: 129,
    mrp: 149,
    unit: '1 pc',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/watermelon-kiran.jfif',
    tags: ['Indian', 'Kiran', 'Hydrating'],
    freshnessBadge: 'Farm Fresh',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1 pc (approx 2.5kg)', price: 129 }
    ]
  },
  {
    id: 'f_watermelon_namdhari',
    name: 'Watermelon Namdhari',
    slug: 'watermelon-namdhari',
    description: 'Premium Namdhari hybrid watermelon known for deep crimson sweet flesh and high sugar Brix.',
    price: 149,
    numericPrice: 149,
    mrp: 169,
    unit: '1 pc',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: 'https://gosho.store/wp-content/uploads/2025/07/water-melon-NS-295-1.webp',
    tags: ['Indian', 'Namdhari', 'Ultra Sweet'],
    freshnessBadge: 'Top Tier',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1 pc (approx 3kg)', price: 149 }
    ]
  },
  {
    id: 'f_muskmelon',
    name: 'Muskmelon',
    slug: 'muskmelon',
    description: 'Fragrant Indian muskmelon (Kharbooja) with sweet orange flesh and rich tropical aroma.',
    price: 69,
    numericPrice: 69,
    mrp: 79,
    unit: '1 pc',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_muskmelon.jpg',
    tags: ['Indian', 'Muskmelon', 'Aromatic'],
    freshnessBadge: 'Fresh Pick',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1 pc (approx 1kg)', price: 69 }
    ]
  },
  {
    id: 'f_japan_melon',
    name: 'Japan Melon',
    slug: 'japan-melon',
    description: 'Exotic luxury Japanese muskmelon featuring intricate netted rind, floral aroma, and melting sweet interior.',
    price: 399,
    numericPrice: 399,
    mrp: 449,
    unit: '1 pc',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: 'https://tshop.r10s.jp/sembikiya/cabinet/00435283/meron/muskmelon_img.jpg?fitin=720%3A720',
    tags: ['Imported', 'Japan Melon', 'Luxury'],
    freshnessBadge: 'Gourmet',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1 pc', price: 399 }
    ]
  },
  {
    id: 'f_dragon_fruit_yellow',
    name: 'Yellow Dragon Fruit',
    slug: 'yellow-dragon-fruit',
    description: 'Premium yellow-skinned dragon fruit with translucent white flesh and naturally sweet, delicate tropical flavor.',
    price: 199,
    numericPrice: 199,
    mrp: 229,
    unit: '1 pc',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/yellow-dragon-fruit.jfif',
    tags: ['Imported', 'Dragon Fruit', 'Exotic'],
    freshnessBadge: 'Exotic Grade',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1 pc', price: 199 },
      { label: '2 pcs', price: 389 }
    ]
  },
  {
    id: 'f_dragon_fruit_white',
    name: 'Dragon Fruit White Flesh',
    slug: 'dragon-fruit-white-flesh',
    description: 'Vibrant pink-skinned dragon fruit with crisp white flesh speckled with tiny edible black seeds.',
    price: 129,
    numericPrice: 129,
    mrp: 149,
    unit: '1 pc',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_dragon_fruit_white.jpg',
    tags: ['Imported', 'Dragon Fruit', 'Exotic'],
    freshnessBadge: 'Fresh Import',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1 pc', price: 129 },
      { label: '2 pcs', price: 249 }
    ]
  },
  {
    id: 'f_dragon_fruit_red',
    name: 'Dragon Fruit Red Flesh',
    slug: 'dragon-fruit-red-flesh',
    description: 'Exotic red dragon fruit with magenta flesh, mild sweet flavor, and high natural betalain antioxidants.',
    price: 149,
    numericPrice: 149,
    mrp: 179,
    unit: '1 pc',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_dragon_fruit_red.jpg',
    tags: ['Imported', 'Red Flesh', 'Antioxidant'],
    freshnessBadge: 'Exotic Grade',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1 pc', price: 149 },
      { label: '2 pcs', price: 289 }
    ]
  },
  {
    id: 'f_pineapple',
    name: 'Pineapple',
    slug: 'pineapple',
    description: 'Fresh tropical pineapple offering vibrant yellow flesh, sweet-tangy taste, and natural bromelain enzymes.',
    price: 99,
    numericPrice: 99,
    mrp: 119,
    unit: '1 pc',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/pineapple.jfif',
    tags: ['Indian', 'Tropical', 'Tangy'],
    freshnessBadge: 'Farm Fresh',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1 pc', price: 99 }
    ]
  },
  {
    id: 'f_honey_pineapple',
    name: 'Honey Pineapple',
    slug: 'honey-pineapple',
    description: 'Ultra-sweet Honey Pineapple variety with low acidity, intense gold flesh, and aromatic sugar notes.',
    price: 149,
    numericPrice: 149,
    mrp: 179,
    unit: '1 pc',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_honey_pineapple.jpg',
    tags: ['Imported', 'Honey Sweet'],
    freshnessBadge: 'Top Tier',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1 pc', price: 149 }
    ]
  },
  {
    id: 'f_plums_imported',
    name: 'Imported Plums',
    slug: 'imported-plums',
    description: 'Juicy, sweet imported plums featuring smooth crimson skin and stone-fruit aroma.',
    price: 149,
    numericPrice: 149,
    mrp: 179,
    unit: '250g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_plums_imported.jpg',
    tags: ['Imported', 'Plums'],
    freshnessBadge: 'Import Grade',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '250g', price: 149 },
      { label: '500g', price: 289 }
    ]
  },
  {
    id: 'f_plums_indian',
    name: 'Indian Plums',
    slug: 'indian-plums',
    description: 'Local Indian plums (Aloo Bukhara) offering sweet-tart bite and deep reddish-purple flesh.',
    price: 99,
    numericPrice: 99,
    mrp: 119,
    unit: '250g',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_plums_indian.jpg',
    tags: ['Indian', 'Plums', 'Sweet-Tart'],
    freshnessBadge: 'Daily Pick',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '250g', price: 99 },
      { label: '500g', price: 189 }
    ]
  },

  // STONE FRUITS, TROPICAL & BERRIES (18)
  {
    id: 'f_apricot',
    name: 'Apricot',
    slug: 'apricot',
    description: 'Soft, velvety fresh apricots featuring golden orange skin and sweet fragrant interior flesh.',
    price: 199,
    numericPrice: 199,
    mrp: 229,
    unit: '250g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_apricot.jpg',
    tags: ['Imported', 'Apricot'],
    freshnessBadge: 'Fresh Import',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '250g', price: 199 },
      { label: '500g', price: 389 }
    ]
  },
  {
    id: 'f_cherry',
    name: 'Cherry',
    slug: 'cherry',
    description: 'Plump, glossy dark red cherries with firm sweet flesh and rich stone-fruit flavor.',
    price: 179,
    numericPrice: 179,
    mrp: 199,
    unit: '100g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_cherry.jpg',
    tags: ['Imported', 'Sweet Cherries'],
    freshnessBadge: 'Air Flown',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '100g', price: 179 },
      { label: '250g', price: 429 }
    ]
  },
  {
    id: 'f_coconut',
    name: 'Coconut',
    slug: 'coconut',
    description: 'Fresh coconut with thick kernel meat and pure refreshing coconut water.',
    price: 65,
    numericPrice: 65,
    mrp: 75,
    unit: '1 pc',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_coconut.jpg',
    tags: ['Indian', 'Fresh Water'],
    freshnessBadge: 'Daily Pick',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1 pc', price: 65 }
    ]
  },
  {
    id: 'f_fig',
    name: 'Fig',
    slug: 'fig',
    description: 'Fresh bell-shaped figs (Anjeer) with soft honeyed pulp and delicate crunchy internal seeds.',
    price: 199,
    numericPrice: 199,
    mrp: 229,
    unit: '250g',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_fig.jpg',
    tags: ['Indian', 'Anjeer', 'Nutritious'],
    freshnessBadge: 'Farm Fresh',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '250g', price: 199 },
      { label: '500g', price: 389 }
    ]
  },
  {
    id: 'f_nectarine',
    name: 'Nectarine',
    slug: 'nectarine',
    description: 'Smooth-skinned stone fruit nectarine featuring sweet, aromatic yellow flesh.',
    price: 249,
    numericPrice: 249,
    mrp: 289,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_nectarine.jpg',
    tags: ['Imported', 'Nectarine'],
    freshnessBadge: 'Fresh Import',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 249 },
      { label: '1kg', price: 479 }
    ]
  },
  {
    id: 'f_peach',
    name: 'Peach',
    slug: 'peach',
    description: 'Velvety fuzzy-skinned peaches with sweet juicy flesh and rich floral fragrance.',
    price: 199,
    numericPrice: 199,
    mrp: 229,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/peach.jfif',
    tags: ['Imported', 'Peach'],
    freshnessBadge: 'Fresh Import',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 199 },
      { label: '1kg', price: 389 }
    ]
  },
  {
    id: 'f_pear_red',
    name: 'Pear Red',
    slug: 'pear-red',
    description: 'Sweet, juicy red-blushed pears with a delicate aroma and smooth, tender flesh.',
    price: 249,
    numericPrice: 249,
    mrp: 289,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/pear-red.png',
    tags: ['Imported', 'Red Pear', 'Juicy'],
    freshnessBadge: 'Fresh Import',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 129 },
      { label: '1kg', price: 249 }
    ]
  },
  {
    id: 'f_pear_green',
    name: 'Pear Green',
    slug: 'pear-green',
    description: 'Fresh, crisp green pears with a naturally sweet flavor and juicy texture.',
    price: 199,
    numericPrice: 199,
    mrp: 239,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/pear-green.jpg',
    tags: ['Indian', 'Green Pear', 'Crisp'],
    freshnessBadge: 'Daily Pick',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 109 },
      { label: '1kg', price: 199 }
    ]
  },
  {
    id: 'f_pomegranate',
    name: 'Pomegranate',
    slug: 'pomegranate',
    description: 'Plump Indian pomegranates filled with deep red, juicy, and sweet arils.',
    price: 249,
    numericPrice: 249,
    mrp: 289,
    unit: '1kg',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_pomegranate.jpg',
    tags: ['Indian', 'Antioxidant', 'Sweet Arils'],
    freshnessBadge: 'Super Fresh',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 129 },
      { label: '1kg', price: 249 }
    ]
  },
  {
    id: 'f_lychee',
    name: 'Lychee',
    slug: 'lychee',
    description: 'Sweet, floral Indian lychees with juicy translucent white flesh.',
    price: 249,
    numericPrice: 249,
    mrp: 289,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_lychee.jpg',
    tags: ['Indian', 'Floral Sweet'],
    freshnessBadge: 'Seasonal Fresh',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 249 },
      { label: '1kg', price: 479 }
    ]
  },
  {
    id: 'f_longan',
    name: 'Longan',
    slug: 'longan',
    description: 'Exotic imported Longan fruit featuring translucent sweet juicy arils.',
    price: 249,
    numericPrice: 249,
    mrp: 289,
    unit: '250g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/longan.jfif',
    tags: ['Imported', 'Exotic', 'Longan'],
    freshnessBadge: 'Exotic Grade',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '250g', price: 249 },
      { label: '500g', price: 479 }
    ]
  },
  {
    id: 'f_blueberry',
    name: 'Blueberry',
    slug: 'blueberry',
    description: 'Plump, antioxidant-rich blueberries with sweet-tangy taste.',
    price: 249,
    numericPrice: 249,
    mrp: 289,
    unit: '125g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_blueberry.jpg',
    tags: ['Imported', 'Superfood', 'Antioxidant'],
    freshnessBadge: 'Air Flown',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '125g', price: 249 },
      { label: '250g', price: 479 }
    ]
  },
  {
    id: 'f_blackberry',
    name: 'Blackberry',
    slug: 'blackberry',
    description: 'Deep purple-black fresh blackberries with rich sweet-tart juice.',
    price: 299,
    numericPrice: 299,
    mrp: 349,
    unit: '125g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_blackberry.jpg',
    tags: ['Imported', 'Blackberry'],
    freshnessBadge: 'Gourmet',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '125g', price: 299 }
    ]
  },
  {
    id: 'f_raspberry',
    name: 'Raspberry',
    slug: 'raspberry',
    description: 'Vibrant red raspberries featuring soft delicate texture and sweet-tangy berry taste.',
    price: 299,
    numericPrice: 299,
    mrp: 349,
    unit: '125g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_raspberry.jpg',
    tags: ['Imported', 'Raspberry'],
    freshnessBadge: 'Gourmet',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '125g', price: 299 }
    ]
  },
  {
    id: 'f_strawberry',
    name: 'Strawberry',
    slug: 'strawberry',
    description: 'Fresh Mahabaleshwar strawberries with rich red hue and sweet natural taste.',
    price: 129,
    numericPrice: 129,
    mrp: 149,
    unit: '200g',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_strawberry.jpg',
    tags: ['Indian', 'Strawberry'],
    freshnessBadge: 'Farm Fresh',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '200g', price: 129 },
      { label: '400g', price: 249 }
    ]
  },
  {
    id: 'f_cranberry',
    name: 'Cranberry',
    slug: 'cranberry',
    description: 'Tart, ruby-red fresh cranberries packed with natural phytonutrients.',
    price: 299,
    numericPrice: 299,
    mrp: 349,
    unit: '125g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_cranberry.jpg',
    tags: ['Imported', 'Cranberry'],
    freshnessBadge: 'Gourmet',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '125g', price: 299 }
    ]
  },
  {
    id: 'f_jamun',
    name: 'Jamun',
    slug: 'jamun',
    description: 'Traditional Indian Jamun (black plum) with astringent-sweet purple pulp.',
    price: 99,
    numericPrice: 99,
    mrp: 119,
    unit: '250g',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_jamun.jpg',
    tags: ['Indian', 'Jamun', 'Traditional'],
    freshnessBadge: 'Seasonal Fresh',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '250g', price: 99 },
      { label: '500g', price: 189 }
    ]
  },
  {
    id: 'f_makrut_lemon',
    name: 'Makrut Lemon',
    slug: 'makrut-lemon',
    description: 'Small knobbly Makrut lemon with intensely fragrant zest, prized for Southeast Asian cooking.',
    price: 149,
    numericPrice: 149,
    mrp: 169,
    unit: '250g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_makrut_lemon.jpg',
    tags: ['Imported', 'Citrus', 'Aromatic'],
    freshnessBadge: 'Exotic',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '250g', price: 149 }
    ]
  },
  {
    id: 'f_italian_lemon',
    name: 'Italian Lemon',
    slug: 'italian-lemon',
    description: 'Large glossy Italian lemons with thick zest-rich skin and bright, tangy juice.',
    price: 129,
    numericPrice: 129,
    mrp: 149,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_italian_lemon.jpg',
    tags: ['Imported', 'Citrus'],
    freshnessBadge: 'Exotic',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 129 }
    ]
  },
  {
    id: 'f_mulberry',
    name: 'Mulberry',
    slug: 'mulberry',
    description: 'Deep purple mulberries with a juicy, sweet-tart flavor, hand-picked at peak ripeness.',
    price: 89,
    numericPrice: 89,
    mrp: 109,
    unit: '200g',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_mulberry.jpg',
    tags: ['Indian', 'Seasonal'],
    freshnessBadge: 'Seasonal Fresh',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '200g', price: 89 }
    ]
  },
  {
    id: 'f_rambutan',
    name: 'Rambutan',
    slug: 'rambutan',
    description: 'Exotic red rambutan with soft spiky skin and sweet, translucent lychee-like flesh.',
    price: 249,
    numericPrice: 249,
    mrp: 279,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_rambutan.jpg',
    tags: ['Imported', 'Exotic'],
    freshnessBadge: 'Exotic',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 249 }
    ]
  },
  {
    id: 'f_red_diamond_guava',
    name: 'Red Diamond Guava',
    slug: 'red-diamond-guava',
    description: 'Premium Red Diamond guava variety with deep pink flesh and rich, sweet aroma.',
    price: 139,
    numericPrice: 139,
    mrp: 159,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'imported-fruits',
    image: '/products/f_red_diamond_guava.jpg',
    tags: ['Imported', 'Pink Flesh'],
    freshnessBadge: 'Exotic',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 139 },
      { label: '1kg', price: 259 }
    ]
  },
  {
    id: 'f_red_banana',
    name: 'Red Banana',
    slug: 'red-banana',
    description: 'Sweet, creamy red bananas with a subtle raspberry-like flavor and reddish-purple skin.',
    price: 79,
    numericPrice: 79,
    mrp: 89,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_red_banana.jpg',
    tags: ['Indian', 'Energy'],
    freshnessBadge: 'Farm Fresh',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 79 },
      { label: '1kg', price: 149 }
    ]
  },
  {
    id: 'f_nendran_banana',
    name: 'Nendran Banana',
    slug: 'nendran-banana',
    description: 'Kerala-grown Nendran bananas, firm and starchy, ideal for chips and traditional cooking.',
    price: 69,
    numericPrice: 69,
    mrp: 79,
    unit: '500g',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/products/f_nendran_banana.jpg',
    tags: ['Indian', 'Kerala'],
    freshnessBadge: 'Farm Fresh',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '500g', price: 69 },
      { label: '1kg', price: 129 }
    ]
  },
  {
    id: 'f_watermelon_supreet',
    name: 'Watermelon Supreet',
    slug: 'watermelon-supreet',
    description: 'Supreet hybrid watermelon with a thin rind and exceptionally sweet, crisp red flesh.',
    price: 139,
    numericPrice: 139,
    mrp: 159,
    unit: '1 pc',
    categoryId: 'fruits',
    subcategoryId: 'indian-fruits',
    image: '/product-images/watermelon-supreet.jpg',
    tags: ['Indian', 'Supreet', 'Hydrating'],
    freshnessBadge: 'Farm Fresh',
    deliveryEstimate: '60 mins',
    stockStatus: 'in_stock',
    weights: [
      { label: '1 pc (approx 3kg)', price: 139 }
    ]
  }
];
