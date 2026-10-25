import { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Search, CheckCircle2 } from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useToast } from '../../core/contexts/ToastContext';
import { useConfirm } from '../../core/contexts/ConfirmContext';

interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  description: string;
  minOrderValue?: number;
  isActive: boolean;
  maxUses?: number;
  usedCount?: number;
  perUserLimit?: number;
}

export function PromotionsTab() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [description, setDescription] = useState('');
  const [minOrderValue, setMinOrderValue] = useState<number>(0);
  const [maxUses, setMaxUses] = useState<string>('');
  const [perUserLimit, setPerUserLimit] = useState<string>('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'coupons'), (snap) => {
      const list: Coupon[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Coupon);
      });
      setCoupons(list);
      setLoading(false);
    }, (err) => {
      console.warn("Coupons snapshot error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !discountValue) return;

    const cleanCode = code.trim().toUpperCase();
    const newCoupon: Coupon = {
      id: cleanCode,
      code: cleanCode,
      discountType,
      discountValue: Number(discountValue),
      description: description.trim() || `${discountValue}${discountType === 'percentage' ? '%' : '₹'} off`,
      minOrderValue: Number(minOrderValue) || 0,
      isActive: true,
      usedCount: 0,
    };
    if (maxUses.trim() && Number(maxUses) > 0) {
      newCoupon.maxUses = Number(maxUses);
    }
    if (perUserLimit.trim() && Number(perUserLimit) > 0) {
      newCoupon.perUserLimit = Number(perUserLimit);
    }

    try {
      await setDoc(doc(db, 'coupons', cleanCode), newCoupon);
      setIsModalOpen(false);
      setCode('');
      setDescription('');
      setDiscountValue(10);
      setMinOrderValue(0);
      setMaxUses('');
      setPerUserLimit('');
    } catch (err) {
      console.error("Error creating coupon:", err);
      showToast("Failed to save promotion coupon.", "error");
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (await confirm({ title: "Delete coupon?", message: `Delete coupon code ${id}?` })) {
      try {
        await deleteDoc(doc(db, 'coupons', id));
      } catch (err) {
        console.error("Error deleting coupon:", err);
      }
    }
  };

  const handleToggleActive = async (c: Coupon) => {
    try {
      await setDoc(doc(db, 'coupons', c.id), { ...c, isActive: !c.isActive });
    } catch (err) {
      console.error("Error toggling coupon status:", err);
      showToast("Failed to update coupon status.", "error");
    }
  };

  const filtered = coupons.filter(c => c.code.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-black">Promotions & Coupons</h2>
          <p className="text-brand-gray-500 text-sm">Manage discount codes and special offers for your store.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-brand-black text-brand-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-gray-900 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Create Promotion
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-200 overflow-hidden">
        <div className="p-4 border-b border-brand-gray-200 flex justify-between items-center">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search promotions..." 
              className="w-full pl-9 pr-4 py-2 text-sm bg-brand-gray-50 border border-brand-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-black"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-brand-gray-500">Loading coupons...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-brand-gray-500">
            <Tag className="w-12 h-12 mx-auto text-brand-gray-300 mb-3" />
            <p className="font-medium text-brand-black">No promotions active</p>
            <p className="text-sm text-brand-gray-400 max-w-xs mx-auto mt-1">Create discount codes like WELCOME10 or FLAT50 to boost sales.</p>
          </div>
        ) : (
          <div className="divide-y divide-brand-gray-100">
            {filtered.map(c => (
              <div key={c.id} className="p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4 hover:bg-brand-gray-50/50 transition-colors">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 font-bold shrink-0 mt-0.5">
                    {c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-brand-black bg-brand-gray-100 px-2.5 py-0.5 rounded text-sm border border-brand-gray-200">{c.code}</span>
                      <button
                        onClick={() => handleToggleActive(c)}
                        title="Click to toggle"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                          c.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-brand-gray-200 text-brand-gray-600 hover:bg-brand-gray-300'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" /> {c.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                    <p className="text-xs text-brand-gray-600 mt-1">{c.description}</p>
                    {c.minOrderValue ? (
                      <p className="text-[11px] text-brand-gray-400 mt-0.5">Min Order: ₹{c.minOrderValue}</p>
                    ) : null}
                    {c.maxUses ? (
                      <p className="text-[11px] text-brand-gray-400 mt-0.5">Used: {c.usedCount || 0}/{c.maxUses}</p>
                    ) : null}
                    {c.perUserLimit ? (
                      <p className="text-[11px] text-brand-gray-400 mt-0.5">Limit: {c.perUserLimit} per customer</p>
                    ) : null}
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteCoupon(c.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                  title="Delete Promotion"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-brand-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-brand-gray-100 pb-3">
              <h3 className="font-bold text-lg text-brand-black">Create Discount Coupon</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black">✕</button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-gray-700 mb-1">Coupon Code *</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. WELCOME10"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm uppercase font-mono font-bold outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-gray-700 mb-1">Type</label>
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as any)}
                    className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-gray-700 mb-1">Discount Value *</label>
                  <input 
                    required
                    type="number"
                    min="1"
                    value={discountValue}
                    onChange={e => setDiscountValue(Number(e.target.value))}
                    className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-gray-700 mb-1">Min Order Amount (₹)</label>
                <input 
                  type="number"
                  min="0"
                  value={minOrderValue}
                  onChange={e => setMinOrderValue(Number(e.target.value))}
                  placeholder="0 for no minimum"
                  className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-gray-700 mb-1">Max Total Uses</label>
                  <input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={e => setMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-gray-700 mb-1">Max Uses Per Customer</label>
                  <input
                    type="number"
                    min="1"
                    value={perUserLimit}
                    onChange={e => setPerUserLimit(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
              <p className="text-[11px] text-brand-gray-400 -mt-2">Leave blank for unlimited. Per-customer limit only applies to signed-in customers.</p>

              <div>
                <label className="block text-xs font-semibold text-brand-gray-700 mb-1">Description</label>
                <input 
                  type="text"
                  placeholder="e.g. Get 10% off on your order"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-brand-gray-600 hover:bg-brand-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-5 py-2 text-xs font-semibold bg-brand-black text-white rounded-lg hover:bg-brand-gray-900 shadow-xs">Save Coupon</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
