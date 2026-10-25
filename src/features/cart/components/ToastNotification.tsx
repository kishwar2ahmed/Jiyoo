import { motion } from "motion/react";

interface ToastNotificationProps {
  item: { name: string } | null;
  onClose: () => void;
}

export function ToastNotification({ item, onClose }: ToastNotificationProps) {
  if (!item) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 250 }}
      className="fixed bottom-6 right-6 z-50 bg-brand-gray-900 text-brand-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm border border-brand-gray-800"
    >
      <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
        <svg className="w-6 h-6 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-brand-gray-500 font-medium">
          Added to Bag
        </p>
        <p className="text-xs font-semibold truncate text-brand-white mt-0.5">
          {item.name}
        </p>
      </div>
      <button
        onClick={onClose}
        className="text-brand-gray-500 hover:text-brand-white transition-colors p-1 shrink-0"
      >
        <svg className="w-4 h-4 fill-none stroke-current" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
}
