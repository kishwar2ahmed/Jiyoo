export interface BannerSlide {
  id: string;
  image: string;
  alt: string;
  badge: string;
  title: string;
  subtitle: string;
  isActive: boolean;
  order: number;
  linkUrl?: string;
  isFeatured?: boolean;
  highlightTone?: 'amber' | 'emerald' | 'none';
  durationMs?: number;
  hideCaption?: boolean;
}

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
  brand?: string;
  count?: number | string;
  netWeight?: string;
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
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  reservationId?: string;
  inventoryReservationId?: string;
  refundStatus?: string;
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
    toStatus?: string;
    fromStatus?: string;
    changedAt?: { seconds: number; nanoseconds: number } | string | number | Date;
    at?: { seconds: number; nanoseconds: number } | string | number | Date;
    actor?: string;
    actorRole?: string;
    eventType?: string;
    reason?: string | null;
    integrityHash?: string;
  }>;
  auditSequence?: number;
  lastAuditHash?: string;
  lastAuditAt?: string;
  lastAuditedStatus?: string;
  lastAuditedPaymentStatus?: string;
  lastAuditedAmount?: number;
  auditTrail?: OrderAuditLogEntry[];
  adminNotes?: string;
  // 'retail' (default when absent, for backward compatibility with orders
  // created before this field existed) or 'wholesale'. Determines which
  // pricing/shipping/eligibility rules were applied server-side.
  orderType?: 'retail' | 'wholesale';
  wholesaleZoneId?: string;
  wholesaleZoneLabel?: string;
}

export type OrderAuditEventType =
  | 'ORDER_CREATED'
  | 'STATUS_CHANGED'
  | 'PAYMENT_STATUS_CHANGED'
  | 'PAYMENT_VERIFIED'
  | 'WEBHOOK_RECONCILED'
  | 'ORDER_CANCELLED'
  | 'ORDER_EXPIRED'
  | 'REFUND_INITIATED'
  | 'ORDER_REFUNDED'
  | 'REFUND_FAILED'
  | 'ORDER_MODIFIED'
  | 'STOCK_CONFLICT_FLAGGED'
  | 'ORDER_ANONYMIZED';

export interface OrderAuditLogEntry {
  id: string;
  orderId: string;
  sequence: number;
  eventType: OrderAuditEventType | string;
  action: string;
  category?: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  previousPaymentStatus?: string | null;
  newPaymentStatus?: string | null;
  amount?: number;
  actor: string;
  actorUid?: string | null;
  actorRole: 'customer' | 'admin' | 'system' | 'webhook' | string;
  source: string;
  reason?: string | null;
  changes?: Record<string, { from: any; to: any }>;
  details: string;
  previousHash: string;
  integrityHash: string;
  createdAt: string | { seconds: number; nanoseconds: number };
}

export interface OrderAuditIntegrityReport {
  verified: boolean;
  chainValid: boolean;
  stateMatchesLastAudit: boolean;
  totalEvents: number;
  entryCount?: number;
  lastAuditHash: string | null;
  headHash?: string | null;
  lastAuditAt: string | null;
  tamperReason?: string | null;
  mismatchDetails: string[];
}

