import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../../../services/firebase';
import { Order } from '../../../types';
import { useSettings } from '../../../contexts/SettingsContext';
import { CreditCard, ExternalLink, Search, RefreshCw, ArrowUpRight, DollarSign, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../core/contexts/ToastContext';
import { logAuditEvent } from '../../../services/auditService';
import { PhonePeIcon, PaytmIcon, UpiOfficialIcon } from '../../core/components/UpiIcons';

// Orders' `createdAt` may be a Firestore Timestamp (has `.seconds`) or an
// ISO date string - both are in active use depending on which server path
// wrote the order. Only checking `.seconds` shows "Recent" for every
// string-dated order, which is most of them.
function getOrderDate(createdAt: any): Date | null {
  if (!createdAt) return null;
  if (typeof createdAt === 'string') {
    const d = new Date(createdAt);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof createdAt.seconds === 'number') {
    return new Date(createdAt.seconds * 1000);
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
  
  // Local settings edit
  const [upiId, setUpiId] = useState(settings.upiId || '9739391891@ybl');
  const [upiId2, setUpiId2] = useState(settings.upiId2 || '9739391891@paytm');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setUpiId(settings.upiId || '9739391891@ybl');
    setUpiId2(settings.upiId2 || '9739391891@paytm');
  }, [settings]);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const loaded: Order[] = [];
        snap.forEach(d => {
          loaded.push({ id: d.id, ...d.data() } as Order);
        });
        setOrders(loaded);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to orders in PaymentsTab:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

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
      if (err.message && err.message.includes('offline')) {
        showToast('Settings saved locally! Your Firebase Database is not created yet — go to Firebase Console and create it in Firestore.', 'error');
      } else {
        showToast('Error updating payment settings to Cloud: ' + err.message, 'error');
      }
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
    // Refunds must go through the real Razorpay refund API (Orders tab), not a
    // plain status flip here -- this tab has no refund endpoint wired up, so
    // "refunded" is intentionally not a reachable value from this control.
    if (newStatus === 'refunded') {
      showToast('Process refunds from the Orders tab so the money is actually returned via Razorpay.', 'error');
      return;
    }
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        showToast('Your admin session has expired. Please sign in again.', 'error');
        return;
      }
      const res = await fetch(`/api/admin/orders/${order.id}/payment-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
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
      setOrders(prev => prev.map(o => (
        o.id === order.id ? { ...o, ...updatePayload } : o
      )));
      logAuditEvent('UPDATE_PAYMENT_STATUS', 'BILLING', `Order ${order.id} payment status set to ${updatePayload.paymentStatus}`);
      showToast('Payment status updated', 'success');
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast('Could not update payment status', 'error');
    }
  };

  // Calculations
  const paidOrders = orders.filter(o => getPaymentStatus(o) === 'paid');

  const razorpayOrders = paidOrders.filter(o => 
    getPaymentMethod(o).includes('razorpay') || getPaymentMethod(o).includes('online')
  );
  const upiOrders = paidOrders.filter(o => 
    getPaymentMethod(o).includes('upi') || getPaymentMethod(o).includes('qr')
  );
  const codOrders = paidOrders.filter(o => 
    getPaymentMethod(o).includes('cod') || getPaymentMethod(o).includes('cash')
  );

  const razorpayTotal = razorpayOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
  const upiTotal = upiOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
  const codTotal = codOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
  const grandTotal = paidOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

  const filteredOrders = orders.filter(o => {
    const method = getPaymentMethod(o);
    const matchesSearch = 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.shippingDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPaymentReference(o).toLowerCase().includes(searchTerm.toLowerCase());
    
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
            Razorpay & Payment Dashboard
          </h2>
          <p className="text-brand-gray-500">Real-time payment gateway monitoring, transaction ledger, and gateway keys.</p>
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
        <div className="bg-white p-5 rounded-xl border border-brand-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider">Razorpay Online</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-brand-black">₹{razorpayTotal.toLocaleString('en-IN')}</div>
            <div className="text-xs text-brand-gray-500 mt-1">{razorpayOrders.length} transactions captured</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-brand-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider">UPI QR Payments</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <QrCode className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-brand-black">₹{upiTotal.toLocaleString('en-IN')}</div>
            <div className="text-xs text-brand-gray-500 mt-1">{upiOrders.length} instant QR orders</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-brand-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider">Cash on Delivery</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-brand-black">₹{codTotal.toLocaleString('en-IN')}</div>
            <div className="text-xs text-brand-gray-500 mt-1">{codOrders.length} COD orders</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-brand-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider">Total Sales</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-brand-black">₹{grandTotal.toLocaleString('en-IN')}</div>
            <div className="text-xs text-brand-gray-500 mt-1">{orders.length} total orders across store</div>
          </div>
        </div>
      </div>

            {/* Payment Configuration Setup Card */}
      <div className="bg-white p-6 rounded-xl border border-brand-gray-200 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-brand-gray-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-brand-black">UPI & Payment Configuration</h3>
              <p className="text-xs text-brand-gray-500">Configure your Store UPI IDs. (Razorpay keys are configured in server environment).</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSaveKeys} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-brand-gray-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-brand-gray-400" />
                  Primary Store UPI VPA (QR 1)
                </span>
                <span className="flex items-center gap-1.5">
                  <PhonePeIcon className="h-3.5 w-3.5" />
                  <UpiOfficialIcon className="h-3 w-auto" />
                </span>
              </label>
              <input 
                type="text" 
                value={upiId} 
                onChange={e => setUpiId(e.target.value)}
                className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600 font-mono"
                placeholder="9739391891@ybl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-gray-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-brand-gray-400" />
                  Secondary Store UPI VPA (QR 2)
                </span>
                <span className="flex items-center gap-1.5">
                  <PaytmIcon className="h-2.5 w-auto" />
                  <UpiOfficialIcon className="h-3 w-auto" />
                </span>
              </label>
              <input 
                type="text" 
                value={upiId2} 
                onChange={e => setUpiId2(e.target.value)}
                className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600 font-mono"
                placeholder="9739391891@paytm"
              />
            </div>
          </div>
          
          <div className="flex items-end justify-end pt-2">
            <button 
              type="submit" 
              disabled={isSaving}
              className="px-6 py-2.5 bg-brand-black text-white rounded-lg text-sm font-medium hover:bg-brand-gray-900 transition-colors whitespace-nowrap shadow-sm"
            >
              {isSaving ? 'Saving...' : 'Save Payment Keys'}
            </button>
          </div>
        </form>
      </div>

      {/* Transactions Ledger */}
      <div className="bg-white rounded-xl border border-brand-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-brand-gray-200 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-brand-gray-50/50">
          <div className="flex items-center gap-2 flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
            <input 
              type="text"
              placeholder="Search by Order ID, Customer, UTR, or Payment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-brand-gray-200 rounded-lg outline-none focus:border-emerald-600 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-brand-gray-500">Filter:</span>
            <button 
              onClick={() => setMethodFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${methodFilter === 'all' ? 'bg-brand-black text-white' : 'bg-white text-brand-gray-600 border border-brand-gray-200'}`}
            >
              All ({orders.length})
            </button>
            <button 
              onClick={() => setMethodFilter('razorpay')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${methodFilter === 'razorpay' ? 'bg-blue-600 text-white' : 'bg-white text-brand-gray-600 border border-brand-gray-200'}`}
            >
              Razorpay ({razorpayOrders.length})
            </button>
            <button 
              onClick={() => setMethodFilter('upi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${methodFilter === 'upi' ? 'bg-emerald-600 text-white' : 'bg-white text-brand-gray-600 border border-brand-gray-200'}`}
            >
              UPI QR ({upiOrders.length})
            </button>
            <button 
              onClick={() => setMethodFilter('cod')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${methodFilter === 'cod' ? 'bg-amber-600 text-white' : 'bg-white text-brand-gray-600 border border-brand-gray-200'}`}
            >
              COD ({codOrders.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-brand-gray-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            Loading real-time transactions...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-brand-gray-500">
            No transactions found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-brand-gray-500 uppercase bg-brand-gray-50 border-b border-brand-gray-200">
                <tr>
                  <th className="px-4 py-3">Order ID / Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3">Reference / UTR</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-gray-100">
                {filteredOrders.map(o => {
                  const method = getPaymentMethod(o);
                  const paymentStatus = getPaymentStatus(o);
                  const isUpi = method.includes('upi') || method.includes('qr');
                  const isRzp = method.includes('razorpay') || method.includes('online');
                  const utr = getPaymentReference(o);

                  return (
                    <tr key={o.id} className="hover:bg-brand-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-brand-black">{o.id}</div>
                        <div className="text-xs text-brand-gray-400">
                          {(() => {
                            const d = getOrderDate(o.createdAt);
                            return d ? format(d, 'MMM d, yyyy HH:mm') : 'Recent';
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-brand-black">{o.shippingDetails?.name || 'Guest User'}</div>
                        <div className="text-xs text-brand-gray-500 font-mono">{o.shippingDetails?.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                          isRzp ? 'bg-blue-100 text-blue-800' : isUpi ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isRzp && <CreditCard className="w-3 h-3" />}
                          {isUpi && <QrCode className="w-3 h-3" />}
                          {o.paymentMethod || 'Online Payment'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-brand-black">
                        {utr}
                      </td>
                      <td className="px-4 py-3 font-bold text-brand-black">
                        ₹{getOrderAmount(o)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : paymentStatus === 'payment_pending'
                            ? 'bg-blue-100 text-blue-700'
                            : paymentStatus === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {paymentStatus !== 'paid' && (
                            <button
                              onClick={() => updatePaymentStatus(o, 'paid')}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition-colors"
                              title="Confirm payment"
                            >
                              Verify
                            </button>
                          )}
                          <select 
                            value={paymentStatus}
                            onChange={(e) => updatePaymentStatus(o, e.target.value)}
                            className="bg-brand-gray-50 border border-brand-gray-200 text-brand-black text-xs rounded p-1 outline-none focus:border-emerald-600"
                          >
                            <option value="unpaid">Unpaid</option>
                            <option value="payment_pending">Payment Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                          </select>
                          {paymentStatus === 'refunded' && (
                            <span className="text-xs text-purple-700 font-medium">Refunded (via Orders tab)</span>
                          )}
                        </div>
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
