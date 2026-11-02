import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    let timer: NodeJS.Timeout | undefined;

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      timer = setTimeout(() => setShowReconnected(false), 4000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-900/95 text-amber-100 backdrop-blur-md px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2 shadow-md border-b border-amber-700/50"
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>Offline Mode — Browsing cached products & catalog assets</span>
        </motion.div>
      )}

      {showReconnected && !isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-emerald-900/95 text-emerald-100 backdrop-blur-md px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2 shadow-md border-b border-emerald-700/50"
        >
          <Wifi className="w-3.5 h-3.5 text-emerald-300" />
          <span>Connection restored — Live catalog synchronized</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
