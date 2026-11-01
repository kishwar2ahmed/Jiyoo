import { useState, useEffect } from 'react';
import { Order } from '../../../types';
import { format, subDays, isSameDay } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileSpreadsheet, FileCode } from 'lucide-react';
import { logAuditEvent } from '../../../services/auditService';
import { getAdminAuthHeaders } from '../../../utils/adminAuth';

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

export function AnalyticsTab() {
  const [data, setData] = useState<{ date: string; revenue: number; ordersCount: number }[]>([]);
  const [rawOrders, setRawOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadAnalytics() {
      try {
        const headers = await getAdminAuthHeaders();
        const res = await fetch('/api/admin/orders?status=all&pageSize=50', { headers });
        const body = await res.json().catch(() => ({}));
        const orders: Order[] = res.ok && body.success && Array.isArray(body.orders) ? body.orders : [];
        if (!isMounted) return;
        setRawOrders(orders);

        const chartData = [];
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dayOrders = orders.filter(o => {
            const d = getOrderDate(o.createdAt);
            return d && isSameDay(d, date);
          });
          
          const revenue = dayOrders
            .filter(o => o.paymentStatus === 'paid' || ['delivered', 'completed'].includes(String(o.orderStatus || o.status || '').toLowerCase()))
            .reduce((sum, o) => sum + Number(o.grandTotal ?? o.amount ?? 0), 0);
            
          chartData.push({
            date: format(date, 'MMM dd'),
            revenue,
            ordersCount: dayOrders.length
          });
        }
        
        setData(chartData);
      } catch (err) {
        console.error('Error loading analytics orders:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadAnalytics();
    return () => { isMounted = false; };
  }, []);

  const exportCSV = () => {
    if (!data.length) return;
    const headers = ["Date", "Revenue (INR)", "Orders Count"];
    const rows = data.map(d => [d.date, d.revenue, d.ordersCount]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `jiyoo_revenue_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logAuditEvent('EXPORT_ANALYTICS_CSV', 'SETTINGS', 'Exported 7-day revenue analytics as CSV');
  };

  const exportJSON = () => {
    if (!rawOrders.length) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rawOrders, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `jiyoo_full_orders_export_${format(new Date(), 'yyyy-MM-dd')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
    logAuditEvent('EXPORT_ANALYTICS_JSON', 'SETTINGS', 'Exported full raw orders data as JSON');
  };

  if (loading) return <div className="p-8 text-brand-gray-500">Loading analytics...</div>;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-black">Usage & Analytics Overview</h2>
          <p className="text-brand-gray-500">Revenue performance, volume metrics, and reporting exports.</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button 
            onClick={exportCSV}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </button>
          <button 
            onClick={exportJSON}
            className="bg-brand-gray-100 hover:bg-brand-gray-200 text-brand-black px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileCode className="w-4 h-4 text-brand-gray-600" />
            Export JSON
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-200 flex-1 min-h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dx={-10} tickFormatter={(val) => `₹${val}`} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              formatter={(value: any) => [`₹${value}`, 'Revenue']}
            />
            <Area type="monotone" dataKey="revenue" stroke="#D97706" fill="#FEF3C7" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
