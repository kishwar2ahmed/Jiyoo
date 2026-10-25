import { useState, useEffect } from 'react';
import { collection, getCountFromServer, getAggregateFromServer, sum, query, where } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { PRODUCTS } from '../../../constants/data';
import { Users, ShoppingBag, DollarSign, Package } from 'lucide-react';

export function DashboardTab() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 800);

    async function fetchStats() {
      try {
        // 1. Total Users
        let usersCount = 0;
        try {
          const usersSnap = await getCountFromServer(collection(db, 'users'));
          usersCount = usersSnap.data().count;
        } catch (e) {
          console.warn('Users count fetch skipped:', e);
        }

        // 2. Total Products
        let productsCount = PRODUCTS.length;
        try {
          const productsSnap = await getCountFromServer(collection(db, 'products'));
          if (productsSnap.data().count > 0) productsCount = productsSnap.data().count;
        } catch (e) {
          console.warn('Products count fetch skipped:', e);
        }

        // 3. Revenue & Total Orders
        let ordersCount = 0;
        try {
          const ordersSnap = await getCountFromServer(collection(db, 'orders'));
          ordersCount = ordersSnap.data().count;
        } catch (e) {
          console.warn('Orders count fetch skipped:', e);
        }

        let revenue = 0;
        try {
          const revQuery = query(collection(db, 'orders'), where('paymentStatus', '==', 'paid'));
          const aggSnapshot = await getAggregateFromServer(revQuery, {
            totalRevenue: sum('amount')
          });
          revenue = aggSnapshot.data().totalRevenue || 0;
        } catch (e) {
          console.warn('Revenue sum query skipped:', e);
        }

        if (isMounted) {
          setStats({
            totalUsers: usersCount,
            totalOrders: ordersCount,
            totalRevenue: revenue,
            totalProducts: productsCount,
          });
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
      clearTimeout(timer);
    };
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  const statCards = [
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Total Orders', value: stats.totalOrders.toString(), icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Total Users', value: stats.totalUsers.toString(), icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Products', value: stats.totalProducts.toString(), icon: Package, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-black">Dashboard Overview</h2>
        <p className="text-brand-gray-500">Welcome to your store's control center.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map(stat => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-brand-gray-200 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-brand-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-brand-black">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Could add recent orders table here */}
    </div>
  );
}
