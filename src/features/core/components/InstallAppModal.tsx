import { motion, AnimatePresence } from "motion/react";
import { X, Share, Plus, MoreVertical, Smartphone } from "lucide-react";

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
}

export function InstallAppModal({ isOpen, onClose, isIOS }: InstallAppModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 40 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative w-full sm:max-w-sm bg-brand-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl p-6 sm:p-7"
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 text-brand-gray-400 hover:text-brand-black transition-colors rounded-full hover:bg-brand-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-brand-black text-brand-white flex items-center justify-center mb-5">
              <Smartphone className="w-6 h-6" strokeWidth={1.5} />
            </div>

            <h2 className="text-xl font-serif text-brand-black mb-2">
              Install the JIYOO App
            </h2>

            {isIOS ? (
              <div className="space-y-3">
                <p className="text-sm text-brand-gray-600 leading-relaxed">
                  Add JIYOO to your Home Screen for a faster, full-screen experience:
                </p>
                <ol className="space-y-2.5 text-sm text-brand-gray-700">
                  <li className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-brand-gray-100 flex items-center justify-center shrink-0 text-xs font-semibold">1</span>
                    Tap the Share icon <Share className="w-3.5 h-3.5 inline mx-0.5" strokeWidth={1.5} /> in Safari's toolbar
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-brand-gray-100 flex items-center justify-center shrink-0 text-xs font-semibold">2</span>
                    Scroll down and tap <strong className="font-semibold">"Add to Home Screen"</strong> <Plus className="w-3.5 h-3.5 inline mx-0.5" strokeWidth={1.5} />
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-brand-gray-100 flex items-center justify-center shrink-0 text-xs font-semibold">3</span>
                    Tap <strong className="font-semibold">"Add"</strong> to confirm
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-brand-gray-600 leading-relaxed">
                  Add JIYOO to your Home Screen for a faster, full-screen experience:
                </p>
                <ol className="space-y-2.5 text-sm text-brand-gray-700">
                  <li className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-brand-gray-100 flex items-center justify-center shrink-0 text-xs font-semibold">1</span>
                    Open your browser's menu <MoreVertical className="w-3.5 h-3.5 inline mx-0.5" strokeWidth={1.5} />
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-brand-gray-100 flex items-center justify-center shrink-0 text-xs font-semibold">2</span>
                    Choose <strong className="font-semibold">"Install app"</strong> or <strong className="font-semibold">"Add to Home Screen"</strong>
                  </li>
                </ol>
                <p className="text-xs text-brand-gray-400 pt-1">
                  Not seeing that option? JIYOO works best in Chrome, Edge, or Safari.
                </p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full mt-6 h-12 bg-brand-gray-900 hover:bg-black text-brand-white rounded-xl font-semibold text-sm transition-colors"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
