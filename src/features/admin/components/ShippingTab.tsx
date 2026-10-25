
import { useState } from 'react';
import { Truck, Save, CheckCircle2, ShieldCheck, Clock, DollarSign } from 'lucide-react';
import { useSettings } from '../../../contexts/SettingsContext';
import { useToast } from '../../core/contexts/ToastContext';

export function ShippingTab() {
  const { showToast } = useToast();
  const { settings, updateSettings } = useSettings();
  const [deliveryFee, setDeliveryFee] = useState<number>(typeof settings.deliveryFee === 'number' ? settings.deliveryFee : 40);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(settings.freeDeliveryThreshold || 0);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState<string>(settings.estimatedDeliveryTime || '30 - 60 mins');
  const [minOrderAmount, setMinOrderAmount] = useState<number>(settings.minOrderAmount || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateSettings({
        deliveryFee: Number(deliveryFee) || 0,
        freeDeliveryThreshold: Number(freeDeliveryThreshold) || 0,
        estimatedDeliveryTime,
        minOrderAmount: Number(minOrderAmount) || 0,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update shipping settings', err);
      showToast('Error updating shipping settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-brand-black">Shipping & Delivery Rates</h2>
          <p className="text-brand-gray-500">Configure global delivery fees, free shipping thresholds, and estimated delivery times.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-200 overflow-hidden p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-xl text-sm">
          <Truck className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold">Live Delivery Fee System</p>
            <p className="text-xs text-emerald-700">Changes saved here update instantly for all customers on the checkout and cart drawer.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-brand-gray-50 p-5 rounded-xl border border-brand-gray-200 space-y-3">
              <div className="flex items-center gap-2 text-brand-black font-semibold text-sm">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Standard Delivery Fee (₹)
              </div>
              <input 
                type="number" 
                min="0" 
                value={deliveryFee} 
                onChange={e => setDeliveryFee(Number(e.target.value))}
                className="w-full bg-white border border-brand-gray-300 rounded-lg px-4 py-2.5 text-base font-bold text-emerald-700 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                placeholder="40"
              />
              <p className="text-xs text-brand-gray-500">
                This flat fee will be automatically added to customer carts at checkout (Current: ₹{deliveryFee}).
              </p>
            </div>

            <div className="bg-brand-gray-50 p-5 rounded-xl border border-brand-gray-200 space-y-3">
              <div className="flex items-center gap-2 text-brand-black font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Free Shipping Threshold (₹)
              </div>
              <input 
                type="number" 
                min="0" 
                value={freeDeliveryThreshold} 
                onChange={e => setFreeDeliveryThreshold(Number(e.target.value))}
                className="w-full bg-white border border-brand-gray-300 rounded-lg px-4 py-2.5 text-base font-bold text-gray-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                placeholder="0"
              />
              <p className="text-xs text-brand-gray-500">
                Orders above this amount get free delivery. Enter 0 if delivery fee (₹{deliveryFee}) applies to all orders.
              </p>
            </div>

            <div className="bg-brand-gray-50 p-5 rounded-xl border border-brand-gray-200 space-y-3">
              <div className="flex items-center gap-2 text-brand-black font-semibold text-sm">
                <Clock className="w-4 h-4 text-emerald-600" /> Estimated Delivery Time
              </div>
              <input 
                type="text" 
                value={estimatedDeliveryTime} 
                onChange={e => setEstimatedDeliveryTime(e.target.value)}
                className="w-full bg-white border border-brand-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                placeholder="30 - 60 mins"
              />
              <p className="text-xs text-brand-gray-500">
                Shown to users on product detail cards and checkout summaries.
              </p>
            </div>

            <div className="bg-brand-gray-50 p-5 rounded-xl border border-brand-gray-200 space-y-3">
              <div className="flex items-center gap-2 text-brand-black font-semibold text-sm">
                <Truck className="w-4 h-4 text-emerald-600" /> Minimum Order Value (₹)
              </div>
              <input 
                type="number" 
                min="0" 
                value={minOrderAmount} 
                onChange={e => setMinOrderAmount(Number(e.target.value))}
                className="w-full bg-white border border-brand-gray-300 rounded-lg px-4 py-2.5 text-base font-bold text-gray-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                placeholder="0"
              />
              <p className="text-xs text-brand-gray-500">
                Minimum order subtotal required to proceed to checkout (0 = no minimum).
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-brand-gray-100 flex items-center justify-between">
            <button 
              type="submit" 
              disabled={isSaving}
              className="bg-brand-black text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-gray-900 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Shipping Settings...' : 'Save Delivery Configuration'}
            </button>

            {saveSuccess && (
              <span className="text-emerald-600 text-sm font-medium flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" /> Delivery rates updated successfully!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
