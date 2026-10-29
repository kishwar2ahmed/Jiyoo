import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, User, MapPin, CreditCard, Globe, Bell, Shield, Heart, Package, Star, 
  HelpCircle, LogOut, Trash2, Camera, Loader2, ChevronRight, Edit3, Plus, 
  Search, Printer, RotateCcw, MessageSquare, CheckCircle2, Clock, 
  Truck, ShoppingBag, RefreshCw, ExternalLink, Copy, Check 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../../../contexts/CartContext';
import { useSettings } from '../../../contexts/SettingsContext';
import { useOrderActions } from '../hooks/useOrderActions';
import { auth, db, storage } from '../../../services/firebase';
import { doc, updateDoc, collection, query, where, getDocs, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { LocationPickerModal } from '../../core/components/LocationPickerModal';
import { getOptimizedImageUrl } from '../../../utils/imageUtils';
import { useToast } from '../../core/contexts/ToastContext';
import { useConfirm } from '../../core/contexts/ConfirmContext';
import { useModalBackButton } from '../../core/hooks/useModalBackButton';
import { PremiumShieldMark } from '../../core/components/PremiumShieldMark';
import { InstagramIcon, WhatsAppIcon, OFFICIAL_INSTAGRAM_URL } from '../../core/components/SocialIcons';
import { useStorefrontProducts } from '../../storefront/hooks/useStorefrontProducts';

const normalizeOrderStatus = (rawStatus?: string): string => {
  const s = String(rawStatus || 'pending').trim().toLowerCase();
  if (s === 'awaiting_whatsapp_confirmation' || s === 'whatsapp_pending') return 'awaiting_whatsapp';
  if (s === 'received' || s === 'paid' || s === 'processing' || s === 'paid_upi_pending_verify') return 'pending';
  if (s === 'shipped') return 'dispatched';
  if (s === 'completed') return 'delivered';
  return s;
};

const OrderTrackingTimeline = ({ order }: { order: any }) => {
  const rawStatus = order?.orderStatus || order?.status || 'pending';
  const normalizedStatus = normalizeOrderStatus(rawStatus);
  const isWhatsAppPending = normalizedStatus === 'awaiting_whatsapp';

  const steps = [
    {
      id: 'pending',
      label: isWhatsAppPending ? 'WhatsApp Request Logged' : 'Order Received',
      desc: isWhatsAppPending
        ? 'Your order reference is saved. Send the prefilled WhatsApp message so our team can confirm it.'
        : 'We have received your order and logged your items.',
    },
    {
      id: 'confirmed',
      label: 'Order Confirmed',
      desc: 'Your order and delivery slot have been verified by JIYOO.',
    },
    {
      id: 'packed',
      label: 'Cleaned & Packed',
      desc: 'Freshly prepared, quality-checked, and sealed in temperature-locked packaging.',
    },
    {
      id: 'dispatched',
      label: 'Dispatched',
      desc: 'Handed over to our cold-chain delivery partner.',
    },
    {
      id: 'out_for_delivery',
      label: 'Out for Delivery',
      desc: 'Our delivery rider is on the way to your doorstep.',
    },
    {
      id: 'delivered',
      label: 'Delivered',
      desc: 'Delivered successfully. Enjoy your fresh catch & produce!',
    },
  ];

  if (['cancelled', 'refunded', 'failed'].includes(normalizedStatus)) {
    return (
      <div className="mt-4 p-4 bg-red-50/90 border border-red-200 rounded-xl">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className="text-red-900 font-bold text-xs sm:text-sm flex items-center gap-1.5">
            <X className="w-4 h-4 text-red-600 shrink-0" />
            {normalizedStatus === 'refunded' ? 'Order Cancelled & Refunded' : 'Order Cancelled'}
          </h4>
          <span className="text-[11px] font-mono text-red-700">
            #{order?.orderId || order?.id}
          </span>
        </div>
        <p className="text-xs text-red-700 leading-relaxed">
          {order?.cancelReason
            ? `Reason: ${order.cancelReason}`
            : 'This order was cancelled and will not be fulfilled. If you paid online, any eligible refund is processed automatically.'}
        </p>
      </div>
    );
  }

  let currentStepIndex = steps.findIndex((s) => s.id === normalizedStatus);
  if (currentStepIndex === -1) currentStepIndex = 0;
  const progressPercent = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  return (
    <div className="mt-4 pt-4 border-t border-stone-200/80">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h4 className="font-bold text-stone-900 text-xs sm:text-sm flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-emerald-700" />
          Live Order Status &amp; Tracking
        </h4>
        <span className="text-[11px] font-mono font-semibold text-emerald-800 tabular-nums">
          Stage {currentStepIndex + 1} of {steps.length} · {progressPercent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-emerald-600 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Carrier / Tracking metadata if assigned */}
      {(order?.trackingNumber || order?.trackingCarrier || order?.trackingUrl) && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="space-y-0.5">
            {order.trackingCarrier && (
              <p className="text-stone-700">
                Carrier: <span className="font-semibold text-stone-900">{order.trackingCarrier}</span>
              </p>
            )}
            {order.trackingNumber && (
              <p className="text-stone-700 font-mono">
                Tracking #: <span className="font-semibold text-stone-900">{order.trackingNumber}</span>
              </p>
            )}
          </div>
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition-colors"
            >
              <span>Track Shipment</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Step-by-Step Timeline */}
      <div className="relative pl-1">
        <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-stone-200" />
        <div className="space-y-3.5 relative">
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step.id} className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${
                    isCompleted
                      ? isCurrent
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                        : 'bg-emerald-600 text-white'
                      : 'bg-stone-100 text-stone-400 border border-stone-300'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-[10px] font-mono font-bold tabular-nums">{idx + 1}</span>
                  )}
                </div>
                <div className="pt-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs sm:text-sm font-bold ${
                        isCurrent
                          ? 'text-emerald-800'
                          : isCompleted
                          ? 'text-stone-900'
                          : 'text-stone-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    <span
                      className={`text-[10px] font-medium ${
                        isCurrent
                          ? 'text-emerald-700 font-semibold'
                          : isCompleted
                          ? 'text-stone-500'
                          : 'text-stone-400'
                      }`}
                    >
                      {isCurrent ? 'Current Stage' : isCompleted ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export function AccountCenter({ onClose }: { onClose: () => void }) {
  const { user, logoutUser, wishlist, addToCart, toggleWishlist } = useCart();
  const { settings } = useSettings();
  const { currentProducts } = useStorefrontProducts();
  const wishlistedProducts = (currentProducts || []).filter(p => wishlist?.includes(String(p.id)));
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedAdvancedOrderId, setExpandedAdvancedOrderId] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Direct Order ID Lookup & Tracking state (supports tracking Guest WhatsApp or any Order ID)
  const [showOrderLookup, setShowOrderLookup] = useState(false);
  const [lookupOrderId, setLookupOrderId] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [trackedLookupOrder, setTrackedLookupOrder] = useState<any | null>(null);

  const { cancelOrder } = useOrderActions(setOrders);
  
  const [reviews, setReviews] = useState<any[]>([]);

  // Order Search & Filter state
  const [orderFilter, setOrderFilter] = useState<'all' | 'processing' | 'delivered' | 'cancelled'>('all');
  const [orderSearch, setOrderSearch] = useState('');

  const filteredOrders = useMemo(() => {
    const queryStr = orderSearch.trim().toLowerCase();
    return orders.filter((o: any) => {
      const rawStatus = String(o.orderStatus || o.status || 'pending').toLowerCase();
      if (orderFilter === 'processing') {
        const isProcessing = [
          'pending',
          'received',
          'awaiting_whatsapp_confirmation',
          'whatsapp_pending',
          'paid_upi_pending_verify',
          'confirmed',
          'packed',
          'shipped',
          'dispatched',
          'out_for_delivery',
        ].includes(rawStatus);
        if (!isProcessing) return false;
      } else if (orderFilter === 'delivered') {
        if (!['delivered', 'completed'].includes(rawStatus)) return false;
      } else if (orderFilter === 'cancelled') {
        if (!['cancelled', 'refunded', 'failed'].includes(rawStatus)) return false;
      }

      if (!queryStr) return true;
      const orderIdText = String(o.orderId || o.id || '').toLowerCase();
      const statusText = rawStatus.replace(/_/g, ' ');
      const phoneText = String(o.shippingDetails?.phone || o.customerPhone || '').toLowerCase();
      const itemMatch = Array.isArray(o.items) && o.items.some((it: any) => String(it?.name || '').toLowerCase().includes(queryStr));
      return orderIdText.includes(queryStr) || statusText.includes(queryStr) || phoneText.includes(queryStr) || itemMatch;
    });
  }, [orders, orderFilter, orderSearch]);

  const orderSummaryMetrics = useMemo(() => {
    let activeCount = 0;
    let deliveredCount = 0;
    orders.forEach((o: any) => {
      const st = String(o.orderStatus || o.status || 'pending').toLowerCase();
      if (['delivered', 'completed'].includes(st)) {
        deliveredCount += 1;
      } else if (!['cancelled', 'refunded', 'failed'].includes(st)) {
        activeCount += 1;
      }
    });
    return {
      total: orders.length,
      active: activeCount,
      delivered: deliveredCount,
    };
  }, [orders]);
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Let the device/browser back button close this panel one step at a time
  // instead of navigating away from the site.
  useModalBackButton(true, onClose);

  const getOrderTimestampMs = (order: any): number => {
    const val = order?.createdAt;
    if (!val) return 0;
    if (typeof val === 'string') return Date.parse(val) || 0;
    if (typeof val?.toDate === 'function') return val.toDate().getTime();
    if (typeof val?.seconds === 'number') return val.seconds * 1000;
    return new Date(val).getTime() || 0;
  };

  const fetchOrders = async (reset = true) => {
    if (!user) return;
    setLoading(true);
    const mergedMap = new Map<string, any>();

    // 1. Try server-side authenticated order history endpoint
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        const params = new URLSearchParams({ status: 'all', pageSize: '50' });
        const res = await fetch(`/api/orders/history?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && Array.isArray(data.orders)) {
          data.orders.forEach((o: any) => {
            if (o && (o.id || o.orderId)) {
              mergedMap.set(String(o.id || o.orderId), o);
            }
          });
        }
      }
    } catch (err) {
      console.warn('Server order history fetch fallback:', err);
    }

    // 2. Also query Firestore `orders` collection directly for this authenticated user
    try {
      const qUser = query(collection(db, 'orders'), where('userId', '==', user.id));
      const snapUser = await getDocs(qUser);
      snapUser.docs.forEach((docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() };
        if (!mergedMap.has(docSnap.id)) {
          mergedMap.set(docSnap.id, data);
        }
      });
    } catch (firestoreErr) {
      console.warn('Direct Firestore orders query fallback:', firestoreErr);
    }

    // 3. Merge any locally cached orders belonging to this user
    try {
      const local = JSON.parse(localStorage.getItem(`jiyoo_orders_history_v2:${user.id}`) || '[]');
      if (Array.isArray(local)) {
        local.forEach((lo: any) => {
          const key = String(lo?.id || lo?.orderId || '');
          if (key && (!lo.userId || lo.userId === user.id) && !mergedMap.has(key)) {
            mergedMap.set(key, lo);
          }
        });
      }
    } catch {
      // Ignore corrupt localStorage fallback
    }

    const sortedOrders = Array.from(mergedMap.values()).sort(
      (a, b) => getOrderTimestampMs(b) - getOrderTimestampMs(a)
    );

    if (reset || sortedOrders.length > 0) {
      setOrders(sortedOrders);
      // Automatically expand the most recent order if none is expanded yet
      if (sortedOrders.length > 0 && !expandedOrderId) {
        setExpandedOrderId(sortedOrders[0].id || sortedOrders[0].orderId);
      }
    }
    setLoading(false);
  };

  const handleTrackByOrderId = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = lookupOrderId.trim().replace(/^#/, '');
    if (!cleanId) {
      setLookupError('Please enter your Order ID (e.g. JY-123456).');
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    setTrackedLookupOrder(null);
    try {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderId: cleanId,
          phone: lookupPhone.trim() || (user as any)?.phone || '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.order) {
        setLookupError(
          data.error ||
            'Could not find a matching order. If this was a Guest WhatsApp order, please also enter the 10-digit mobile number used at checkout.'
        );
        return;
      }
      setTrackedLookupOrder(data.order);
    } catch {
      setLookupError('Unable to reach the order tracking service right now. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Load data based on active tab
  useEffect(() => {
    if (!user) return;
    
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'addresses') {
      const fetchAddresses = async () => {
        setLoading(true);
        try {
          const q = query(collection(db, "users", user.id, "addresses"));
          const snap = await getDocs(q);
          setAddresses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
          console.error("Failed to fetch addresses:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchAddresses();
    } else if (activeTab === 'reviews') {
      const fetchReviews = async () => {
        setLoading(true);
        try {
          const q = query(collection(db, "reviews"), where("userId", "==", user.id));
          const snap = await getDocs(q);
          const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          loaded.sort((a: any, b: any) => (((b.createdAt as any)?.seconds || 0) || 0) - (((a.createdAt as any)?.seconds || 0) || 0));
          setReviews(loaded);
        } catch (err) {
          console.error("Failed to fetch reviews:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchReviews();
    }
  }, [activeTab, user]);

  if (!user) return null;

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Match the server/storage policy. SVG is deliberately disallowed because
    // it can contain active content when opened directly as an image resource.
    const allowedProfileTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedProfileTypes.has(file.type)) {
      showToast('Please upload a JPG, PNG, or WebP image.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image must be smaller than 10MB', 'error');
      return;
    }
    
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const dataUrl = ev.target?.result as string;
          
          const storageRef = ref(storage, `users/${user.id}/profile_${Date.now()}.webp`);
          await uploadString(storageRef, dataUrl, 'data_url');
          const downloadUrl = await getDownloadURL(storageRef);
          
          if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL: downloadUrl });
          }
          
          await updateDoc(doc(db, 'users', user.id), { picture: downloadUrl });
          showToast("Profile image updated successfully!", "success");
        } catch (err) {
          console.error("Storage upload error:", err);
          showToast("Failed to upload profile image.", "error");
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (await confirm({ title: "Delete account?", message: "Are you sure you want to delete your account? This action cannot be undone." })) {
      try {
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          const res = await fetch('/api/account/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to delete account data');
          }
          // Server has already cleaned up Firestore data and the Auth user.
          logoutUser();
          onClose();
        }
      } catch (err: any) {
        if (err?.code === 'auth/requires-recent-login') {
          showToast("Please log out and log back in to delete your account.", "error");
        } else {
          showToast(err.message || "Failed to delete account.", "error");
        }
      }
    }
  };

  const escapeInvoiceHtml = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const handlePrintInvoice = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = order.createdAt?.seconds 
      ? new Date(order.createdAt.seconds * 1000).toLocaleString() 
      : (order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A');

    const itemsHtml = (order.items || []).map((i: any) => `
      <tr>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 600; color: #111827;">${escapeInvoiceHtml(i.name)}</div>
          ${i.selectedWeight ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Weight: ${escapeInvoiceHtml(i.selectedWeight)}</div>` : ''}
          ${i.selectedCut ? `<div style="font-size: 11px; color: #6b7280;">Cut: ${escapeInvoiceHtml(i.selectedCut)}</div>` : ''}
        </td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 500;">${escapeInvoiceHtml(i.quantity)}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${escapeInvoiceHtml(i.price || i.numericPrice || 0)}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">₹${escapeInvoiceHtml((i.price || i.numericPrice || 0) * i.quantity)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice #${escapeInvoiceHtml(order.id)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1f2937; max-width: 800px; margin: 0 auto; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111827; padding-bottom: 20px; margin-bottom: 30px; }
          .brand { font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #047857; }
          .title { font-size: 18px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 1px; }
          .details { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 20px; }
          .details-box { background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; flex: 1; font-size: 13px; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
          th { background: #f3f4f6; padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #d1d5db; color: #374151; }
          .total-box { margin-left: auto; width: 260px; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; text-align: right; }
          .total-amount { font-size: 20px; font-weight: 800; color: #065f46; margin-top: 4px; }
          .footer { margin-top: 60px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">JIYOO</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Fresh & Premium Marketplace</div>
          </div>
          <div class="title">INVOICE</div>
        </div>

        <div class="details">
          <div class="details-box">
            <strong style="color: #111827;">Order Reference</strong><br>
            Order ID: #${escapeInvoiceHtml(order.id)}<br>
            Date: ${escapeInvoiceHtml(dateStr)}<br>
            Payment Method: ${escapeInvoiceHtml(order.paymentMethod || 'Online Payment')}<br>
            Status: <span style="text-transform: uppercase; font-weight: 600; color: #047857;">${escapeInvoiceHtml(order.status || 'Confirmed')}</span>
          </div>
          <div class="details-box">
            <strong style="color: #111827;">Delivery Address</strong><br>
            Name: ${escapeInvoiceHtml(order.shippingDetails?.name || user.name || 'Customer')}<br>
            Address: ${escapeInvoiceHtml(order.shippingDetails?.address || 'N/A')}<br>
            Pincode: ${escapeInvoiceHtml(order.shippingDetails?.pincode || 'N/A')}<br>
            Phone: ${escapeInvoiceHtml(order.shippingDetails?.phone || 'N/A')}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="total-box">
          <div style="font-size: 12px; color: #047857; text-transform: uppercase; font-weight: 600;">Total Paid</div>
          <div class="total-amount">₹${escapeInvoiceHtml(order.amount || 0)}</div>
        </div>

        <div class="footer">
          Thank you for ordering with JIYOO!<br>
          For support or delivery tracking queries, please reach out via our Help Center.
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleReorder = (order: any) => {
    if (!order.items || order.items.length === 0) return;
    let addedCount = 0;
    order.items.forEach((item: any) => {
      addToCart({
        id: item.id,
        name: item.name,
        price: `₹${item.price || item.numericPrice}`,
        numericPrice: item.price || item.numericPrice,
        image: item.image || '',
        category: item.category || 'fresh',
        unit: item.selectedWeight || '500g',
        stock: 100
      }, item.quantity || 1);
      addedCount += (item.quantity || 1);
    });
    showToast(`Successfully added ${addedCount} item(s) from this order back to your cart!`, "success");
  };

  const getStatusBadge = (statusStr: string) => {
    const status = (statusStr || 'pending').toLowerCase();
    
    if (['delivered', 'completed'].includes(status)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
        </span>
      );
    }
    if (['cancelled', 'refunded', 'failed'].includes(status)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-semibold">
          <X className="w-3.5 h-3.5" /> Cancelled
        </span>
      );
    }
    if (['shipped', 'dispatched'].includes(status)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-semibold">
          <Truck className="w-3.5 h-3.5" /> Dispatched
        </span>
      );
    }
    if (['out_for_delivery'].includes(status)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
          <Truck className="w-3.5 h-3.5" /> Out for Delivery
        </span>
      );
    }
    if (['packed'].includes(status)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs font-semibold">
          <Package className="w-3.5 h-3.5" /> Cleaned &amp; Packed
        </span>
      );
    }
    if (['confirmed'].includes(status)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
        </span>
      );
    }
    if (['awaiting_whatsapp_confirmation', 'whatsapp_pending'].includes(status)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" /> Awaiting WhatsApp Confirmation
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-xs font-semibold">
        <Clock className="w-3.5 h-3.5" /> Order Received
      </span>
    );
  };

  const tabs = [
    { id: 'orders', icon: Package, label: 'Order History' },
    { id: 'profile', icon: User, label: 'Edit Profile' },
    { id: 'wishlist', icon: Heart, label: 'Wishlist' },
    { id: 'addresses', icon: MapPin, label: 'Saved Addresses' },
    { id: 'payment', icon: CreditCard, label: 'Payment Methods' },
    { id: 'reviews', icon: Star, label: 'My Reviews' },
    { id: 'qa', icon: HelpCircle, label: 'Questions & Answers' },
    { id: 'notifications', icon: Bell, label: 'Notification Settings' },
    { id: 'language', icon: Globe, label: 'Language' },
    { id: 'devices', icon: Shield, label: 'Manage Devices' },
    { id: 'privacy', icon: Shield, label: 'Privacy Center' },
  ];

  const cleanSupportWhatsapp = (settings.whatsappNumber || '919739391891').replace(/\D/g, '');

  return (
    <div className="fixed inset-0 z-50 bg-stone-100 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-full max-w-xs bg-white border-r border-stone-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold text-stone-900">Account Center</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>
        
        <div className="p-6 border-b border-stone-200 flex items-center gap-4">
          <div className="relative">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="w-14 h-14 rounded-full object-cover border border-stone-200" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-xl font-bold text-stone-700">
                {(user.name || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 w-6 h-6 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-sm hover:bg-stone-50">
              {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleProfileImageUpload} accept="image/*" className="hidden" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900 truncate w-32">{user.name || 'User'}</h3>
            <p className="text-xs text-stone-500 truncate w-32">{user.email}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <div className="px-3 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
              >
                <div className="flex items-center gap-3">
                  <tab.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </div>
                {activeTab === tab.id && <ChevronRight className="w-4 h-4 opacity-50" />}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-stone-200 space-y-2">
          {user.admin === true && (
            <button onClick={() => { window.location.hash = '#admin'; onClose(); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors font-semibold">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Admin Panel</span>
            </button>
          )}
          <button onClick={() => { document.dispatchEvent(new CustomEvent('open-contact')); onClose(); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors font-semibold">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium">Help &amp; Support</span>
          </button>
          <a
            href={OFFICIAL_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-3 py-2.5 text-pink-700 bg-pink-50/70 hover:bg-pink-100/80 border border-pink-200/70 rounded-lg transition-colors font-semibold"
          >
            <span className="flex items-center gap-2.5 text-xs">
              <InstagramIcon className="w-4 h-4 text-pink-600 shrink-0" />
              <span>Instagram Support</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </a>
          <button onClick={() => { logoutUser(); onClose(); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Log Out</span>
          </button>
          <button onClick={handleDeleteAccount} className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">Delete Account</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-stone-50 h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-stone-200 p-4 flex items-center gap-2 sm:gap-4">
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
             <X className="w-5 h-5 text-stone-600" />
          </button>
          
          <div className="flex-1 flex flex-wrap gap-2 mx-2 justify-center overflow-x-auto py-1">
            {tabs.map(t => (
              <button 
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => { document.dispatchEvent(new CustomEvent('open-contact')); onClose(); }} className="p-2 text-stone-600 hover:text-emerald-600 hover:bg-stone-100 rounded-full transition-colors">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button onClick={() => { logoutUser(); onClose(); }} className="p-2 text-stone-600 hover:bg-stone-100 rounded-full transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6 hidden md:flex">
              <div>
                <h1 className="text-2xl font-serif font-bold text-stone-900">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h1>
                {activeTab === 'orders' && (
                  <p className="text-xs text-stone-500 mt-0.5">
                    View past orders, download tax invoices, and track live preparation &amp; delivery status.
                  </p>
                )}
              </div>
              {activeTab === 'orders' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOrderLookup((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors shadow-2xs ${
                      showOrderLookup
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'text-stone-700 bg-white border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Track Order by ID
                  </button>
                  <button 
                    onClick={() => fetchOrders()}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Orders
                  </button>
                </div>
              )}
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Orders Tab */}
                {activeTab === 'orders' && (
                  <div className="space-y-6">
                    {/* Summary KPI Bar + Mobile Track Button */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Total Orders</span>
                        <span className="text-xl font-extrabold text-stone-900 mt-0.5 block">{orderSummaryMetrics.total}</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">In Progress</span>
                        <span className="text-xl font-extrabold text-emerald-700 mt-0.5 block">{orderSummaryMetrics.active}</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Delivered</span>
                        <span className="text-xl font-extrabold text-stone-900 mt-0.5 block">{orderSummaryMetrics.delivered}</span>
                      </div>
                    </div>

                    {/* Mobile Track Order by ID Toggle */}
                    <div className="flex md:hidden items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setShowOrderLookup((prev) => !prev)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                          showOrderLookup
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'text-stone-700 bg-white border-stone-200'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        {showOrderLookup ? 'Hide Order ID Tracker' : 'Track Any Order by ID'}
                      </button>
                      <button
                        type="button"
                        onClick={() => fetchOrders()}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-xl"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>

                    {/* Collapsible Track Order by ID Lookup Panel */}
                    {showOrderLookup && (
                      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                              <Truck className="w-4 h-4 text-emerald-600" />
                              Track Order Status by Order ID
                            </h3>
                            <p className="text-xs text-stone-500 mt-0.5">
                              Placed a Guest WhatsApp order or want to check a specific Order ID? Enter it below for live status.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowOrderLookup(false);
                              setTrackedLookupOrder(null);
                            }}
                            className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <form onSubmit={handleTrackByOrderId} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={lookupOrderId}
                            onChange={(e) => setLookupOrderId(e.target.value)}
                            placeholder="Order ID (e.g. JY-1761... or ORD-...)"
                            className="px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white font-mono"
                            required
                          />
                          <input
                            type="tel"
                            value={lookupPhone}
                            onChange={(e) => setLookupPhone(e.target.value)}
                            placeholder="Phone number (10 digits, for guest orders)"
                            className="px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white"
                          />
                          <button
                            type="submit"
                            disabled={lookupLoading}
                            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {lookupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            Track Status
                          </button>
                        </form>

                        {trackedLookupOrder && (
                          <div className="pt-3 border-t border-stone-100">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-stone-900">
                                  #{trackedLookupOrder.orderId || trackedLookupOrder.id}
                                </span>
                                {getStatusBadge(trackedLookupOrder.orderStatus || trackedLookupOrder.status)}
                              </div>
                              <span className="text-xs font-extrabold text-emerald-700">
                                Total: ₹{trackedLookupOrder.amount || 0}
                              </span>
                            </div>
                            <OrderTrackingTimeline order={trackedLookupOrder} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Filter and Search Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                      {/* Search */}
                      <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          placeholder="Search order ID or item name..."
                          className="w-full pl-9 pr-8 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all"
                        />
                        {orderSearch && (
                          <button onClick={() => setOrderSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Status Filter Chips */}
                      <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        {[
                          { id: 'all', label: `All (${orderSummaryMetrics.total})` },
                          { id: 'processing', label: `Processing (${orderSummaryMetrics.active})` },
                          { id: 'delivered', label: `Delivered (${orderSummaryMetrics.delivered})` },
                          { id: 'cancelled', label: 'Cancelled' }
                        ].map((chip) => (
                          <button
                            key={chip.id}
                            onClick={() => setOrderFilter(chip.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                              orderFilter === chip.id 
                                ? 'bg-stone-900 text-white shadow-xs' 
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Orders List */}
                    {loading ? (
                      <div className="bg-white rounded-2xl p-12 border border-stone-200 shadow-2xs text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
                        <p className="text-sm font-medium text-stone-600">Loading your order history from Firestore...</p>
                      </div>
                    ) : filteredOrders.length === 0 ? (
                      <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center shadow-2xs">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                          <ShoppingBag className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="text-base font-bold text-stone-900 mb-1">
                          {orderSearch || orderFilter !== 'all' ? 'No matching orders found' : 'No past orders yet'}
                        </h3>
                        <p className="text-xs text-stone-500 max-w-sm mx-auto mb-6">
                          {orderSearch || orderFilter !== 'all' 
                            ? 'Try clearing your search query or filter settings.' 
                            : 'When you place an order, its real-time status timeline and tax invoices will appear here.'}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {(orderSearch || orderFilter !== 'all') && (
                            <button 
                              onClick={() => { setOrderSearch(''); setOrderFilter('all'); }}
                              className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800 transition-colors"
                            >
                              Reset Filters
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowOrderLookup(true)}
                            className="px-4 py-2 bg-white border border-stone-200 text-stone-700 text-xs font-semibold rounded-xl hover:bg-stone-50 transition-colors"
                          >
                            Track Order by ID
                          </button>
                        </div>
                      </div>
                    ) : (
                      filteredOrders.map((order) => {
                        const isExpanded = expandedOrderId === order.id;
                        const dateStr = order.createdAt?.seconds 
                          ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })
                          : (order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            }) : 'Recent');

                        const computedItemsSubtotal = (order.items || []).reduce(
                          (sum: number, it: any) => sum + Number(it.price || it.numericPrice || 0) * Number(it.quantity || 1),
                          0
                        );
                        const subtotalVal = Number(order.subtotal ?? computedItemsSubtotal);
                        const discountVal = Number(order.discountAmount ?? 0);
                        const deliveryFeeVal = Number(order.deliveryFee ?? Math.max(0, Number(order.amount || 0) - subtotalVal + discountVal));

                        return (
                          <div key={order.id} className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden transition-all hover:border-stone-300">
                            {/* Card Header */}
                            <div className="p-5 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-50/50">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <h3 className="font-mono font-bold text-stone-900 text-sm">
                                    #{order.orderId || order.id}
                                  </h3>
                                  {getStatusBadge(order.orderStatus || order.status)}
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${String(order.paymentStatus || '').toLowerCase() === 'paid' ? 'bg-emerald-100 text-emerald-800' : String(order.paymentStatus || '').toLowerCase() === 'failed' ? 'bg-red-100 text-red-800' : 'bg-stone-100 text-stone-600'}`}>Payment: {String(order.paymentStatus || (order.paymentMethod === 'Cash on Delivery' ? 'COD' : 'Pending')).replace(/_/g, ' ')}</span>
                                  {(order.paymentMethod === 'WhatsApp Express' || order.channel === 'WHATSAPP') && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-bold uppercase tracking-wider">
                                      WhatsApp Order
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-stone-500 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                                  Placed on {dateStr}
                                </p>
                              </div>

                              <div className="flex items-center gap-3 justify-between md:justify-end">
                                <div className="text-right">
                                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Order Total</span>
                                  <span className="text-base font-extrabold text-emerald-700">₹{order.amount || 0}</span>
                                </div>
                                <button
                                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                                  className="px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-1 shadow-2xs"
                                >
                                  {isExpanded ? 'Hide Tracking' : 'Track & Details'}
                                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                              </div>
                            </div>

                            {/* Items Preview & Live Tracking */}
                            <div className="p-5 space-y-3">
                              {/* Always show live tracking timeline when expanded, or compact status bar when collapsed */}
                              {isExpanded && <OrderTrackingTimeline order={order} />}

                              <div className="space-y-2">
                                {(order.items || []).slice(0, isExpanded ? 50 : 2).map((item: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between gap-3 text-xs p-2 rounded-xl hover:bg-stone-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                      {item.image ? (
                                        <img 
                                          src={getOptimizedImageUrl(item.image, 100, 80)} 
                                          alt={item.name} 
                                          className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0" 
                                          referrerPolicy="no-referrer"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            if (target.dataset.failed) return;

                                            const rawFallbackSequence = [
                                              item.image,
                                              '',
                                              '/logo.jpg'
                                            ].filter(Boolean) as string[];

                                            const fallbackSequence = Array.from(new Set(rawFallbackSequence));
                                            const currentAttempt = parseInt(target.dataset.attempt || '0', 10);
                                            
                                            if (currentAttempt < fallbackSequence.length) {
                                              target.dataset.attempt = String(currentAttempt + 1);
                                              if (target.src.endsWith(fallbackSequence[currentAttempt]) || target.src === fallbackSequence[currentAttempt]) {
                                                  target.src = fallbackSequence[Math.min(currentAttempt + 1, fallbackSequence.length - 1)];
                                                  target.dataset.attempt = String(currentAttempt + 1);
                                              } else {
                                                  target.src = fallbackSequence[currentAttempt];
                                              }
                                            } else {
                                              target.dataset.failed = "true";
                                            }
                                          }} 
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
                                          <Package className="w-5 h-5 text-stone-400" />
                                        </div>
                                      )}
                                      <div>
                                        <h4 className="font-semibold text-stone-900">{item.name}</h4>
                                        <p className="text-stone-500 text-[11px]">
                                          Qty: {item.quantity} {item.selectedWeight ? `• ${item.selectedWeight}` : ''} {item.selectedCut ? `• ${item.selectedCut}` : ''}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="font-bold text-stone-900">
                                      ₹{(item.price || item.numericPrice || 0) * item.quantity}
                                    </div>
                                  </div>
                                ))}

                                {!isExpanded && (order.items || []).length > 2 && (
                                  <button 
                                    onClick={() => setExpandedOrderId(order.id)}
                                    className="text-xs text-emerald-700 font-semibold hover:underline pl-2 pt-1 block"
                                  >
                                    + {order.items.length - 2} more item(s)...
                                  </button>
                                )}
                              </div>

                              {/* Expanded Full Details */}
                              {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                  {/* Shipping Details */}
                                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1">
                                    <h4 className="font-bold text-stone-900 flex items-center gap-1.5 mb-1 text-xs">
                                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                      Delivery Address
                                    </h4>
                                    <p className="font-semibold text-stone-800">{order.shippingDetails?.name || order.customerName || user.name || 'Customer'}</p>
                                    <p className="text-stone-600">{order.shippingDetails?.address || 'N/A'}</p>
                                    {order.shippingDetails?.pincode && <p className="text-stone-600">Pincode: {order.shippingDetails.pincode}</p>}
                                    <p className="text-stone-600">Phone: {order.shippingDetails?.phone || order.customerPhone || 'N/A'}</p>
                                  </div>

                                  {/* Payment & Status */}
                                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1">
                                    <h4 className="font-bold text-stone-900 flex items-center gap-1.5 mb-1 text-xs">
                                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                      Payment Details
                                    </h4>
                                    <p className="text-stone-600">Method: <span className="font-semibold text-stone-800">{order.paymentMethod || 'Online'}</span></p>
                                    <p className="text-stone-600">Payment Status: <span className="font-semibold text-stone-800 uppercase">{String(order.paymentStatus || 'Paid').replace(/_/g, ' ')}</span></p>
                                    {(order.razorpay_payment_id || order.razorpayPaymentId) && (
                                      <p className="text-stone-500 text-[11px] font-mono">Ref ID: {order.razorpay_payment_id || order.razorpayPaymentId}</p>
                                    )}
                                  </div>

                                  {/* Bill Summary */}
                                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1">
                                    <h4 className="font-bold text-stone-900 flex items-center gap-1.5 mb-1 text-xs">
                                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                                      Bill Summary
                                    </h4>
                                    <div className="flex justify-between text-stone-600">
                                      <span>Items Subtotal</span>
                                      <span className="font-semibold text-stone-800">₹{subtotalVal}</span>
                                    </div>
                                    {discountVal > 0 && (
                                      <div className="flex justify-between text-emerald-700">
                                        <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                                        <span className="font-semibold">-₹{discountVal}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between text-stone-600">
                                      <span>Delivery Fee</span>
                                      <span className="font-semibold text-stone-800">{deliveryFeeVal > 0 ? `₹${deliveryFeeVal}` : 'FREE'}</span>
                                    </div>
                                    <div className="flex justify-between text-stone-900 font-bold pt-1 border-t border-stone-200">
                                      <span>Grand Total</span>
                                      <span className="text-emerald-700">₹{order.amount || 0}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {isExpanded && (
                                <div className="mt-4 border-t border-stone-100 pt-3">
                                  <button type="button" onClick={() => setExpandedAdvancedOrderId(expandedAdvancedOrderId === order.id ? null : order.id)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700">
                                    <span>Advanced details</span>
                                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedAdvancedOrderId === order.id ? 'rotate-90' : ''}`} />
                                  </button>
                                  {expandedAdvancedOrderId === order.id && (
                                    <div className="mt-2 rounded-xl bg-stone-50 border border-stone-200 p-3 text-[11px] text-stone-600 space-y-1.5">
                                      <p><strong>Payment reference:</strong> {order.razorpay_payment_id || order.razorpayPaymentId || 'Not available'}</p>
                                      <p><strong>Payment status:</strong> {String(order.paymentStatus || 'unknown').replace(/_/g, ' ')}</p>
                                      <p><strong>Refund status:</strong> {order.refundStatus || 'Not requested'}</p>
                                      {Array.isArray(order.statusHistory) && order.statusHistory.length > 0 && <p><strong>Status updates:</strong> {order.statusHistory.length}</p>}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Footer Action Bar */}
                              <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => handleReorder(order)}
                                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Reorder All
                                  </button>
                                  <button
                                    onClick={() => handlePrintInvoice(order)}
                                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-stone-500" />
                                    Invoice
                                  </button>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <a
                                    href={`https://wa.me/${cleanSupportWhatsapp}?text=${encodeURIComponent(`Hi JIYOO Support, I need help with my Order #${order.orderId || order.id}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                                    WhatsApp Help
                                  </a>
                                  <a
                                    href={OFFICIAL_INSTAGRAM_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                    title="Instagram Customer Support"
                                  >
                                    <InstagramIcon className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                                    Instagram Support
                                  </a>

                                  {['pending', 'confirmed', 'received', 'awaiting_whatsapp_confirmation', 'whatsapp_pending'].includes(
                                    String(order.status || order.orderStatus || 'pending').toLowerCase()
                                  ) && (
                                    <button
                                      onClick={() => cancelOrder(order.id)}
                                      className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                                    >
                                      Cancel Order
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
                    <div className="space-y-6 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
                        <input id="profile-name" type="text" defaultValue={user.name || ''} className="w-full border-stone-200 rounded-lg bg-stone-50 px-4 py-2.5 outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
                        <input type="email" defaultValue={user.email || ''} disabled className="w-full border-stone-200 rounded-lg bg-stone-100 text-stone-500 px-4 py-2.5 outline-none cursor-not-allowed" />
                        <p className="text-xs text-stone-500 mt-1">Email cannot be changed.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Phone Number</label>
                        <input id="profile-phone" type="tel" defaultValue={(user as any).phone || ''} placeholder="+91 98765 43210" className="w-full border-stone-200 rounded-lg bg-stone-50 px-4 py-2.5 outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all" />
                      </div>
<button onClick={async () => {
                        const name = (document.getElementById('profile-name') as HTMLInputElement).value;
                        const phone = (document.getElementById('profile-phone') as HTMLInputElement).value;
                        try {
                          await updateDoc(doc(db, 'users', user.id), { name, phone });
                          showToast('Profile updated successfully!', 'success');
                        } catch (e) {
                          showToast('Failed to update profile', 'error');
                        }
                      }} className="bg-stone-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-stone-800 transition-colors w-full sm:w-auto">
                        Save Changes
                      </button>

                      <div className="pt-6 mt-6 border-t border-stone-100 flex flex-col gap-3">
                        <button onClick={() => { logoutUser(); onClose(); }} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors font-medium">
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Addresses Tab */}
                {activeTab === 'addresses' && (
                   <div className="space-y-4">
                     <div className="flex flex-col sm:flex-row gap-3 mb-4">
                       <button onClick={() => { setEditingAddress(null); setShowAddressForm(true); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors">
                         <Plus className="w-4 h-4" /> Add New Address
                       </button>
                       <button onClick={() => { setEditingAddress(null); setShowAddressForm(true); setIsMapModalOpen(true); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-medium hover:bg-emerald-100 transition-colors">
                         <MapPin className="w-4 h-4" /> Pick on Google Map
                       </button>
                     </div>
                     
                     {showAddressForm && (
                        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm mb-4">
                           <h3 className="font-semibold text-stone-900 mb-4">{editingAddress ? 'Edit Address' : 'Add New Address'}</h3>
                           <div className="space-y-4">
                             <input id="addr-name" defaultValue={editingAddress?.name || ''} placeholder="Full Name" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-base" />
                             <input id="addr-phone" defaultValue={editingAddress?.phone || ''} placeholder="Phone Number" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-base" />
                             <textarea id="addr-text" defaultValue={editingAddress?.address || ''} placeholder="Full Address" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-base" rows={3}></textarea>
                             <input id="addr-pin" defaultValue={editingAddress?.pincode || ''} placeholder="Pincode" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-base" />
                             <div className="flex gap-2 justify-end">
                               <button onClick={() => { setShowAddressForm(false); setEditingAddress(null); }} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">Cancel</button>
                               <button onClick={async () => {
                                 const name = (document.getElementById('addr-name') as HTMLInputElement).value;
                                 const phone = (document.getElementById('addr-phone') as HTMLInputElement).value;
                                 const address = (document.getElementById('addr-text') as HTMLTextAreaElement).value;
                                 const pincode = (document.getElementById('addr-pin') as HTMLInputElement).value;
                                 if (!name || !address) return;
                                 
                                 setLoading(true);
                                 try {
                                   if (editingAddress) {
                                     await updateDoc(doc(db, "users", user.id, "addresses", editingAddress.id), {
                                       name, phone, address, pincode
                                     });
                                   } else {
                                     await addDoc(collection(db, "users", user.id, "addresses"), {
                                       name, phone, address, pincode, createdAt: serverTimestamp()
                                     });
                                   }
                                   setShowAddressForm(false);
                                   setEditingAddress(null);
                                   setActiveTab('profile');
                                   setTimeout(() => setActiveTab('addresses'), 100);
                                 } catch (e) {
                                   showToast('Failed to save address', 'error');
                                 } finally {
                                   setLoading(false);
                                 }
                               }} className="px-4 py-2 text-sm bg-stone-900 text-white rounded-lg hover:bg-stone-800">{editingAddress ? 'Update Address' : 'Save Address'}</button>
                             </div>
                           </div>
                        </div>
                     )}

                     {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-stone-400" /> : 
                      addresses.length === 0 ? <p className="text-stone-500 text-center py-12">No saved addresses.</p> :
                      addresses.map(addr => (
                        <div key={addr.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm relative">
                           <h3 className="font-semibold text-stone-900 mb-1">{addr.name}</h3>
                           <p className="text-sm text-stone-600">{addr.address}</p>
                           <p className="text-sm text-stone-600">{addr.pincode}</p>
                           <p className="text-sm text-stone-600 mt-2">Phone: {addr.phone}</p>
                           <div className="absolute top-5 right-5 flex gap-2">
                             <button onClick={() => { setEditingAddress(addr); setShowAddressForm(true); }} className="p-2 text-stone-400 hover:text-stone-900 transition-colors"><Edit3 className="w-4 h-4" /></button>
                             <button onClick={async () => {
                               if (!(await confirm({ title: "Delete address?", message: "Delete this address?" }))) return;
                               setLoading(true);
                               try {
                                 await deleteDoc(doc(db, "users", user.id, "addresses", addr.id));
                                 setAddresses(prev => prev.filter(a => a.id !== addr.id));
                               } catch (e) {
                                 console.error(e);
                                 showToast('Failed to delete address', 'error');
                               } finally {
                                 setLoading(false);
                               }
                             }} className="p-2 text-stone-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                           </div>
                        </div>
                      ))
                     }
                   </div>
                )}

                {/* Wishlist Tab */}
                {activeTab === 'wishlist' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <div>
                        <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                          My Wishlist
                        </h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {wishlist?.length || 0} saved item{(wishlist?.length || 0) === 1 ? '' : 's'} ready for your cart
                        </p>
                      </div>
                      {wishlistedProducts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            wishlistedProducts.forEach(p => {
                              addToCart({
                                id: String(p.id),
                                baseId: p.id,
                                name: p.name,
                                price: typeof p.price === 'number' ? `₹${p.price}` : String(p.price),
                                numericPrice: typeof p.price === 'number' ? p.price : parseFloat(String(p.price).replace(/[^0-9.]/g, '')),
                                image: p.image,
                                badge: p.unit
                              }, 1);
                            });
                            showToast(`Added all ${wishlistedProducts.length} items to cart!`, 'success');
                          }}
                          className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                          Add All to Cart
                        </button>
                      )}
                    </div>

                    {wishlistedProducts.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {wishlistedProducts.map((p) => {
                          const displayPrice = typeof p.price === 'number' ? `₹${p.price}` : String(p.price).startsWith('₹') ? p.price : `₹${p.price}`;
                          const isOutOfStock = p.stock === 0 || p.stockStatus === 'out_of_stock';
                          return (
                            <div
                              key={p.id}
                              className="bg-white rounded-xl p-3.5 border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between gap-3 group relative"
                            >
                              <div className="flex gap-3">
                                <div className="w-20 h-20 shrink-0 bg-stone-50 rounded-lg overflow-hidden border border-stone-100 p-1 flex items-center justify-center">
                                  <img
                                    src={getOptimizedImageUrl(p.image, 200, 80)}
                                    alt={p.name}
                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                    loading="lazy"
                                  />
                                </div>
                                <div className="flex-1 min-w-0 pr-6">
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
                                    {p.category || p.categoryId || 'Produce'}
                                  </span>
                                  <h4 className="font-semibold text-stone-900 text-sm leading-snug truncate mt-0.5">
                                    {p.name}
                                  </h4>
                                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                                    {p.unit || 'Standard'}
                                  </p>
                                  <div className="mt-1.5 flex items-baseline gap-2">
                                    <span className="font-bold text-stone-900 text-sm">
                                      {displayPrice}
                                    </span>
                                    {p.originalPrice && (
                                      <span className="text-xs text-stone-400 line-through">
                                        {String(p.originalPrice).startsWith('₹') ? p.originalPrice : `₹${p.originalPrice}`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Remove Wishlist Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  toggleWishlist(String(p.id));
                                  showToast(`Removed from wishlist`, 'info');
                                }}
                                className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center bg-stone-50 hover:bg-red-50 text-stone-400 hover:text-red-500 border border-stone-200 transition-colors cursor-pointer"
                                title="Remove from wishlist"
                                aria-label="Remove from wishlist"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isOutOfStock}
                                  onClick={() => {
                                    addToCart({
                                      id: String(p.id),
                                      baseId: p.id,
                                      name: p.name,
                                      price: displayPrice,
                                      numericPrice: typeof p.price === 'number' ? p.price : parseFloat(String(p.price).replace(/[^0-9.]/g, '')),
                                      image: p.image,
                                      badge: p.unit
                                    }, 1);
                                    showToast(`Added ${p.name} to cart!`, 'success');
                                  }}
                                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                    isOutOfStock
                                      ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                      : 'bg-stone-900 hover:bg-stone-800 text-white shadow-2xs'
                                  }`}
                                >
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                  {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 shadow-sm">
                        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
                          <Heart className="w-8 h-8" strokeWidth={1.5} />
                        </div>
                        <h4 className="text-sm font-bold text-stone-900 mb-1">Your wishlist is empty</h4>
                        <p className="text-xs text-stone-500 max-w-xs mx-auto mb-5">
                          Tap the heart icon on any product in our store to save your favorite fruits, veggies, and cuts for later.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            const el = document.getElementById('products');
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          Explore Catalog
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Methods Tab */}
                {activeTab === 'payment' && (
                   <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
                     <div className="flex items-center gap-3 mb-6">
                       <PremiumShieldMark className="w-5 h-5 shrink-0" variant="emerald" />
                       <p className="text-sm text-stone-600 font-medium">Secured by Razorpay Tokenization. We do not store card details.</p>
                     </div>
                     <button className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-lg font-medium hover:bg-stone-50 transition-colors">
                       <Plus className="w-4 h-4" /> Add Payment Method
                     </button>
                     <div className="mt-8 text-center py-12 border-2 border-dashed border-stone-200 rounded-xl">
                       <CreditCard className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                       <p className="text-stone-500 text-sm">No saved cards found.</p>
                     </div>
                   </div>
                )}

                {/* Notification Settings Tab */}
                {activeTab === 'notifications' && (
                   <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm max-w-lg space-y-6">
                     <div className="flex items-center justify-between">
                       <div>
                         <h3 className="font-medium text-stone-900">Order Updates</h3>
                         <p className="text-sm text-stone-500">Get SMS and Email updates on order status.</p>
                       </div>
                       <div className="w-10 h-6 bg-green-500 rounded-full relative cursor-pointer shadow-inner">
                         <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow"></div>
                       </div>
                     </div>
                     <div className="flex items-center justify-between">
                       <div>
                         <h3 className="font-medium text-stone-900">Promotions & Offers</h3>
                         <p className="text-sm text-stone-500">Receive exclusive deals and discounts.</p>
                       </div>
                       <div className="w-10 h-6 bg-stone-200 rounded-full relative cursor-pointer shadow-inner">
                         <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow"></div>
                       </div>
                     </div>
                     <div className="flex items-center justify-between">
                       <div>
                         <h3 className="font-medium text-stone-900">Push Notifications</h3>
                         <p className="text-sm text-stone-500">FCM push notifications on your device.</p>
                       </div>
                       <div className="w-10 h-6 bg-stone-200 rounded-full relative cursor-pointer shadow-inner">
                         <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow"></div>
                       </div>
                     </div>
                   </div>
                )}

                {/* My Reviews Tab */}
                {activeTab === 'reviews' && (
                  <div className="space-y-4">
                     {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-stone-400" /> : 
                      reviews.length === 0 ? <p className="text-stone-500 text-center py-12">No reviews found.</p> :
                      reviews.map(review => (
                        <div key={review.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col">
                           <div className="flex items-center justify-between mb-2">
                             <h3 className="font-semibold text-stone-900">{review.productName || 'Product'}</h3>
                             <div className="flex gap-1">
                               {[1,2,3,4,5].map(star => (
                                 <Star key={star} className={`w-4 h-4 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-stone-200'}`} />
                               ))}
                             </div>
                           </div>
                           <p className="text-sm text-stone-600 mb-2">{review.comment}</p>
                           <p className="text-xs text-stone-400">{new Date(review.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                        </div>
                      ))
                     }
                  </div>
                )}

                {/* Catch-all for other tabs */}
                {['qa', 'language', 'devices', 'privacy'].includes(activeTab) && (
                  <div className="bg-white rounded-2xl p-12 border border-stone-200 shadow-sm text-center">
                    <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      {activeTab === 'privacy' && <Shield className="w-8 h-8 text-stone-400" />}
                      {activeTab === 'language' && <Globe className="w-8 h-8 text-stone-400" />}
                      {activeTab === 'devices' && <User className="w-8 h-8 text-stone-400" />}
                      {activeTab === 'qa' && <HelpCircle className="w-8 h-8 text-stone-400" />}
                    </div>
                    <h3 className="text-lg font-medium text-stone-900 mb-2">Section Under Construction</h3>
                    <p className="text-stone-500 text-sm max-w-sm mx-auto">This feature is being rolled out globally and will be available for your account soon.</p>
                  </div>
                )}
                
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <LocationPickerModal
        isOpen={isMapModalOpen}
        initialTab="map"
        onClose={() => setIsMapModalOpen(false)}
        onSelectLocation={({ address: newAddr, pincode: newPin }) => {
          const addrText = document.getElementById('addr-text') as HTMLTextAreaElement;
          const addrPin = document.getElementById('addr-pin') as HTMLInputElement;
          if (addrText) addrText.value = newAddr;
          if (addrPin) addrPin.value = newPin;
        }}
      />
    </div>
  );
}
