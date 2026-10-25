export interface WeightOption {
  weight?: string;
  label?: string;
  price: string | number;
  originalPrice?: string | number;
}

export interface Product {
  id: string | number;
  baseId?: string | number;
  name: string;
  subtitle?: string;
  description?: string;
  price: string | number;
  numericPrice?: number;
  originalPrice?: string | number;
  discount?: number;
  unit?: string;
  selectedWeight?: string;
  selectedCut?: string;
  selectedCleaning?: string;
  image: string;
  images?: string[];
  badge?: string;
  freshnessBadge?: string;
  deliveryEstimate?: string;
  rating?: number;
  reviewsCount?: number;
  isOrganic?: boolean;
  isPopular?: boolean;
  category?: string;
  categoryId?: string;
  subcategory?: string;
  subcategoryId?: string;
  subsubcategory?: string;
  subSubcategoryId?: string;
  weights?: WeightOption[];
  origin?: string;
  tags?: string[];
  features?: string[];
  isMeatProduct?: boolean;
  fishCuts?: string[];
  cleaningOptions?: string[];
  cutType?: string;
  stock?: number;
  slug?: string;
  mrp?: string | number;
  stockStatus?: 'in_stock' | 'out_of_stock';
  trackInventory?: boolean;
  allowBackorder?: boolean;
  isFrozen?: boolean;
  // Wholesale (bulk, pan-India) sale fields. A product is wholesale-eligible
  // ONLY when wholesaleEligible is explicitly true -- quantity alone never
  // implies wholesale, and the default (unset/false) excludes a product from
  // the wholesale catalog entirely, which is how meat/smoothies/fast-food
  // stay out of wholesale shipping unless an admin explicitly opts them in.
  wholesaleEligible?: boolean;
  wholesalePrice?: number;
  wholesaleUnit?: string;
  wholesaleMinQty?: number;
}

// A single retail-deliverable PIN code, admin-managed. Document id in
// Firestore is the pincode itself. Never readable by customers directly --
// serviceability is checked through POST /api/delivery/check-pincode so the
// full list of serviceable localities is never exposed to the client.
export interface DeliveryPincode {
  pincode: string;
  label?: string;
  enabled: boolean;
  deliveryFee?: number;
  minOrderAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

// A wholesale shipping zone: a named group of 3-digit PIN code prefixes
// (e.g. Karnataka = "560","561","562"...) with its own fee/MOQ, so wholesale
// serviceability is validated against real configured zones rather than
// promising every Indian PIN code works.
export interface WholesaleZone {
  id: string;
  label: string;
  pincodePrefixes: string[];
  enabled: boolean;
  shippingFee: number;
  minOrderValue: number;
  etaDays?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Banner {
  id: string;
  campaignName: string;
  heading: string;
  description?: string;
  desktopImage: string;
  mobileImage?: string;
  ctaLabel?: string;
  ctaLinkType?: 'category' | 'product' | 'url' | 'none';
  ctaLinkValue?: string;
  startDate?: string;
  endDate?: string;
  isPublished: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CartProduct = Product;

export interface SubSubCategory {
  id: string;
  label: string;
}

export interface SubCategory {
  id: string;
  label: string;
  items?: SubSubCategory[];
}

export interface Category {
  id: string;
  label: string;
  items?: SubCategory[];
  isFrozen?: boolean;
}

export interface CartItem {
  id: string | number;
  name: string;
  price: string | number;
  numericPrice: number;
  unit?: string;
  image: string;
  quantity: number;
  selectedWeight?: string;
  selectedCut?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  picture?: string;
  role?: string;
  // Authoritative admin flag, sourced from the Firebase Auth custom claim on
  // the user's own ID token (see CartContext.tsx / server.ts). Never trust
  // `role` alone for access decisions -- it is a display-only mirror.
  admin?: boolean;
  phone?: string;
  address?: string;
  pincode?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  pincode?: string;
  role?: 'admin' | 'customer';
  createdAt?: { seconds: number; nanoseconds: number } | string | number | Date;
}

export interface Order {
  id: string;
  orderId?: string;
  userId: string;
  amount: number;
  subtotal?: number;
  deliveryFee?: number;
  grandTotal?: number;
  items: Array<{
    id: string | number;
    name: string;
    quantity: number;
    price: number;
    image?: string;
    selectedWeight?: string;
    selectedCut?: string;
    baseId?: string | number;
  }>;
  shippingDetails: {
    name: string;
    phone: string;
    address: string;
    pincode?: string;
  };
  paymentMethod?: string;
  utrNumber?: string;
  status: string;
  orderStatus?: 'pending' | 'confirmed' | 'packed' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'cancelled' | string;
  paymentStatus?: 'unpaid' | 'payment_pending' | 'paid' | 'refunded' | 'failed' | string;
  createdAt: { seconds: number; nanoseconds: number } | string | number | Date;
  updatedAt?: { seconds: number; nanoseconds: number } | string | number | Date;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  discountAmount?: number;
  couponCode?: string | null;
  stockConflict?: boolean;
  stockConflictReason?: string;
  cancelReason?: string;
  createdViaWebhook?: boolean;
  trackingNumber?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  statusHistory?: Array<{
    status: string;
    at: { seconds: number; nanoseconds: number } | string | number | Date;
  }>;
  // 'retail' (default when absent, for backward compatibility with orders
  // created before this field existed) or 'wholesale'. Determines which
  // pricing/shipping/eligibility rules were applied server-side.
  orderType?: 'retail' | 'wholesale';
  wholesaleZoneId?: string;
  wholesaleZoneLabel?: string;
}
