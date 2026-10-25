
import { useState } from 'react';
import { Send, BellRing } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { getAuth } from 'firebase/auth';

export function MarketingTab() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    setSending(true);
    setStatus(null);
    try {
      // Get all users to find their FCM tokens
      const usersSnap = await getDocs(collection(db, 'users'));
      const tokens: string[] = [];
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
          tokens.push(...data.fcmTokens);
        }
      });

      if (tokens.length === 0) {
        setStatus({ type: 'error', message: 'No registered devices found to send notifications.' });
        setSending(false);
        return;
      }

      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          tokens,
          title,
          body
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'success', message: `Notification sent successfully to ${tokens.length} devices.` });
        setTitle('');
        setBody('');
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to send notification.' });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'An error occurred while sending.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-brand-black">Marketing & Content</h2>
          <p className="text-brand-gray-500">Send promotional notifications to users.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-gray-200 overflow-hidden p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-brand-black">Push Notifications</h3>
            <p className="text-sm text-brand-gray-500">Send a message to all registered devices.</p>
          </div>
        </div>

        {status && (
          <div className={`p-4 rounded-xl mb-6 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSendNotification} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1">Notification Title</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-brand-gray-50 border border-brand-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              placeholder="e.g. Flash Sale! 50% Off"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1">Message Body</label>
            <textarea 
              required
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-4 py-2 bg-brand-gray-50 border border-brand-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              placeholder="Check out our new arrivals..."
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={sending}
              className="flex items-center justify-center gap-2 w-full sm:w-auto bg-brand-primary text-brand-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
