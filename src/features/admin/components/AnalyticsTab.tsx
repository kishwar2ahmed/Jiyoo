import { useState, useEffect } from 'react';
import { Order } from '../../../types';
import { format, subDays, isSameDay } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileSpreadsheet, FileCode } from 'lucide-react';
import { logAuditEvent } from '../../../services/auditService';
import { getAdminAuthHeaders } from '../../../utils/adminAuth';
import { fetchJsonWithProxyRetry } from '../../../utils/apiFetch';

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

export function AnalyticsTab() {
  const [data, setData] = useState<{ date: string; revenue: number; ordersCount: number }[]>([]);
  const [rawOrders, setRawOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadAnalytics() {
      try {
        const headers = await getAdminAuthHeaders();
        const { res, data: body } = await fetchJsonWithProxyRetry('/api/admin/orders?status=all&pageSize=50', { headers });
        const orders: Order[] = res.ok && body?.success && Array.isArray(body.orders) ? body.orders : [];
        if (!isMounted) return;
        setRawOrders(orders);

        const chartData = [];
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dayOrders = orders.filter((o) => {
            const d = getOrderDate(o.createdAt);
            return d && isSameDay(d, date);
          });

          const revenue = dayOrders
            .filter(
              (o) =>
                o.paymentStatus === 'paid' ||
                ['delivered', 'completed'].includes(String(o.orderStatus || o.status || '').toLowerCase())
            )
            .reduce((sum, o) => sum + Number(o.grandTotal ?? o.amount ?? 0), 0);

          chartData.push({
            date: format(date, 'MMM dd'),
            revenue,
            ordersCount: dayOrders.length,
          });
        }

        setData(chartData);
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadAnalytics();
    return () => {
      isMounted = false;
    };
  }, []);

  const exportCsv = () => {
    const headers = ['OrderID,Customer,Phone,Amount,Status,PaymentMethod,CreatedAt'];
    const rows = rawOrders.map((o) => {
      const d = getOrderDate(o.createdAt);
      return [
        o.orderId || o.id,
        `"${(o.shippingDetails?.name || '').replace(/"/g, '""')}"`,
        o.shippingDetails?.phone || '',
        Number(o.grandTotal ?? o.amount ?? 0),
        o.orderStatus || o.status || '',
        o.paymentMethod || '',
        d ? d.toISOString() : '',
      ].join(',');
    });
    const blob = new Blob([headers.concat(rows).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jiyoo-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logAuditEvent('EXPORT_ANALYTICS_CSV', 'ORDERS', `Exported ${rawOrders.length} orders to CSV`);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(rawOrders, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jiyoo-orders-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logAuditEvent('EXPORT_ANALYTICS_JSON', 'ORDERS', `Exported ${rawOrders.length} orders to JSON`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-black">Usage &amp; Analytics</h2>
          <p className="text-brand-gray-500">7-day revenue trajectory and order volume reports.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={exportJson}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-black text-white text-sm font-medium hover:bg-brand-gray-900 transition-colors"
          >
            <FileCode className="w-4 h-4" />
            Export JSON
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-brand-gray-200 shadow-xs">
        <h3 className="text-lg font-bold text-brand-black mb-4">7-Day Revenue Trend (₹)</h3>
        {loading ? (
          <div className="h-72 flex items-center justify-center text-brand-gray-400">
            Loading chart data...
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E3DA" />
                <XAxis dataKey="date" stroke="#78716C" fontSize={12} />
                <YAxis stroke="#78716C" fontSize={12} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#047857"
                  fill="#10B981"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
