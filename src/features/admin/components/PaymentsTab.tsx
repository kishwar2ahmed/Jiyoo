import React, { useState, useEffect, useCallback } from 'react';
import { Order } from '../../../types';
import { useSettings } from '../../../contexts/SettingsContext';
import { CreditCard, ExternalLink, Search, RefreshCw, ArrowUpRight, DollarSign, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../core/contexts/ToastContext';
import { logAuditEvent } from '../../../services/auditService';
import { PhonePeIcon, PaytmIcon, UpiOfficialIcon } from '../../core/components/UpiIcons';
import { getAdminAuthHeaders } from '../../../utils/adminAuth';

function getOrderDate(createdAt: any): Date | null {
  if (!createdAt) return null;
  if (typeof createdAt === 'string' || typeof createdAt === 'number') {
    const d = new Date(createdAt);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof createdAt.seconds === 'number') {
    return new Date(createdAt.seconds * 1000);
  }
  if (typeof createdAt?.toDate === 'function') {
    return createdAt.toDate();
  }
  return null;
}

export function PaymentsTab() {
  const { showToast } = useToast();
  const { settings, updateSettings } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const [upiId, setUpiId] = useState(settings.upiId || '9739391891@ybl');
  const [upiId2, setUpiId2] = useState(settings.upiId2 || '9739391891@paytm');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setUpiId(settings.upiId || '9739391891@ybl');
    setUpiId2(settings.upiId2 || '9739391891@paytm');
  }, [settings]);

  const fetchOrders = useCallback(async () => {
    try {
      const headers = await getAdminAuthHeaders();
      const res = await fetch('/api/admin/orders?status=all&pageSize=50', { headers });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Error loading orders in PaymentsTab:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const timer = window.setInterval(fetchOrders, 10000);
    return () => window.clearInterval(timer);
  }, [fetchOrders]);

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings({
        upiId,
        upiId2,
      });
      logAuditEvent('UPDATE_PAYOUT_UPI', 'BILLING', `UPI IDs changed to ${upiId} / ${upiId2}`);
      showToast('Payment settings updated successfully!', 'success');
    } catch (err: any) {
      showToast('Error updating payment settings: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getPaymentStatus = (order: Order) => {
    if (order.paymentStatus) return order.paymentStatus;
    return ['paid', 'completed', 'delivered'].includes(order.status || '') ? 'paid' : 'unpaid';
  };

  const getPaymentReference = (order: Order) => {
    return order.utrNumber || order.razorpay_payment_id || (order as any).razorpayPaymentId || '-';
  };

  const getOrderAmount = (order: Order) => {
    return Number(order.grandTotal ?? order.amount ?? 0) || 0;
  };

  const getPaymentMethod = (order: Order) => {
    return (order.paymentMethod || '').toLowerCase();
  };

  const updatePaymentStatus = async (order: Order, newStatus: string) => {
    try {
      const headers = await getAdminAuthHeaders(true);
      const endpoint =
        newStatus === 'refunded'
          ? `/api/admin/orders/${order.id}/refund`
          : `/api/admin/orders/${order.id}/payment-status`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: newStatus === 'refunded' ? undefined : JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showToast(data.error || 'Could not update payment status', 'error');
        return;
      }

      const updatePayload = {
        paymentStatus: data.paymentStatus || newStatus,
        ...(data.orderStatus ? { status: data.orderStatus, orderStatus: data.orderStatus } : {}),
      };
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...updatePayload } : o)));
      showToast('Payment status updated & logged in server audit trail', 'success');
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast('Could not update payment status', 'error');
    }
  };

  const paidOrders = orders.filter((o) => getPaymentStatus(o) === 'paid');

  const razorpayOrders = paidOrders.filter(
    (o) => getPaymentMethod(o).includes('razorpay') || getPaymentMethod(o).includes('online')
  );
  const upiOrders = paidOrders.filter(
    (o) => getPaymentMethod(o).includes('upi') || getPaymentMethod(o).includes('qr')
  );
  const codOrders = paidOrders.filter(
    (o) => getPaymentMethod(o).includes('cod') || getPaymentMethod(o).includes('cash')
  );

  const razorpayTotal = razorpayOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
  const upiTotal = upiOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
  const codTotal = codOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
  const grandTotal = paidOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

  const filteredOrders = orders.filter((o) => {
    const method = getPaymentMethod(o);
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      String(o.id || '').toLowerCase().includes(q) ||
      String(o.orderId || '').toLowerCase().includes(q) ||
      String(o.shippingDetails?.name || '').toLowerCase().includes(q) ||
      String(getPaymentReference(o) || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (methodFilter === 'razorpay') return method.includes('razorpay') || method.includes('online');
    if (methodFilter === 'upi') return method.includes('upi') || method.includes('qr');
    if (methodFilter === 'cod') return method.includes('cod') || method.includes('cash');
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-black flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            Razorpay &amp; Payment Dashboard
          </h2>
          <p className="text-brand-gray-500">
            Real-time payment gateway monitoring, transaction ledger, and gateway keys.
          </p>
        </div>
        <a
          href="https://dashboard.razorpay.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <span>Razorpay Live Dashboard</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-brand-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-brand-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Settled Volume</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-brand-black">₹{grandTotal.toLocaleString()}</p>
          <p className="text-xs text-brand-gray-400 mt-1">{paidOrders.length} paid orders</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-brand-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-brand-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Razorpay Gateway</span>
            <ArrowUpRight className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-brand-black">₹{razorpayTotal.toLocaleString()}</p>
          <p className="text-xs text-brand-gray-400 mt-1">{razorpayOrders.length} transactions</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-brand-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-brand-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Direct UPI QR</span>
            <QrCode className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-brand-black">₹{upiTotal.toLocaleString()}</p>
          <p className="text-xs text-brand-gray-400 mt-1">{upiOrders.length} UTR verifications</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-brand-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-brand-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Cash on Delivery</span>
            <RefreshCw className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-brand-black">₹{codTotal.toLocaleString()}</p>
          <p className="text-xs text-brand-gray-400 mt-1">{codOrders.length} collected orders</p>
        </div>
      </div>

      {/* UPI Configuration */}
      <form
        onSubmit={handleSaveKeys}
        className="bg-white p-6 rounded-2xl border border-brand-gray-200 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-brand-black flex items-center gap-2">
              Merchant UPI Payout VPA Configuration
            </h3>
            <p className="text-xs text-brand-gray-500">
              Used to generate dynamic checkout QR codes for PhonePe, Google Pay, and Paytm.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PhonePeIcon className="w-5 h-5" />
            <PaytmIcon className="w-5 h-5" />
            <UpiOfficialIcon className="w-8 h-4" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-brand-gray-700 mb-1">
              Primary UPI ID (PhonePe / YBL)
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-brand-gray-200 text-sm font-mono"
              placeholder="9739391891@ybl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-gray-700 mb-1">
              Secondary UPI ID (Paytm / Fallback)
            </label>
            <input
              type="text"
              value={upiId2}
              onChange={(e) => setUpiId2(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-brand-gray-200 text-sm font-mono"
              placeholder="9739391891@paytm"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-brand-black text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-brand-gray-900 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save UPI Configuration'}
          </button>
        </div>
      </form>

      {/* Transactions Ledger */}
      <div className="bg-white rounded-2xl border border-brand-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-brand-gray-200 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Order ID, customer, UTR..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-brand-gray-50 border border-brand-gray-200 rounded-xl outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            {(['all', 'razorpay', 'upi', 'cod'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                  methodFilter === m
                    ? 'bg-brand-black text-white'
                    : 'bg-brand-gray-100 text-brand-gray-600 hover:bg-brand-gray-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-brand-gray-500">Loading payment ledger...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-brand-gray-500">No matching transactions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-gray-50 text-brand-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Method / Reference</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-gray-100">
                {filteredOrders.map((order) => {
                  const d = getOrderDate(order.createdAt);
                  const payStatus = getPaymentStatus(order);
                  return (
                    <tr key={order.id} className="hover:bg-brand-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">
                        <div className="font-semibold text-brand-black">
                          #{String(order.orderId || order.id).slice(-8)}
                        </div>
                        <div className="text-brand-gray-400">
                          {d ? format(d, 'MMM dd, hh:mm a') : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-brand-black">
                          {order.shippingDetails?.name || 'Guest'}
                        </div>
                        <div className="text-xs text-brand-gray-400">
                          {order.shippingDetails?.phone || ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="uppercase text-xs font-semibold text-brand-gray-700">
                          {order.paymentMethod || 'N/A'}
                        </div>
                        <div className="font-mono text-xs text-brand-gray-400">
                          Ref: {getPaymentReference(order)}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-brand-black">
                        ₹{getOrderAmount(order).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={payStatus}
                          onChange={(e) => updatePaymentStatus(order, e.target.value)}
                          className="text-xs font-semibold rounded-lg border border-brand-gray-200 px-2.5 py-1.5 bg-white"
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="payment_pending">Pending Verification</option>
                          <option value="paid">Paid</option>
                          <option value="refunded">Refunded</option>
                          <option value="failed">Failed</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
