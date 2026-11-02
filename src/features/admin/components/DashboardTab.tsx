import { useState, useEffect } from 'react';
import { PRODUCTS } from '../../../constants/data';
import { getAdminAuthHeaders } from '../../../utils/adminAuth';
import { Users, ShoppingBag, DollarSign, Package, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export function DashboardTab() {
  const [stats, setStats] = useState({
    totalUsers: 1,
    totalOrders: 0,
    paidOrdersCount: 0,
    pendingOrdersCount: 0,
    totalRevenue: 0,
    totalProducts: PRODUCTS.length,
    razorpayConfigured: false,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      try {
        const headers = await getAdminAuthHeaders();
        const res = await fetch('/api/admin/stats', { headers });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && isMounted) {
          setStats({
            totalUsers: data.stats?.totalUsers ?? 1,
            totalOrders: data.stats?.totalOrders ?? 0,
            paidOrdersCount: data.stats?.paidOrdersCount ?? 0,
            pendingOrdersCount: data.stats?.pendingOrdersCount ?? 0,
            totalRevenue: data.stats?.totalRevenue ?? 0,
            totalProducts: data.stats?.totalProducts || PRODUCTS.length,
            razorpayConfigured: Boolean(data.stats?.razorpayConfigured),
          });
          setRecentOrders(Array.isArray(data.recentOrders) ? data.recentOrders : []);
        }
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center text-brand-gray-500">
        Loading store performance metrics...
      </div>
    );
  }

  const statCards = [
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, sub: `${stats.paidOrdersCount} paid / fulfilled orders`, icon: DollarSign, color: 'text-emerald-700', bg: 'bg-emerald-100' },
    { label: 'Total Orders', value: stats.totalOrders.toString(), sub: `${stats.pendingOrdersCount} active in queue`, icon: ShoppingBag, color: 'text-blue-700', bg: 'bg-blue-100' },
    { label: 'Registered Accounts', value: stats.totalUsers.toString(), sub: 'Active store members', icon: Users, color: 'text-amber-700', bg: 'bg-amber-100' },
    { label: 'Live Catalog Products', value: stats.totalProducts.toString(), sub: 'Retail & Wholesale active', icon: Package, color: 'text-purple-700', bg: 'bg-purple-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-black">Dashboard Overview</h2>
          <p className="text-brand-gray-500 text-sm">Real-time control center for JIYOO Premium Products (Retail &amp; Wholesale).</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>
            Payment Gateway: {stats.razorpayConfigured ? 'Razorpay Live + UPI QR Active' : 'Direct UPI QR + COD + WhatsApp Active'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map(stat => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-brand-gray-200 flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-gray-500">{stat.label}</p>
              <p className="text-2xl font-price-luxury font-extrabold text-brand-black mt-0.5 tabular-nums tracking-tight">{stat.value}</p>
              <p className="text-xs text-brand-gray-400 mt-1">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-brand-black">Recent Store Orders</h3>
            <p className="text-xs text-brand-gray-500">Latest 10 orders across Online UPI, Razorpay, Cash on Delivery, and WhatsApp Express</p>
          </div>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-sm text-brand-gray-500">
            No orders placed yet. New orders will appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-brand-gray-500 uppercase bg-brand-gray-50 border-b border-brand-gray-100">
                <tr>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-gray-100">
                {recentOrders.map((o) => {
                  const status = String(o.orderStatus || o.status || 'pending');
                  const isPaid = o.paymentStatus === 'paid';
                  return (
                    <tr key={o.id} className="hover:bg-brand-gray-50/70">
                      <td className="px-6 py-3 font-mono text-xs font-bold text-brand-black">{o.orderId || o.id}</td>
                      <td className="px-6 py-3">
                        <div className="font-medium text-brand-black">{o.shippingDetails?.name || 'Customer'}</div>
                        <div className="text-xs text-brand-gray-400">{o.shippingDetails?.phone || ''}</div>
                      </td>
                      <td className="px-6 py-3 text-xs font-medium text-brand-gray-700">{o.paymentMethod || 'Cash on Delivery'}</td>
                      <td className="px-6 py-3 font-price-luxury font-bold text-brand-black tabular-nums">₹{Number(o.grandTotal ?? o.amount ?? 0).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-brand-gray-500">
                        {o.createdAt ? (() => {
                          const d = new Date(o.createdAt);
                          return isNaN(d.getTime()) ? 'Recent' : format(d, 'MMM d, HH:mm');
                        })() : 'Recent'}
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
