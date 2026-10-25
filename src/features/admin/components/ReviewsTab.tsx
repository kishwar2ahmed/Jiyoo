import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { Star, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../core/contexts/ToastContext';
import { useConfirm } from '../../core/contexts/ConfirmContext';

export function ReviewsTab() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const loaded: any[] = [];
        snap.forEach(d => {
          loaded.push({ id: d.id, ...d.data() });
        });
        setReviews(loaded);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to reviews:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete review?", message: "Are you sure you want to delete this review?" }))) return;
    try {
      await deleteDoc(doc(db, 'reviews', id));
    } catch (err) {
      showToast('Error deleting review', 'error');
    }
  };

  const filtered = reviews.filter(r => 
    r.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.productId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-brand-black">Reviews & Ratings</h2>
          <p className="text-brand-gray-500">Monitor and respond to customer product reviews in real time.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-200 overflow-hidden">
        <div className="p-4 border-b border-brand-gray-200 flex justify-between items-center">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
            <input 
              type="text" 
              placeholder="Search reviews by user or text..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-brand-gray-50 border border-brand-gray-200 rounded-xl focus:outline-none focus:border-emerald-600 text-sm w-full"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-brand-gray-500">Loading reviews...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-brand-gray-500">
            <Star className="w-12 h-12 mx-auto text-brand-gray-300 mb-4" />
            <p className="font-medium text-brand-black">No reviews found</p>
            <p className="text-sm">When customers leave reviews, they will appear here live.</p>
          </div>
        ) : (
          <div className="divide-y divide-brand-gray-100">
            {filtered.map(r => (
              <div key={r.id} className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start gap-4 hover:bg-brand-gray-50/50 transition-colors">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-brand-black">{r.userName || 'Anonymous User'}</span>
                    <div className="flex items-center text-amber-500 text-xs">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < (r.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-brand-gray-400">
                      {r.createdAt?.seconds ? format(new Date(r.createdAt.seconds * 1000), 'MMM d, yyyy') : 'Recent'}
                    </span>
                  </div>
                  <p className="text-sm text-brand-gray-700">{r.comment || r.review}</p>
                </div>
                <button 
                  onClick={() => handleDelete(r.id)}
                  className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                  title="Delete Review"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
