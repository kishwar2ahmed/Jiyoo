import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, X, Lock, LayoutDashboard, Package, ShoppingCart, Users, Tags, Settings, BarChart, Tag, Star, Truck, Megaphone, ShieldAlert, MapPin } from 'lucide-react';
import { useCart } from '../../../contexts/CartContext';

import { lazy, Suspense } from 'react';

import { DashboardTab } from './DashboardTab';
import { ProductsTab } from './ProductsTab';
import { OrdersTab } from './OrdersTab';
import { PaymentsTab } from './PaymentsTab';
import { UsersTab } from './UsersTab';
import { CategoriesTab } from './CategoriesTab';
import { SettingsTab } from './SettingsTab';

const AnalyticsTab = lazy(() => import('./AnalyticsTab').then(m => ({ default: m.AnalyticsTab })));
const PromotionsTab = lazy(() => import('./PromotionsTab').then(m => ({ default: m.PromotionsTab })));
const ReviewsTab = lazy(() => import('./ReviewsTab').then(m => ({ default: m.ReviewsTab })));
const ShippingTab = lazy(() => import('./ShippingTab').then(m => ({ default: m.ShippingTab })));
const DeliveryManagementTab = lazy(() => import('./DeliveryManagementTab').then(m => ({ default: m.DeliveryManagementTab })));
const MarketingTab = lazy(() => import('./MarketingTab').then(m => ({ default: m.MarketingTab })));
const AuditLogTab = lazy(() => import('./AuditLogTab').then(m => ({ default: m.AuditLogTab })));

type Tab = 'dashboard' | 'products' | 'orders' | 'payments' | 'users' | 'categories' | 'analytics' | 'promotions' | 'reviews' | 'messages' | 'shipping' | 'delivery' | 'marketing' | 'audit' | 'settings';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { user, isAuthLoading } = useCart();

  if (isAuthLoading) return (
    <div className="fixed inset-0 z-[100] bg-brand-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold"></div>
    </div>
  );

  // Authorization boundary: this is a UI convenience only. The real
  // boundary is enforced independently by firestore.rules, storage.rules,
  // and requireAdmin() on every server endpoint -- all three check the
  // server-controlled Firebase Auth custom claim, never this flag alone.
  if (!user || user.admin !== true) {
    return (
      <div className="fixed inset-0 z-[100] bg-brand-white flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-brand-black mb-2">Access Denied</h2>
        <p className="text-brand-gray-500 mb-6 text-center max-w-sm">
          You do not have permission to access the admin panel. Please sign in with an administrator account.
        </p>
        <button 
          onClick={onClose}
          className="bg-brand-black text-brand-white px-6 py-2 rounded-lg font-medium hover:bg-brand-gray-900 transition-colors"
        >
          Return to Store
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'payments', label: 'Razorpay & Payments', icon: CreditCard },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'analytics', label: 'Usage & Analytics', icon: BarChart },
    { id: 'audit', label: 'Audit Log', icon: ShieldAlert },
    { id: 'promotions', label: 'Promotions', icon: Tag },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'delivery', label: 'Delivery Mgmt', icon: MapPin },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] bg-brand-gray-50 flex overflow-hidden">
      
      {/* Sidebar - Desktop */}
      <div className="w-64 bg-brand-white border-r border-brand-gray-200 flex flex-col hidden md:flex">

        <div className="p-6 border-b border-brand-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-serif font-bold text-brand-black">JIYOO Admin</h1>
            <p className="text-xs text-brand-gray-500">Control Panel</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-brand-gray-900 text-brand-white' 
                    : 'text-brand-gray-600 hover:bg-brand-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-brand-gray-200">
          <button 
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-gray-100 hover:bg-brand-gray-200 text-brand-black rounded-lg text-sm font-medium transition-colors"
          >
            <X className="w-4 h-4" /> Exit Admin
          </button>
        </div>
      </div>

      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
        {/* Mobile Header & Tabs */}
        <div className="md:hidden bg-brand-white border-b border-brand-gray-200 p-4 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-serif font-bold text-brand-black">JIYOO Admin</h2>
          <button onClick={onClose} className="p-2 hover:bg-brand-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-brand-gray-600" />
          </button>
        </div>
        <div className="md:hidden bg-brand-white border-b border-brand-gray-200 shrink-0 overflow-x-auto scrollbar-hide">
          <div className="flex flex-wrap p-2 gap-2 justify-center">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button 
                  key={t.id}
                  onClick={() => setActiveTab(t.id as Tab)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-brand-gray-900 text-brand-white' : 'bg-brand-gray-50 text-brand-gray-600 hover:bg-brand-gray-100'}`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-[calc(2rem+env(safe-area-inset-bottom))] relative custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div></div>}>
                {activeTab === 'dashboard' && <DashboardTab />}
                {activeTab === 'products' && <ProductsTab />}
                {activeTab === 'orders' && <OrdersTab />}
                {activeTab === 'payments' && <PaymentsTab />}
                {activeTab === 'users' && <UsersTab />}
                {activeTab === 'categories' && <CategoriesTab />}
                {activeTab === 'analytics' && <AnalyticsTab />}
                {activeTab === 'audit' && <AuditLogTab />}
                {activeTab === 'promotions' && <PromotionsTab />}
                {activeTab === 'reviews' && <ReviewsTab />}
                {activeTab === 'shipping' && <ShippingTab />}
                {activeTab === 'delivery' && <DeliveryManagementTab />}
                {activeTab === 'marketing' && <MarketingTab />}
                {activeTab === 'settings' && <SettingsTab />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
