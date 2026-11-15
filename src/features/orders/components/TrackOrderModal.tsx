import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Truck,
  Search,
  CheckCircle2,
  Package,
  MapPin,
  Clock,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../../../services/firebase';
import { useCart } from '../../../contexts/CartContext';
import { useSettings } from '../../../contexts/SettingsContext';
import { useModalBackButton } from '../../core/hooks/useModalBackButton';
import { PriceDisplay } from '../../core/components/PriceDisplay';
import { RealisticDeliveryScooter } from '../../core/components/RealisticDeliveryScooter';
import { getStoredCustomerSession } from '../../../utils/customerAuthFallback';
import { fetchJsonWithProxyRetry } from '../../../utils/apiFetch';
import { getOptimizedImageUrl } from '../../../utils/imageUtils';
import { sanitizeWhatsAppNumber } from '../../../utils/whatsapp';
import {
  normalizeOrderIdInput,
  normalizePhoneLast10,
  isValidTrackingPhone,
  getOrderTrackingPipeline,
  formatOrderStatusLabel,
  formatTrackingDateTime,
  saveRecentOrderBookmark,
  readRecentOrderBookmarks,
  RecentOrderBookmark,
  sanitizeTrackingHref,
} from '../../../utils/orderTracking';

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
  initialPhone?: string;
}

export function TrackOrderModal({
  isOpen,
  onClose,
  initialOrderId = '',
  initialPhone = '',
}: TrackOrderModalProps) {
  const { user } = useCart();
  const { settings } = useSettings();
  useModalBackButton(isOpen, onClose);

  const [orderIdInput, setOrderIdInput] = useState(initialOrderId);
  const [phoneInput, setPhoneInput] = useState(initialPhone);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<any | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrderBookmark[]>([]);
  const [liveSyncActive, setLiveSyncActive] = useState(false);

  const lookupOrder = useCallback(
    async (targetOrderIdRaw: string, targetPhoneRaw: string) => {
      const cleanId = normalizeOrderIdInput(targetOrderIdRaw);
      if (!cleanId) {
        setErrorMsg('Please enter your Order ID (for example, JY-482910).');
        return;
      }

      const effectivePhone = targetPhoneRaw.trim() || String((user as any)?.phone || '').trim();
      if (!user && !isValidTrackingPhone(effectivePhone)) {
        setErrorMsg('Please enter the 10-digit mobile number used at checkout.');
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);
      try {
        const fbToken = await auth.currentUser?.getIdToken().catch(() => null);
        const token = fbToken || getStoredCustomerSession()?.token || null;

        const { res, data } = await fetchJsonWithProxyRetry('/api/orders/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            orderId: cleanId,
            phone: effectivePhone || undefined,
          }),
        });

        if (!res.ok || !data?.success || !data?.order) {
          setTrackedOrder(null);
          setErrorMsg(
            data?.error ||
              'Order not found or phone number did not match. Please double-check your Order ID and 10-digit phone number.'
          );
          return;
        }

        setTrackedOrder(data.order);
        saveRecentOrderBookmark(data.order.orderId || data.order.id || cleanId);
        setRecentOrders(readRecentOrderBookmarks());
      } catch {
        setErrorMsg('Unable to connect to the tracking service right now. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  // Sync modal open state, bookmarks, and optional pre-filled lookup
  useEffect(() => {
    if (!isOpen) return;
    setRecentOrders(readRecentOrderBookmarks());

    const nextId = normalizeOrderIdInput(initialOrderId);
    const nextPhone = initialPhone.trim() || String((user as any)?.phone || '').trim();

    if (nextId) {
      setOrderIdInput(nextId);
    }
    if (nextPhone && !phoneInput) {
      setPhoneInput(nextPhone);
    }

    if (nextId && (isValidTrackingPhone(nextPhone) || user)) {
      void lookupOrder(nextId, nextPhone);
    }
  }, [isOpen, initialOrderId, initialPhone, user]);

  // Real-time Firestore listener when signed-in customer owns the order
  useEffect(() => {
    if (
      !isOpen ||
      !isFirebaseConfigured ||
      !trackedOrder?.id ||
      !auth.currentUser?.uid ||
      trackedOrder?.userId !== auth.currentUser.uid
    ) {
      setLiveSyncActive(false);
      return;
    }

    const orderRef = doc(db, 'orders', String(trackedOrder.id));
    setLiveSyncActive(true);
    const unsub = onSnapshot(
      orderRef,
      (snap) => {
        if (snap.exists()) {
          setTrackedOrder((prev: any) => ({
            ...(prev || {}),
            id: snap.id,
            ...snap.data(),
          }));
        }
      },
      () => {
        setLiveSyncActive(false);
      }
    );

    return () => {
      setLiveSyncActive(false);
      unsub();
    };
  }, [isOpen, trackedOrder?.id, trackedOrder?.userId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void lookupOrder(orderIdInput, phoneInput);
  };

  const pipeline = trackedOrder
    ? getOrderTrackingPipeline(trackedOrder.orderStatus || trackedOrder.status)
    : null;

  const statusBadgeClasses = (() => {
    if (!pipeline) return 'bg-stone-100 text-stone-700 border-stone-200';
    if (pipeline.normalizedStatus === 'delivered') {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (pipeline.isTerminalNegative) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (pipeline.isWhatsAppPending) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  })();

  const whatsappHelpUrl = trackedOrder
    ? `https://wa.me/${sanitizeWhatsAppNumber(settings.whatsappNumber)}?text=${encodeURIComponent(
        `Hi ${settings.storeName || 'JIYOO'}, I would like an update on my order #${
          trackedOrder.orderId || trackedOrder.id
        } (Phone ending ${normalizePhoneLast10(phoneInput).slice(-4) || 'on file'}).`
      )}`
    : '#';

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="track-order-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-black/60 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl bg-[#FAF9F5] rounded-2xl border border-[#E7E3DA] shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] z-10"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-white border-b border-[#E7E3DA] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="track-order-modal-title"
                    className="text-lg font-serif font-bold text-[#1C1917] truncate"
                  >
                    Track My Order
                  </h2>
                  <p className="text-xs text-[#57534E] truncate">
                    Real-time order status powered free by Firestore
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Track My Order"
                className="p-2 rounded-full hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Lookup Form */}
              <form
                onSubmit={handleSubmit}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E3DA] shadow-2xs space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="track-order-id-input"
                      className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5"
                    >
                      Order ID *
                    </label>
                    <input
                      id="track-order-id-input"
                      type="text"
                      value={orderIdInput}
                      onChange={(e) => setOrderIdInput(e.target.value)}
                      placeholder="e.g. JY-482910"
                      autoComplete="off"
                      required
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#FAF9F5] border border-[#E7E3DA] rounded-xl text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:border-[#1C1917] focus:ring-2 focus:ring-[#1C1917]/10"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="track-order-phone-input"
                      className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5"
                    >
                      Mobile Number {user ? '(Optional if signed in)' : '*'}
                    </label>
                    <input
                      id="track-order-phone-input"
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="10-digit checkout number"
                      autoComplete="tel"
                      required={!user}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F5] border border-[#E7E3DA] rounded-xl text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:border-[#1C1917] focus:ring-2 focus:ring-[#1C1917]/10"
                    />
                  </div>
                </div>

                {/* Recent device bookmarks */}
                {recentOrders.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] text-stone-500 font-medium mr-1">
                      Recent on this device:
                    </span>
                    {recentOrders.map((item) => (
                      <button
                        key={item.orderId}
                        type="button"
                        onClick={() => {
                          setOrderIdInput(item.orderId);
                          if (isValidTrackingPhone(phoneInput) || user) {
                            void lookupOrder(item.orderId, phoneInput);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#FAF9F5] hover:bg-[#EAE5D9] border border-[#E7E3DA] text-[11px] font-mono font-semibold text-[#1C1917] transition-colors cursor-pointer"
                      >
                        #{item.orderId}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Verified via Order ID &amp; 10-digit checkout mobile number</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-black text-[#FAF9F5] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Checking Status...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Track Order
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Error State */}
              {errorMsg && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-800"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Unable to verify order details</p>
                    <p className="text-red-700 leading-relaxed">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Result Panel */}
              {trackedOrder && pipeline && (
                <div className="bg-white rounded-2xl border border-[#E7E3DA] shadow-2xs overflow-hidden">
                  {/* Order Top Summary */}
                  <div className="p-4 sm:p-5 bg-stone-50/70 border-b border-[#E7E3DA] flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-base text-[#1C1917]">
                          #{trackedOrder.orderId || trackedOrder.id}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${statusBadgeClasses}`}
                        >
                          {formatOrderStatusLabel(trackedOrder.orderStatus || trackedOrder.status)}
                        </span>
                        {trackedOrder.orderType === 'wholesale' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                            Wholesale
                          </span>
                        )}
                        {liveSyncActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Live Sync
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>Placed {formatTrackingDateTime(trackedOrder.createdAt)}</span>
                        {trackedOrder.updatedAt && (
                          <span className="text-stone-400">
                            · Updated {formatTrackingDateTime(trackedOrder.updatedAt)}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                          Order Total
                        </span>
                        <PriceDisplay
                          amount={Number(trackedOrder.grandTotal ?? trackedOrder.amount ?? 0)}
                          size="base"
                          weight="extrabold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void lookupOrder(orderIdInput, phoneInput)}
                        disabled={isLoading}
                        aria-label="Refresh order status"
                        title="Refresh Status"
                        className="p-2 rounded-xl bg-white border border-[#E7E3DA] hover:bg-stone-50 text-stone-700 transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-5">
                    {/* Cancelled / Refunded Notice OR 6-Stage Timeline */}
                    {pipeline.isTerminalNegative ? (
                      <div className="p-4 bg-red-50/90 border border-red-200 rounded-xl space-y-1.5">
                        <p className="text-sm font-bold text-red-900">
                          {pipeline.normalizedStatus === 'refunded'
                            ? 'Order Cancelled & Refunded'
                            : 'Order Cancelled'}
                        </p>
                        <p className="text-xs text-red-700 leading-relaxed">
                          {trackedOrder.cancelReason
                            ? `Reason: ${trackedOrder.cancelReason}`
                            : 'This order was cancelled and will not be dispatched. Any eligible prepaid refund is processed automatically.'}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          <h3 className="text-xs sm:text-sm font-bold text-[#1C1917] flex items-center gap-2">
                            <RealisticDeliveryScooter className="w-7 h-6 shrink-0" />
                            Live Delivery Progress
                          </h3>
                          <span className="text-[11px] font-mono font-semibold text-emerald-800 tabular-nums">
                            Stage {pipeline.currentIndex + 1} of {pipeline.steps.length} ·{' '}
                            {pipeline.progressPercent}%
                          </span>
                        </div>

                        <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden mb-4">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                            style={{ width: `${pipeline.progressPercent}%` }}
                          />
                        </div>

                        {(trackedOrder.trackingCarrier ||
                          trackedOrder.trackingNumber ||
                          trackedOrder.trackingUrl) && (
                          <div className="mb-4 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="space-y-0.5">
                              {trackedOrder.trackingCarrier && (
                                <p className="text-stone-700">
                                  Delivery Partner:{' '}
                                  <span className="font-semibold text-stone-900">
                                    {trackedOrder.trackingCarrier}
                                  </span>
                                </p>
                              )}
                              {trackedOrder.trackingNumber && (
                                <p className="text-stone-700 font-mono">
                                  Tracking / AWB #:{' '}
                                  <span className="font-semibold text-stone-900">
                                    {trackedOrder.trackingNumber}
                                  </span>
                                </p>
                              )}
                            </div>
                            {(() => {
                              const safeTrackingUrl = sanitizeTrackingHref(trackedOrder.trackingUrl);
                              return safeTrackingUrl ? (
                                <a
                                  href={safeTrackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition-colors"
                                >
                                  <span>Live Courier Link</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              ) : null;
                            })()}
                          </div>
                        )}

                        <div className="relative pl-1">
                          <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-stone-200" />
                          <div className="space-y-3.5 relative">
                            {pipeline.steps.map((step, idx) => {
                              const isCompleted = idx <= pipeline.currentIndex;
                              const isCurrent = idx === pipeline.currentIndex;
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
                                      <span className="text-[10px] font-mono font-bold tabular-nums">
                                        {idx + 1}
                                      </span>
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
                                        className={`text-[10px] font-medium shrink-0 ${
                                          isCurrent
                                            ? 'text-emerald-700 font-semibold'
                                            : isCompleted
                                            ? 'text-stone-500'
                                            : 'text-stone-400'
                                        }`}
                                      >
                                        {isCurrent
                                          ? 'Current Stage'
                                          : isCompleted
                                          ? 'Completed'
                                          : 'Upcoming'}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                                      {step.desc}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delivery & Payment Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100">
                      <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E7E3DA] space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                          <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                          Delivery Destination
                        </div>
                        <p className="text-xs font-semibold text-[#1C1917]">
                          {trackedOrder.shippingDetails?.name || 'Customer'}
                        </p>
                        <p className="text-xs text-stone-600">
                          {trackedOrder.shippingDetails?.address || 'On file'}
                          {trackedOrder.shippingDetails?.pincode
                            ? ` · PIN ${trackedOrder.shippingDetails.pincode}`
                            : ''}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E7E3DA] space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                          <Package className="w-3.5 h-3.5 text-[#8F6B38]" />
                          Payment &amp; Fulfillment
                        </div>
                        <p className="text-xs font-semibold text-[#1C1917]">
                          {trackedOrder.paymentMethod || 'Standard Checkout'}
                        </p>
                        <p className="text-xs text-stone-600 capitalize">
                          Payment Status:{' '}
                          <span className="font-semibold text-[#1C1917]">
                            {String(trackedOrder.paymentStatus || 'unpaid').replace(/_/g, ' ')}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Items Summary */}
                    {Array.isArray(trackedOrder.items) && trackedOrder.items.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-stone-100">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                          Items in This Order ({trackedOrder.items.length})
                        </h4>
                        <div className="divide-y divide-stone-100 rounded-xl border border-[#E7E3DA] bg-[#FAF9F5]/60">
                          {trackedOrder.items.map((item: any, idx: number) => (
                            <div
                              key={`${item.id || idx}-${idx}`}
                              className="p-2.5 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {item.image && (
                                  <img
                                    src={getOptimizedImageUrl(item.image, 96, 80)}
                                    alt={item.name}
                                    className="w-9 h-9 rounded-lg object-contain bg-white border border-stone-200 p-0.5 shrink-0"
                                  />
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-[#1C1917] truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-[11px] text-stone-500 truncate">
                                    {item.selectedWeight || item.unit || 'Standard'}
                                    {item.selectedCut ? ` · ${item.selectedCut}` : ''}
                                    {' × '}
                                    {item.quantity || 1}
                                  </p>
                                </div>
                              </div>
                              <span className="font-bold text-[#1C1917] tabular-nums shrink-0">
                                ₹
                                {(
                                  Number(item.price || item.numericPrice || 0) *
                                  Number(item.quantity || 1)
                                ).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Support Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
                      <span className="text-[11px] text-stone-500">
                        Need to update delivery instructions or timing?
                      </span>
                      <a
                        href={whatsappHelpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Message Support on WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
