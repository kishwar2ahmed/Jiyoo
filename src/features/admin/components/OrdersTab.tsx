import { useState, useEffect, useCallback } from 'react';
import { Order, OrderAuditLogEntry, OrderAuditIntegrityReport } from '../../../types';
import { Search, Eye, X, AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, ShieldCheck, ShieldAlert, Lock, Truck, Save, History, Mail, Send } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../core/contexts/ToastContext';
import { fetchOrderAuditLogs } from '../../../services/auditService';
import { getAdminAuthHeaders } from '../../../utils/adminAuth';

function getOrderDate(createdAt: any): Date | null {
  if (!createdAt) return null;
  if (typeof createdAt === 'string' || typeof createdAt === 'number') {
    const d = new Date(createdAt);
    return isNaN(d.getTime()) ? null : d;
  }
  if (createdAt?.toDate) {
    const d = createdAt.toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof createdAt.seconds === 'number') return new Date(createdAt.seconds * 1000);
  return null;
}

const STATUS_FILTERS = [
  { key: 'all', label: 'All Orders' },
  { key: 'ordered', label: 'Ordered' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'packed', label: 'Packed' },
  { key: 'dispatched', label: 'Dispatched / Shipped' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

type StatusFilter = typeof STATUS_FILTERS[number]['key'];

const statusLabel = (status: string) => ({
  AWAITING_WHATSAPP_CONFIRMATION: 'Awaiting WhatsApp',
  awaiting_whatsapp_confirmation: 'Awaiting WhatsApp',
  RECEIVED: 'Received',
  received: 'Received',
  pending: 'Ordered', whatsapp_pending: 'Awaiting WhatsApp', paid_upi_pending_verify: 'Ordered',
  confirmed: 'Confirmed', processing: 'Processing', packed: 'Packed',
  dispatched: 'Dispatched / Shipped', shipped: 'Dispatched / Shipped',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', completed: 'Delivered',
  cancelled: 'Cancelled',
}[status] || status.replace(/_/g, ' '));

export function OrdersTab() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);

  // Server-side per-order audit trail & integrity verification state
  const [orderAuditLogs, setOrderAuditLogs] = useState<OrderAuditLogEntry[]>([]);
  const [orderIntegrity, setOrderIntegrity] = useState<OrderAuditIntegrityReport | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Audit-logged tracking & admin notes state
  const [trackingCarrier, setTrackingCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [savingTracking, setSavingTracking] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleResendStatusEmail = async (orderId: string) => {
    try {
      setSendingEmail(true);
      const headers = await getAdminAuthHeaders(true);
      const res = await fetch(`/api/admin/orders/${orderId}/send-status-email`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        if (data.isMock) {
          showToast(`SMTP not configured: Email preview logged for ${data.recipient || 'customer'}`, 'info');
        } else {
          showToast(data.error || data.reason || 'Failed to dispatch status email', 'error');
        }
        return;
      }
      showToast(`Status notification email dispatched to ${data.recipient}!`, 'success');
      await loadOrders(cursorHistory[page - 1] || null, true);
      await loadOrderAuditTrail(orderId);
    } catch (err) {
      console.error('Error resending status email:', err);
      showToast('Failed to send status email', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const loadOrderAuditTrail = useCallback(async (orderId: string) => {
    setLoadingAudit(true);
    try {
      const result = await fetchOrderAuditLogs(orderId, true);
      setOrderAuditLogs(result.logs);
      setOrderIntegrity(result.integrity);
    } catch (err) {
      console.warn('Failed to load order audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      setTrackingCarrier(selectedOrder.trackingCarrier || '');
      setTrackingNumber(selectedOrder.trackingNumber || '');
      setTrackingUrl(selectedOrder.trackingUrl || '');
      setAdminNotes(selectedOrder.adminNotes || '');
      loadOrderAuditTrail(selectedOrder.id);
    } else {
      setOrderAuditLogs([]);
      setOrderIntegrity(null);
    }
  }, [selectedOrder, loadOrderAuditTrail]);

  const loadOrders = useCallback(async (cursor: string | null, silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const headers = await getAdminAuthHeaders();
      const params = new URLSearchParams({ status: statusFilter, pageSize: '50' });
      if (searchTerm.trim()) params.set('q', searchTerm.trim());
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/admin/orders?${params.toString()}`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load orders');
      const fetchedOrders: Order[] = Array.isArray(data.orders) ? data.orders : [];
      setOrders(fetchedOrders);
      setHasMore(Boolean(data.hasMore));
      setNextCursor(data.nextCursor || null);
      setSelectedOrder(prev => {
        if (!prev) return null;
        const updated = fetchedOrders.find(o => o.id === prev.id);
        return updated ? { ...prev, ...updated } : prev;
      });
    } catch (err: any) {
      console.error('Failed to load admin orders:', err);
      showToast(err.message || 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, searchTerm, showToast]);

  useEffect(() => {
    setPage(1);
    setCursorHistory([null]);
    loadOrders(null);
  }, [statusFilter, loadOrders]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (page === 1 && !searchTerm.trim()) loadOrders(null, true);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [page, searchTerm, loadOrders]);

  const goNext = () => {
    if (!nextCursor || !hasMore) return;
    setCursorHistory(prev => [...prev, nextCursor]);
    setPage(p => p + 1);
    loadOrders(nextCursor);
  };

  const goPrevious = () => {
    if (page <= 1) return;
    const previousCursor = cursorHistory[page - 2] || null;
    setCursorHistory(prev => prev.slice(0, -1));
    setPage(p => p - 1);
    loadOrders(previousCursor);
  };

  const updateOrderStatus = async (orderId: string, newOrderStatus: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return showToast('Order not found', 'error');
      const headers = await getAdminAuthHeaders(true);
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST', headers,
        body: JSON.stringify({ status: newOrderStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showToast(data.error || 'Cannot update order status', 'error');
        return;
      }
      const currentCursor = cursorHistory[page - 1] || null;
      await loadOrders(currentCursor, true);
      if (selectedOrder?.id === orderId) {
        loadOrderAuditTrail(orderId);
      }
      if (order.userId && order.userId !== 'guest') {
        await fetch('/api/send-notification', {
          method: 'POST', headers,
          body: JSON.stringify({ userId: order.userId, title: 'Order Status Updated', body: `Your order ${orderId} is now ${statusLabel(newOrderStatus)}.`, data: { orderId } }),
        }).catch(() => {});
      }
      showToast(data.refundRequired ? 'Order cancelled. Refund is pending.' : `Order moved to ${statusLabel(newOrderStatus)}.`, data.refundRequired ? 'error' : 'success');
    } catch (err) {
      console.error('Error updating order status', err);
      showToast('Failed to update order status', 'error');
    }
  };

  const updatePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
    try {
      const headers = await getAdminAuthHeaders(true);
      const endpoint = newPaymentStatus === 'refunded' ? `/api/admin/orders/${orderId}/refund` : `/api/admin/orders/${orderId}/payment-status`;
      const res = await fetch(endpoint, {
        method: 'POST', headers,
        body: newPaymentStatus === 'refunded' ? undefined : JSON.stringify({ status: newPaymentStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to update payment status', 'error');
        return;
      }
      await loadOrders(cursorHistory[page - 1] || null, true);
      if (selectedOrder?.id === orderId) {
        loadOrderAuditTrail(orderId);
      }
      showToast(newPaymentStatus === 'refunded' ? 'Refund processed & logged in server audit trail' : 'Payment status updated & logged', 'success');
    } catch (err) {
      console.error('Error updating payment status', err);
      showToast('Failed to update payment status', 'error');
    }
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSavingTracking(true);
    try {
      const headers = await getAdminAuthHeaders(true);
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/tracking`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          trackingCarrier,
          trackingNumber,
          trackingUrl,
          adminNotes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to save order tracking details', 'error');
        return;
      }
      await loadOrders(cursorHistory[page - 1] || null, true);
      await loadOrderAuditTrail(selectedOrder.id);
      showToast(data.unchanged ? 'No changes to save' : 'Tracking & notes updated and recorded in audit log', 'success');
    } catch (err) {
      console.error('Error saving tracking details:', err);
      showToast('Failed to save tracking details', 'error');
    } finally {
      setSavingTracking(false);
    }
  };

  const getOrderStatusColor = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (['delivered', 'completed'].includes(s)) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (['confirmed', 'processing', 'packed', 'dispatched', 'shipped', 'out_for_delivery', 'received'].includes(s)) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (s === 'cancelled') return 'bg-rose-100 text-rose-800 border-rose-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  const getPaymentStatusColor = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s === 'payment_pending') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (s === 'refunded') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (s === 'failed') return 'bg-rose-100 text-rose-800 border-rose-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const filteredOrders = orders;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-black">Order Management</h2>
          <p className="text-brand-gray-500">50 orders per page · server-enforced state machine · tamper-evident SHA-256 audit log.</p>
        </div>
        <button onClick={() => loadOrders(cursorHistory[page - 1] || null, true)} disabled={refreshing} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-sm font-semibold hover:bg-brand-gray-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-brand-gray-200 overflow-hidden">
        <div className="p-4 border-b border-brand-gray-100 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STATUS_FILTERS.map(filter => (
              <button key={filter.key} onClick={() => setStatusFilter(filter.key)} className={`whitespace-nowrap px-3 py-2 rounded-full text-xs font-bold transition-colors ${statusFilter === filter.key ? 'bg-emerald-600 text-white shadow-sm' : 'bg-brand-gray-50 text-brand-gray-600 hover:bg-brand-gray-100'}`}>
                {filter.label}
              </button>
            ))}
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
            <input type="text" placeholder="Search all orders by Order ID, email, phone or customer..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-brand-gray-50 border border-brand-gray-200 rounded-lg outline-none focus:border-emerald-600 text-sm" />
          </div>
        </div>

        {loading ? <div className="py-16 text-center text-brand-gray-500">Loading orders…</div> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-brand-gray-500 uppercase bg-brand-gray-50"><tr>
                  <th className="px-4 py-3">Order ID / Date</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Payment Method</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Fulfillment</th><th className="px-4 py-3">Action</th>
                </tr></thead>
                <tbody className="divide-y divide-brand-gray-100">
                  {filteredOrders.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-brand-gray-500">No orders found.</td></tr> : filteredOrders.map(o => {
                    const rawOrderStatus = String(o.orderStatus || o.status || 'pending');
                    const currentOrderStatus = rawOrderStatus === 'paid_upi_pending_verify' ? 'pending' : rawOrderStatus === 'shipped' ? 'dispatched' : rawOrderStatus === 'completed' ? 'delivered' : rawOrderStatus;
                    const legacyStatus = (o.status || '').toLowerCase();
                    const currentPaymentStatus = o.paymentStatus || (['paid', 'completed'].includes(legacyStatus) ? 'paid' : 'unpaid');
                    return <tr key={o.id} className="hover:bg-brand-gray-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-xs">{o.orderId || o.id}</div>
                        <div className="text-[11px] text-brand-gray-400 mt-0.5">{(() => { const d = getOrderDate(o.createdAt); return d ? format(d, 'MMM d, yyyy HH:mm') : 'N/A'; })()}</div>
                        {o.lastAuditHash && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5" title={`Audit Hash: ${o.lastAuditHash}`}>
                            <Lock className="w-2.5 h-2.5" /> #{o.auditSequence || 1} · {o.lastAuditHash.slice(0, 8)}
                          </div>
                        )}
                        {o.stockConflict && <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5"><AlertTriangle className="w-3 h-3" /> Stock conflict</div>}
                      </td>
                      <td className="px-4 py-3"><div className="font-medium">{o.shippingDetails?.name || 'Guest Customer'}</div><div className="text-xs text-brand-gray-500">{o.shippingDetails?.phone}</div></td>
                      <td className="px-4 py-3 text-xs font-medium">{o.paymentMethod || 'Cash on Delivery'}</td>
                      <td className="px-4 py-3 font-semibold">₹{o.grandTotal || o.amount}</td>
                      <td className="px-4 py-3"><select value={currentPaymentStatus} onChange={e => updatePaymentStatus(o.id, e.target.value)} className={`text-xs font-semibold rounded-lg px-2 py-1 border outline-none cursor-pointer ${getPaymentStatusColor(currentPaymentStatus)}`}><option value="unpaid">🔴 Unpaid</option><option value="payment_pending">⏳ Payment Pending</option><option value="paid">🟢 Paid</option><option value="refunded">🟣 Refunded</option><option value="failed">❌ Failed</option></select></td>
                      <td className="px-4 py-3"><select value={currentOrderStatus} onChange={e => updateOrderStatus(o.id, e.target.value)} className={`text-xs font-semibold rounded-lg px-2 py-1 border outline-none cursor-pointer ${getOrderStatusColor(currentOrderStatus)}`}>
                        {['AWAITING_WHATSAPP_CONFIRMATION','whatsapp_pending','RECEIVED','pending','confirmed','processing','packed','dispatched','out_for_delivery','delivered','cancelled'].map(s => <option key={s} value={s}>{s === 'AWAITING_WHATSAPP_CONFIRMATION' || s === 'whatsapp_pending' ? '💬 Awaiting WhatsApp' : s === 'RECEIVED' ? '📥 Received' : s === 'pending' ? '🟡 Ordered' : s === 'processing' ? '⚙️ Processing' : s === 'packed' ? '📦 Packed' : s === 'dispatched' ? '🚚 Dispatched / Shipped' : s === 'out_for_delivery' ? '🛵 Out for Delivery' : s === 'delivered' ? '✅ Delivered' : s === 'confirmed' ? '🔵 Confirmed' : '🔴 Cancelled'}</option>)}
                      </select></td>
                      <td className="px-4 py-3"><button onClick={() => setSelectedOrder(o)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"><Eye className="w-3.5 h-3.5" /> Details &amp; Audit</button></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-brand-gray-50/50">
              <span className="text-xs text-brand-gray-500">Page {page} · up to 50 orders</span>
              <div className="flex gap-2"><button disabled={page === 1 || loading} onClick={goPrevious} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border bg-white text-xs font-bold disabled:opacity-40"><ChevronLeft className="w-4 h-4" /> Previous</button><button disabled={!hasMore || loading} onClick={goNext} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border bg-white text-xs font-bold disabled:opacity-40">Next <ChevronRight className="w-4 h-4" /></button></div>
            </div>
          </>
        )}
      </div>

      {selectedOrder && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"><div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-lg font-bold">Order Summary &amp; Transaction Integrity</h3>
            <p className="text-xs text-brand-gray-500 font-mono">ID: {selectedOrder.orderId || selectedOrder.id}</p>
          </div>
          <button onClick={() => { setSelectedOrder(null); setShowAdvancedDetails(false); }} className="p-2 text-brand-gray-400 hover:text-brand-black rounded-full hover:bg-brand-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cryptographic Integrity Verification Banner */}
        {orderIntegrity && (
          <div className={`rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            orderIntegrity.verified
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-start gap-2.5">
              {orderIntegrity.verified ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">
                  {orderIntegrity.verified
                    ? 'Transaction Integrity Verified · SHA-256 Hash Chain Intact'
                    : 'Integrity Alert · Unlogged or Out-of-Band Modification Detected'}
                </div>
                <p className="text-xs opacity-80 mt-0.5">
                  {orderIntegrity.verified
                    ? `All ${orderIntegrity.entryCount} order event(s) are cryptographically chained on the server. Direct client-side Firestore writes are blocked.`
                    : orderIntegrity.tamperReason || 'Order state does not match the latest server-side audit signature.'}
                </p>
              </div>
            </div>
            {orderIntegrity.headHash && (
              <div className="font-mono text-[11px] bg-white/80 px-2.5 py-1 rounded-lg border border-current/15 shrink-0">
                HEAD: {orderIntegrity.headHash.slice(0, 12)}…
              </div>
            )}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4 text-sm bg-brand-gray-50 p-4 rounded-xl border">
          <div className="space-y-1">
            <span className="text-xs text-brand-gray-500 block uppercase font-bold">Delivery Address {(selectedOrder.shippingDetails as any)?.addressType ? `(${(selectedOrder.shippingDetails as any).addressType})` : ''}</span>
            <p className="font-semibold">{selectedOrder.shippingDetails?.name}</p>
            <p className="text-xs text-brand-gray-600">Phone: {selectedOrder.shippingDetails?.phone}</p>
            {(selectedOrder.shippingDetails as any)?.whatsappPhone && (selectedOrder.shippingDetails as any)?.whatsappPhone !== selectedOrder.shippingDetails?.phone && (
              <p className="text-xs text-emerald-700 font-medium">WhatsApp: {(selectedOrder.shippingDetails as any).whatsappPhone}</p>
            )}
            {(selectedOrder.shippingDetails as any)?.houseNo && <p className="text-xs">House/Flat: {(selectedOrder.shippingDetails as any).houseNo}</p>}
            {(selectedOrder.shippingDetails as any)?.street && <p className="text-xs">Street: {(selectedOrder.shippingDetails as any).street}</p>}
            {(selectedOrder.shippingDetails as any)?.area && <p className="text-xs font-medium">Area: {(selectedOrder.shippingDetails as any).area}</p>}
            {(selectedOrder.shippingDetails as any)?.landmark && <p className="text-xs text-brand-gray-600">Landmark: {(selectedOrder.shippingDetails as any).landmark}</p>}
            <p className="text-xs">{selectedOrder.shippingDetails?.address}</p>
            {selectedOrder.shippingDetails?.pincode && <p className="font-mono text-xs font-semibold">PIN: {selectedOrder.shippingDetails.pincode}</p>}
            {((selectedOrder as any).customerEmail || (selectedOrder.shippingDetails as any)?.email) && (
              <p className="text-xs text-brand-gray-700 flex items-center gap-1 pt-0.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{(selectedOrder as any).customerEmail || (selectedOrder.shippingDetails as any)?.email}</span>
              </p>
            )}
            {(selectedOrder.shippingDetails as any)?.deliveryInstructions && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">Note: {(selectedOrder.shippingDetails as any).deliveryInstructions}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <span className="text-xs text-brand-gray-500 block uppercase font-bold">Payment &amp; Status</span>
            <p>Method: <strong>{selectedOrder.paymentMethod || 'COD'}</strong></p>
            <p>Order Status: <strong>{statusLabel(selectedOrder.orderStatus || selectedOrder.status || 'pending')}</strong></p>
            <p>Payment Status: <strong>{selectedOrder.paymentStatus || 'unpaid'}</strong></p>
            <p>Grand Total: <strong>₹{selectedOrder.grandTotal || selectedOrder.amount}</strong></p>
            {(selectedOrder as any).verificationCode && <p className="font-mono text-xs text-emerald-800">Verification: {(selectedOrder as any).verificationCode}</p>}
            <div className="pt-2 border-t border-brand-gray-200/80 flex flex-col gap-1.5">
              {(selectedOrder as any).lastStatusEmailSent?.sentAt ? (
                <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <Mail className="w-3 h-3 shrink-0" />
                  Auto-emailed ({statusLabel((selectedOrder as any).lastStatusEmailSent.status)}) to {(selectedOrder as any).lastStatusEmailSent.recipientEmail}
                </p>
              ) : (
                <p className="text-[11px] text-brand-gray-500 flex items-center gap-1">
                  <Mail className="w-3 h-3 shrink-0" />
                  Automated SMTP email triggers on every status update
                </p>
              )}
              <button
                type="button"
                disabled={sendingEmail}
                onClick={() => handleResendStatusEmail(selectedOrder.id)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors disabled:opacity-50 w-fit"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingEmail ? 'Sending Status Email…' : 'Send / Resend Status Email'}
              </button>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold mb-3">Order Items ({selectedOrder.items.length})</h4>
          <div className="divide-y border rounded-xl overflow-hidden">
            {selectedOrder.items.map((item, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between bg-white text-sm">
                <div className="flex items-center gap-3">
                  {item.image && <img src={item.image} alt={item.name} className="w-10 h-10 object-contain bg-white rounded-lg border shrink-0" />}
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    {(item.selectedWeight || item.selectedCut) && (
                      <p className="text-xs text-brand-gray-500">
                        {item.selectedWeight && `Weight: ${item.selectedWeight} `}
                        {item.selectedCut && `Cut: ${item.selectedCut}`}
                      </p>
                    )}
                  </div>
                </div>
                <span className="font-bold">×{item.quantity} · ₹{item.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit-Logged Shipment Tracking & Admin Notes Form */}
        <form onSubmit={handleSaveTracking} className="rounded-xl border border-brand-gray-200 bg-brand-gray-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-gray-700 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-600" />
              Shipment Tracking &amp; Admin Notes (Server Audit-Logged)
            </h4>
            <button
              type="submit"
              disabled={savingTracking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-black text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {savingTracking ? 'Recording...' : 'Save & Log Changes'}
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-brand-gray-600 mb-1">Courier / Carrier</label>
              <input
                type="text"
                value={trackingCarrier}
                onChange={e => setTrackingCarrier(e.target.value)}
                placeholder="e.g. Dunzo, Porter, Delhivery"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-brand-gray-200 rounded-lg outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-brand-gray-600 mb-1">Tracking / AWB Number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                placeholder="Tracking ID"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-brand-gray-200 rounded-lg outline-none focus:border-emerald-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-brand-gray-600 mb-1">Tracking Link URL</label>
              <input
                type="url"
                value={trackingUrl}
                onChange={e => setTrackingUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-brand-gray-200 rounded-lg outline-none focus:border-emerald-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-brand-gray-600 mb-1">Internal Fulfillment Notes</label>
            <input
              type="text"
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Dispatch batch, rider phone, or special handling note..."
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-brand-gray-200 rounded-lg outline-none focus:border-emerald-600"
            />
          </div>
        </form>

        {/* Server-Side Per-Order Immutable Audit Trail */}
        <div className="rounded-xl border border-brand-gray-200 overflow-hidden">
          <div className="bg-brand-gray-50 px-4 py-3 border-b border-brand-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-black">
                Immutable Server-Side Order Audit Log ({orderAuditLogs.length})
              </h4>
            </div>
            <button
              type="button"
              onClick={() => loadOrderAuditTrail(selectedOrder.id)}
              disabled={loadingAudit}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingAudit ? 'animate-spin' : ''}`} /> Verify Chain
            </button>
          </div>
          <div className="divide-y divide-brand-gray-100 max-h-72 overflow-y-auto bg-white">
            {loadingAudit ? (
              <div className="p-6 text-center text-xs text-brand-gray-500">Verifying cryptographic order audit chain…</div>
            ) : orderAuditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-brand-gray-400">No audit entries recorded for this order yet.</div>
            ) : (
              orderAuditLogs.map((entry) => {
                const entryDate = getOrderDate(entry.createdAt);
                const changeKeys = entry.changes ? Object.keys(entry.changes) : [];
                return (
                  <div key={entry.id || entry.sequence} className="p-3.5 text-xs space-y-1.5 hover:bg-brand-gray-50/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-brand-black text-white">
                          #{entry.sequence}
                        </span>
                        <span className="font-mono font-bold text-brand-black">
                          {entry.eventType || entry.action}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {entry.actorRole}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-brand-gray-400">
                        {entryDate ? format(entryDate, 'MMM d, yyyy HH:mm:ss') : String(entry.createdAt || '')}
                      </span>
                    </div>
                    <p className="text-brand-gray-700">{entry.details}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-brand-gray-500">
                      <span>
                        Status: <strong className="text-brand-black">{entry.previousStatus || 'NONE'} → {entry.newStatus}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Payment: <strong className="text-brand-black">{entry.previousPaymentStatus || 'NONE'} → {entry.newPaymentStatus}</strong>
                      </span>
                      <span>·</span>
                      <span>Actor: <strong className="text-brand-black">{entry.actor}</strong></span>
                      {entry.source && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-[10px] bg-brand-gray-100 px-1.5 py-0.5 rounded">{entry.source}</span>
                        </>
                      )}
                    </div>
                    {changeKeys.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {changeKeys.map((field) => {
                          const diff = entry.changes?.[field];
                          if (!diff) return null;
                          return (
                            <span key={field} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-gray-100 text-brand-gray-700 font-mono text-[10px]">
                              {field}: {String(diff.from ?? 'null')} → {String(diff.to ?? 'null')}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {entry.integrityHash && (
                      <div className="font-mono text-[10px] text-brand-gray-400 flex items-center gap-2 pt-0.5">
                        <span>prev: {String(entry.previousHash || 'GENESIS').slice(0, 10)}</span>
                        <span>→</span>
                        <span className="text-emerald-700 font-semibold">sha256: {entry.integrityHash.slice(0, 16)}…</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button type="button" onClick={() => setShowAdvancedDetails(v => !v)} className="w-full flex items-center justify-between rounded-xl border border-brand-gray-200 px-4 py-3 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"><span>Gateway &amp; Reservation References</span><span className="text-xs text-brand-gray-400">{showAdvancedDetails ? 'Hide' : 'Show'}</span></button>
        {showAdvancedDetails && <div className="rounded-xl border border-brand-gray-200 bg-brand-gray-50 p-4 text-xs space-y-2"><p><strong>Payment reference:</strong> {selectedOrder.razorpay_payment_id || selectedOrder.razorpayPaymentId || 'Not available'}</p><p><strong>Gateway order:</strong> {selectedOrder.razorpay_order_id || selectedOrder.razorpayOrderId || 'Not available'}</p><p><strong>Inventory reservation:</strong> {selectedOrder.reservationId || selectedOrder.inventoryReservationId || 'Not available'}</p><p><strong>Refund status:</strong> {selectedOrder.refundStatus || 'Not requested'}</p></div>}
      </div></div>}
    </div>
  );
}

