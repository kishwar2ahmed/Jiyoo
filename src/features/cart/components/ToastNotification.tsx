import { motion } from "motion/react";
import { Check } from "lucide-react";

interface ToastNotificationProps {
  item: {
    name: string;
    image?: string;
    price?: string;
    badge?: string;
  } | null;
  onClose: () => void;
}

export function ToastNotification({ item, onClose }: ToastNotificationProps) {
  if (!item) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.95 }}
      transition={{ type: "spring", damping: 24, stiffness: 280 }}
      className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-50 bg-[#1C1917] text-[#FAF9F5] px-4 py-3.5 rounded-2xl shadow-[0_24px_48px_-12px_rgba(28,25,23,0.5)] flex items-center gap-3.5 max-w-[340px] sm:max-w-sm border border-[#C5A880]/40"
    >
      <div className="relative w-12 h-12 rounded-xl bg-white border border-[#C5A880] flex items-center justify-center shrink-0 p-1 overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-contain rounded-lg"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.includes("/jiyoo.logo.jpeg")) {
                target.src = "/jiyoo.logo.jpeg";
              }
            }}
          />
        ) : (
          <svg
            className="w-6 h-6 stroke-[#1C1917] fill-none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"
            />
          </svg>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center border border-white">
          <Check className="w-2.5 h-2.5 stroke-[3]" />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#E5C99B] font-bold">
            Added to Bag
          </p>
          {item.price && (
            <span className="text-[10px] font-bold text-emerald-400">
              · {item.price}
            </span>
          )}
        </div>
        <p className="text-xs font-semibold truncate text-[#FAF9F5] mt-0.5">
          {item.name}
        </p>
      </div>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="text-[#A8A29E] hover:text-white transition-colors p-1 shrink-0 cursor-pointer"
      >
        <svg
          className="w-4 h-4 fill-none stroke-current"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </motion.div>
  );
}

