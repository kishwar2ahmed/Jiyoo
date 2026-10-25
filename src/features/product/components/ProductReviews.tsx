import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../../services/firebase';
import { useCart } from '../../../contexts/CartContext';
import { Star, MessageCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../../core/contexts/ToastContext';

interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userPicture?: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export function ProductReviews({ productId }: { productId: string | number }) {
  const { user } = useCart();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'reviews'), where('productId', '==', String(productId)));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const fetchedReviews = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        // Client-side sort to avoid requiring composite indexes
        fetchedReviews.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        setReviews(fetchedReviews);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to fetch reviews:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!comment.trim()) return;
    
    setIsSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Please log in again to submit a review.');
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: String(productId), rating, comment: comment.trim() })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to submit review');
      setReviews(prev => [data.review as Review, ...prev]);
      setComment('');
      setRating(5);
      setShowForm(false);
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-brand-gray-300" />
      </div>
    );
  }

  const hasReviewed = user ? reviews.some(r => r.userId === user.id) : false;

  return (
    <div className="space-y-6 pb-8">
      {reviews.length > 0 ? (
        <div className="flex items-center justify-between mb-6 border-b border-brand-gray-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-brand-black">{averageRating}</div>
            <div>
              <div className="flex items-center gap-1 text-yellow-500 mb-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star key={star} className={`w-4 h-4 ${star <= Number(averageRating) ? 'fill-current' : 'text-brand-gray-200'}`} />
                ))}
              </div>
              <div className="text-xs text-brand-gray-500">Based on {reviews.length} review{reviews.length !== 1 && 's'}</div>
            </div>
          </div>
          {user && !hasReviewed && !showForm && (
            <button 
              onClick={() => setShowForm(true)}
              className="text-xs font-semibold px-4 py-2 bg-brand-black text-white rounded-lg hover:bg-brand-gray-900 transition-colors"
            >
              Write Review
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-10 bg-brand-gray-50 rounded-2xl border border-brand-gray-100 mb-6">
          <MessageCircle className="w-8 h-8 text-brand-gray-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-brand-black mb-1">No written reviews yet</h4>
          <p className="text-xs text-brand-gray-500 mb-4 max-w-[200px] mx-auto">Be the first to share your experience with this product.</p>
          {user ? (
            !showForm && (
              <button 
                onClick={() => setShowForm(true)}
                className="text-xs font-semibold px-4 py-2 bg-brand-white border border-brand-gray-200 text-brand-black rounded-lg hover:bg-brand-gray-50 transition-colors"
              >
                Write a Review
              </button>
            )
          ) : (
            <p className="text-xs text-brand-gray-400">Sign in to leave a review</p>
          )}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <form onSubmit={handleSubmit} className="bg-brand-gray-50 p-5 rounded-2xl border border-brand-gray-100">
              <h4 className="text-sm font-semibold text-brand-black mb-4">Write your review</h4>
              
              <div className="mb-4">
                <label className="block text-xs font-medium text-brand-gray-500 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star className={`w-6 h-6 ${star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-brand-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="comment" className="block text-xs font-medium text-brand-gray-500 mb-2">Review</label>
                <textarea
                  id="comment"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your thoughts about this product..."
                  className="w-full bg-white border border-brand-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-black resize-none"
                  required
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-xs font-medium text-brand-gray-500 hover:text-brand-black transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !comment.trim()}
                  className="px-4 py-2 bg-brand-black text-white text-xs font-semibold rounded-lg hover:bg-brand-gray-900 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  Submit Review
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="pb-4 border-b border-brand-gray-100 last:border-0">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                {review.userPicture ? (
                  <img src={review.userPicture} alt={review.userName} className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-brand-gray-200 flex items-center justify-center text-[10px] font-bold text-brand-gray-500">
                    {review.userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-brand-black">{review.userName}</p>
                  <p className="text-[10px] text-brand-gray-400">
                    {review.createdAt?.seconds 
                      ? new Date(review.createdAt.seconds * 1000).toLocaleDateString()
                      : 'Just now'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-brand-gray-200'}`} />
                ))}
              </div>
            </div>
            <p className="text-sm text-brand-gray-600 mt-1 pl-8">
              {review.comment}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
