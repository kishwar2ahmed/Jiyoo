import { useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { Category } from '../../../types';
import { CATEGORIES } from '../../../constants/data';
import { Plus, Trash2, Snowflake, Sun } from 'lucide-react';
import { useToast } from '../../core/contexts/ToastContext';
import { useConfirm } from '../../core/contexts/ConfirmContext';

export function CategoriesTab() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCatId, setNewCatId] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      const loaded: Category[] = [];
      snap.forEach(doc => {
        loaded.push({ id: doc.id, ...doc.data() } as Category);
      });

      const catMap = new Map<string, Category>();
      CATEGORIES.forEach(c => catMap.set(c.id, c));
      loaded.forEach(c => {
        if ((c as any).isDeleted) {
          catMap.delete(c.id);
        } else {
          catMap.set(c.id, c);
        }
      });
      setCategories(Array.from(catMap.values()));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setCategories(CATEGORIES);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatId || !newCatLabel) return;
    const cat = { id: newCatId.toLowerCase().trim(), label: newCatLabel.trim() };
    const previousCats = [...categories];
    setCategories([...categories.filter(c => c.id !== cat.id), cat]);
    setNewCatId('');
    setNewCatLabel('');
    try {
      await Promise.race([
        setDoc(doc(db, 'categories', cat.id), { ...cat, isDeleted: false }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000))
      ]);
    } catch (err) {
      console.error(err);
      setCategories(previousCats);
      showToast('Failed to add category', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (await confirm({ title: "Delete category?", message: "Are you sure you want to delete this category?" })) {
      const previousCats = [...categories];
      setCategories(categories.filter(c => c.id !== id));
      try {
        await Promise.race([
        setDoc(doc(db, 'categories', id), { isDeleted: true }, { merge: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000))
      ]);
      } catch (err) {
        console.error("Error deleting category:", err);
        setCategories(previousCats);
        showToast('Failed to delete category', 'error');
      }
    }
  };

  const handleToggleFreeze = async (cat: Category) => {
    const nextFrozen = !cat.isFrozen;
    const previousCats = [...categories];
    setCategories(categories.map(c => c.id === cat.id ? { ...c, isFrozen: nextFrozen } : c));
    try {
      await Promise.race([
        setDoc(doc(db, 'categories', cat.id), { isFrozen: nextFrozen }, { merge: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000))
      ]);
      showToast(nextFrozen ? `"${cat.label}" is now frozen and hidden from shoppers.` : `"${cat.label}" is unfrozen and visible again.`, 'success');
    } catch (err) {
      console.error('Error toggling category freeze:', err);
      setCategories(previousCats);
      showToast('Failed to update category', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-black">Categories</h2>
        <p className="text-brand-gray-500">Manage product categories.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-200">
        <form onSubmit={handleAdd} className="flex gap-4 items-end mb-8">
          <div className="flex-1">
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">Category ID (e.g., chicken)</label>
            <input 
              required type="text" value={newCatId} onChange={e => setNewCatId(e.target.value)}
              className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">Display Label (e.g., Chicken)</label>
            <input 
              required type="text" value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)}
              className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>
          <button type="submit" className="bg-brand-black text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-gray-900 transition-colors flex items-center gap-2 h-[38px]">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>

        {loading ? (
          <div className="text-center text-brand-gray-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map(c => (
              <div key={c.id} className={`border rounded-lg p-4 flex justify-between items-center ${c.isFrozen ? 'border-sky-200 bg-sky-50' : 'border-brand-gray-200 bg-brand-gray-50'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-brand-black">{c.label}</h4>
                    {c.isFrozen && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">
                        <Snowflake className="w-3 h-3" /> Frozen
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-brand-gray-500">ID: {c.id}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleFreeze(c)}
                    title={c.isFrozen ? 'Unfreeze category' : 'Freeze category'}
                    className={c.isFrozen ? 'text-amber-600 hover:bg-amber-50 p-2 rounded-lg transition-colors' : 'text-sky-600 hover:bg-sky-50 p-2 rounded-lg transition-colors'}
                  >
                    {c.isFrozen ? <Sun className="w-4 h-4" /> : <Snowflake className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
