import { useState, useEffect, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { Order } from '../../../types';
import { Search, Eye, X, AlertTriangle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../core/contexts/ToastContext';
import { logAuditEvent } from '../../../services/auditService';

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

  const loadOrders = useCallback(async (cursor: string | null, silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) throw new Error('Authentication required');
      const params = new URLSearchParams({ status: statusFilter, pageSize: '50' });
      if (searchTerm.trim()) params.set('q', searchTerm.trim());
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load orders');
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setHasMore(Boolean(data.hasMore));
      setNextCursor(data.nextCursor || null);
    } catch (err: any) {
      console.error('Failed to load admin orders:', err);
      showToast(err.message || 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    setPage(1);
    setCursorHistory([null]);
    loadOrders(null);
  }, [statusFilter, loadOrders]);

  // Lightweight realtime freshness without subscribing the browser to the
  // entire orders collection. The server still returns a maximum of 50 rows.
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
      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ status: newOrderStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showToast(data.error || 'Cannot update order status', 'error');
        return;
      }
      // Reload the current cursor because the order may have moved to another
      // status queue. This avoids stale rows and preserves server ordering.
      const currentCursor = cursorHistory[page - 1] || null;
      await loadOrders(currentCursor, true);
      if (order.userId && order.userId !== 'guest') {
        await fetch('/api/send-notification', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
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
      const token = await getAuth().currentUser?.getIdToken();
      const endpoint = newPaymentStatus === 'refunded' ? `/api/admin/orders/${orderId}/refund` : `/api/admin/orders/${orderId}/payment-status`;
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: newPaymentStatus === 'refunded' ? undefined : JSON.stringify({ status: newPaymentStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to update payment status', 'error');
        return;
      }
      await loadOrders(cursorHistory[page - 1] || null, true);
      logAuditEvent(newPaymentStatus === 'refunded' ? 'REFUND_ORDER' : 'UPDATE_PAYMENT_STATUS', 'BILLING', `Order ${orderId} payment status -> ${data.paymentStatus || newPaymentStatus}`);
      showToast(newPaymentStatus === 'refunded' ? 'Refund processed successfully' : 'Payment status updated', 'success');
    } catch (err) {
      console.error('Error updating payment status', err);
      showToast('Failed to update payment status', 'error');
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
          <p className="text-brand-gray-500">50 orders per page · status workflow · newest first within each queue.</p>
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
                      <td className="px-4 py-3"><div className="font-mono font-bold text-xs">{o.orderId || o.id}</div><div className="text-[11px] text-brand-gray-400 mt-0.5">{(() => { const d = getOrderDate(o.createdAt); return d ? format(d, 'MMM d, yyyy HH:mm') : 'N/A'; })()}</div>{o.stockConflict && <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5"><AlertTriangle className="w-3 h-3" /> Stock conflict</div>}</td>
                      <td className="px-4 py-3"><div className="font-medium">{o.shippingDetails?.name || 'Guest Customer'}</div><div className="text-xs text-brand-gray-500">{o.shippingDetails?.phone}</div></td>
                      <td className="px-4 py-3 text-xs font-medium">{o.paymentMethod || 'Cash on Delivery'}</td>
                      <td className="px-4 py-3 font-semibold">₹{o.grandTotal || o.amount}</td>
                      <td className="px-4 py-3"><select value={currentPaymentStatus} onChange={e => updatePaymentStatus(o.id, e.target.value)} className={`text-xs font-semibold rounded-lg px-2 py-1 border outline-none cursor-pointer ${getPaymentStatusColor(currentPaymentStatus)}`}><option value="unpaid">🔴 Unpaid</option><option value="payment_pending">⏳ Payment Pending</option><option value="paid">🟢 Paid</option><option value="refunded">🟣 Refunded</option><option value="failed">❌ Failed</option></select></td>
                      <td className="px-4 py-3"><select value={currentOrderStatus} onChange={e => updateOrderStatus(o.id, e.target.value)} className={`text-xs font-semibold rounded-lg px-2 py-1 border outline-none cursor-pointer ${getOrderStatusColor(currentOrderStatus)}`}>
                        {['AWAITING_WHATSAPP_CONFIRMATION','whatsapp_pending','RECEIVED','pending','confirmed','processing','packed','dispatched','out_for_delivery','delivered','cancelled'].map(s => <option key={s} value={s}>{s === 'AWAITING_WHATSAPP_CONFIRMATION' || s === 'whatsapp_pending' ? '💬 Awaiting WhatsApp' : s === 'RECEIVED' ? '📥 Received' : s === 'pending' ? '🟡 Ordered' : s === 'processing' ? '⚙️ Processing' : s === 'packed' ? '📦 Packed' : s === 'dispatched' ? '🚚 Dispatched / Shipped' : s === 'out_for_delivery' ? '🛵 Out for Delivery' : s === 'delivered' ? '✅ Delivered' : s === 'confirmed' ? '🔵 Confirmed' : '🔴 Cancelled'}</option>)}
                      </select></td>
                      <td className="px-4 py-3"><button onClick={() => setSelectedOrder(o)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"><Eye className="w-3.5 h-3.5" /> Details</button></td>
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

      {selectedOrder && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"><div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative">
        <div className="flex items-center justify-between border-b pb-4"><div><h3 className="text-lg font-bold">Order Summary</h3><p className="text-xs text-brand-gray-500 font-mono">ID: {selectedOrder.orderId || selectedOrder.id}</p></div><button onClick={() => { setSelectedOrder(null); setShowAdvancedDetails(false); }} className="p-2 text-brand-gray-400 hover:text-brand-black rounded-full hover:bg-brand-gray-100"><X className="w-5 h-5" /></button></div>
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
            {(selectedOrder.shippingDetails as any)?.deliveryInstructions && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">Note: {(selectedOrder.shippingDetails as any).deliveryInstructions}</p>
            )}
          </div>
          <div className="space-y-1">
            <span className="text-xs text-brand-gray-500 block uppercase font-bold">Payment &amp; Status</span>
            <p>Method: <strong>{selectedOrder.paymentMethod || 'COD'}</strong></p>
            <p>Order Status: <strong>{statusLabel(selectedOrder.orderStatus || selectedOrder.status || 'pending')}</strong></p>
            <p>Payment Status: <strong>{selectedOrder.paymentStatus || 'unpaid'}</strong></p>
            {(selectedOrder as any).verificationCode && <p className="font-mono text-xs text-emerald-800">Verification: {(selectedOrder as any).verificationCode}</p>}
          </div>
        </div>
        <div><h4 className="text-sm font-bold mb-3">Order Items ({selectedOrder.items.length})</h4><div className="divide-y border rounded-xl overflow-hidden">{selectedOrder.items.map((item, idx) => <div key={idx} className="p-3 flex items-center justify-between bg-white text-sm"><div className="flex items-center gap-3">{item.image && <img src={item.image} alt={item.name} className="w-10 h-10 object-contain bg-white rounded-lg border shrink-0" />}<div><p className="font-semibold">{item.name}</p>{(item.selectedWeight || item.selectedCut) && <p className="text-xs text-brand-gray-500">{item.selectedWeight && `Weight: ${item.selectedWeight} `}{item.selectedCut && `Cut: ${item.selectedCut}`}</p>}</div></div><span className="font-bold">×{item.quantity} · ₹{item.price}</span></div>)}</div></div>
        <button type="button" onClick={() => setShowAdvancedDetails(v => !v)} className="w-full flex items-center justify-between rounded-xl border border-brand-gray-200 px-4 py-3 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"><span>Advanced details</span><span className="text-xs text-brand-gray-400">{showAdvancedDetails ? 'Hide' : 'Show'}</span></button>
        {showAdvancedDetails && <div className="rounded-xl border border-brand-gray-200 bg-brand-gray-50 p-4 text-xs space-y-2"><p><strong>Payment reference:</strong> {selectedOrder.razorpay_payment_id || selectedOrder.razorpayPaymentId || 'Not available'}</p><p><strong>Gateway order:</strong> {selectedOrder.razorpay_order_id || selectedOrder.razorpayOrderId || 'Not available'}</p><p><strong>Inventory reservation:</strong> {selectedOrder.reservationId || selectedOrder.inventoryReservationId || 'Not available'}</p><p><strong>Refund status:</strong> {selectedOrder.refundStatus || 'Not requested'}</p>{Array.isArray(selectedOrder.statusHistory) && selectedOrder.statusHistory.length > 0 && <div><strong>Status history</strong><div className="mt-2 space-y-1">{selectedOrder.statusHistory.map((entry: any, idx: number) => <div key={idx} className="flex justify-between gap-3"><span>{statusLabel(entry.status || entry.toStatus || 'unknown')}</span><span className="text-brand-gray-400">{entry.changedAt?.seconds ? format(new Date(entry.changedAt.seconds * 1000), 'MMM d, HH:mm') : ''}</span></div>)}</div></div>}</div>}
      </div></div>}
    </div>
  );
}
