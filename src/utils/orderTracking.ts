export interface TrackingStep {
  id: string;
  label: string;
  desc: string;
}

export interface OrderTrackingPipeline {
  normalizedStatus: string;
  steps: TrackingStep[];
  currentIndex: number;
  progressPercent: number;
  isTerminalNegative: boolean;
  isWhatsAppPending: boolean;
}

export interface RecentOrderBookmark {
  orderId: string;
  savedAt: string;
}

const RECENT_ORDERS_STORAGE_KEY = 'jiyoo_recent_order_ids_v1';
const MAX_BOOKMARKS = 6;

export const ORDER_TRACKING_STEPS: TrackingStep[] = [
  {
    id: 'pending',
    label: 'Order Placed',
    desc: 'Your order is logged and queued for verification.',
  },
  {
    id: 'confirmed',
    label: 'Order Confirmed',
    desc: 'Verified and scheduled for warehouse picking.',
  },
  {
    id: 'packing',
    label: 'Quality Check & Packed',
    desc: 'Hand-graded, hygienically packed, and sealed fresh.',
  },
  {
    id: 'shipped',
    label: 'Dispatched',
    desc: 'Handed over to our insulated logistics / courier fleet.',
  },
  {
    id: 'out_for_delivery',
    label: 'Out for Delivery',
    desc: 'Rider is en route to your delivery doorstep.',
  },
  {
    id: 'delivered',
    label: 'Delivered',
    desc: 'Delivered safely. Thank you for choosing JIYOO!',
  },
];

export function normalizeOrderIdInput(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^#+/, '')
    .toUpperCase();
}

export const normalizeOrderId = normalizeOrderIdInput;

export function normalizePhoneLast10(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

export const normalizeTrackingPhone = normalizePhoneLast10;

export function isValidTrackingPhone(raw: string): boolean {
  return /^\d{10}$/.test(normalizePhoneLast10(raw));
}

export function normalizeOrderStatus(rawStatus: string | null | undefined): string {
  const s = String(rawStatus || 'pending').trim().toLowerCase();

  if (s === 'cancelled' || s === 'canceled' || s === 'expired') return 'cancelled';
  if (s === 'refunded' || s === 'partially_refunded') return 'refunded';
  if (s === 'failed' || s === 'payment_failed') return 'failed';
  if (s === 'delivered' || s === 'completed') return 'delivered';
  if (s === 'out_for_delivery') return 'out_for_delivery';
  if (s === 'shipped' || s === 'dispatched' || s === 'in_transit') return 'shipped';
  if (s === 'packing' || s === 'packed' || s === 'processing' || s === 'preparing') return 'packing';
  if (s === 'confirmed' || s === 'paid') return 'confirmed';
  if (s === 'whatsapp_pending' || s === 'awaiting_whatsapp_confirmation') return 'whatsapp_pending';

  return 'pending';
}

export function formatOrderStatusLabel(rawStatus: string | null | undefined): string {
  const normalized = normalizeOrderStatus(rawStatus);
  switch (normalized) {
    case 'confirmed':
      return 'Confirmed';
    case 'packing':
      return 'Quality Check & Packed';
    case 'shipped':
      return 'Dispatched';
    case 'out_for_delivery':
      return 'Out for Delivery';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Cancelled & Refunded';
    case 'failed':
      return 'Payment Failed';
    case 'whatsapp_pending':
      return 'Awaiting WhatsApp Confirmation';
    default:
      return 'Order Placed';
  }
}

export function getOrderTrackingPipeline(rawStatus: string | null | undefined): OrderTrackingPipeline {
  const normalizedStatus = normalizeOrderStatus(rawStatus);
  const isTerminalNegative = ['cancelled', 'refunded', 'failed'].includes(normalizedStatus);
  const isWhatsAppPending = normalizedStatus === 'whatsapp_pending';

  let currentIndex = ORDER_TRACKING_STEPS.findIndex((s) => s.id === normalizedStatus);
  if (currentIndex === -1) {
    currentIndex = 0;
  }

  const progressPercent = isTerminalNegative
    ? 0
    : Math.round(((currentIndex + 1) / ORDER_TRACKING_STEPS.length) * 100);

  return {
    normalizedStatus,
    steps: ORDER_TRACKING_STEPS,
    currentIndex,
    progressPercent,
    isTerminalNegative,
    isWhatsAppPending,
  };
}

export function sanitizeTrackingHref(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function formatTrackingDateTime(value: unknown): string {
  if (!value) return 'Recently';
  try {
    let d: Date | null = null;
    if (typeof value === 'string' || typeof value === 'number') {
      d = new Date(value);
    } else if (typeof (value as any)?.toDate === 'function') {
      d = (value as any).toDate();
    } else if (typeof (value as any)?.seconds === 'number') {
      d = new Date((value as any).seconds * 1000);
    }
    if (!d || isNaN(d.getTime())) return 'Recently';
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
}

export function readRecentOrderBookmarks(): RecentOrderBookmark[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(RECENT_ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized: RecentOrderBookmark[] = [];
    for (const item of parsed) {
      if (typeof item === 'string') {
        const id = normalizeOrderIdInput(item);
        if (id.length >= 4 && id.length <= 40) {
          normalized.push({ orderId: id, savedAt: new Date().toISOString() });
        }
      } else if (item && typeof item === 'object' && typeof (item as any).orderId === 'string') {
        const id = normalizeOrderIdInput((item as any).orderId);
        if (id.length >= 4 && id.length <= 40) {
          normalized.push({
            orderId: id,
            savedAt: typeof (item as any).savedAt === 'string' ? (item as any).savedAt : new Date().toISOString(),
          });
        }
      }
    }
    return normalized.slice(0, MAX_BOOKMARKS);
  } catch {
    return [];
  }
}

export function saveRecentOrderBookmark(orderId: string): RecentOrderBookmark[] {
  const cleanId = normalizeOrderIdInput(orderId);
  const existing = readRecentOrderBookmarks();
  if (!cleanId || cleanId.length < 4 || cleanId.length > 40) {
    return existing;
  }
  const filtered = existing.filter((entry) => entry.orderId !== cleanId);
  const next: RecentOrderBookmark[] = [
    { orderId: cleanId, savedAt: new Date().toISOString() },
    ...filtered,
  ].slice(0, MAX_BOOKMARKS);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(RECENT_ORDERS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}
