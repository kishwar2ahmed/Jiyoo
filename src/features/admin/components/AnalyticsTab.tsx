import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { Order } from '../../../types';
import { format, subDays, isSameDay } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileSpreadsheet, FileCode } from 'lucide-react';
import { logAuditEvent } from '../../../services/auditService';

/**
 * Orders' `createdAt` may be a Firestore Timestamp (has `.seconds`) or an
 * ISO date string, depending on which server code path wrote it - both are
 * in active use. Only checking for `.seconds` silently drops every
 * string-dated order, which is every order created via /api/orders/create
 * (COD, WhatsApp, UPI) - i.e. most of them.
 */
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
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(500));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const orders: Order[] = [];
        snap.forEach(docSnap => {
          orders.push({ id: docSnap.id, ...docSnap.data() } as Order);
        });
        setRawOrders(orders);

        // Generate last 7 days data
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dayOrders = orders.filter(o => {
            const d = getOrderDate(o.createdAt);
            return d && isSameDay(d, date);
          });
          
          const revenue = dayOrders
            .filter(o => o.paymentStatus === 'paid')
            .reduce((sum, o) => sum + (o.amount || 0), 0);
            
          chartData.push({
            date: format(date, 'MMM dd'),
            revenue,
            ordersCount: dayOrders.length
          });
        }
        
        setData(chartData);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to analytics orders:', err);
        setLoading(false);
      }
    );
    return () => unsub();
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
