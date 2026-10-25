import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  MessageCircle, 
  Mail, 
  Phone, 
  Instagram, 
  Clock,
  Briefcase
} from "lucide-react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useModalBackButton } from "../hooks/useModalBackButton";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { settings } = useSettings();
  useModalBackButton(isOpen, onClose);

  const handleWhatsApp = (type: 'support' | 'sales') => {
    const number = settings.whatsappNumber?.replace(/\D/g, "") || "919739391891";
    let message = "Hi JIYOO, I need help with my order.";
    if (type === 'sales') {
      message = "Hi JIYOO, I'm interested in wholesale/bulk orders.";
    }
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#1C1917]/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-[#FAF9F5] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 sm:p-8 pb-6 border-b border-stone-200">
            <div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] tracking-wide">
                Get in Touch
              </h2>
              <p className="text-stone-500 text-sm mt-1">
                We're here to help. Choose the best way to reach us.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-[#1C1917] hover:bg-stone-200 transition-colors rounded-full cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
            
            {/* Customer Support Segment */}
            <div>
              <h3 className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-4">
                Customer Support
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* WhatsApp Support (Primary) */}
                <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col h-full">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <h4 className="text-stone-900 font-bold mb-1">Live Chat</h4>
                  <p className="text-stone-500 text-sm mb-4 flex-grow">
                    Perfect for quick questions, order tracking, and instant support.
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-stone-400 mb-4">
                    <Clock className="w-3.5 h-3.5" /> Average response: 5 mins
                  </div>
                  <button
                    onClick={() => handleWhatsApp('support')}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                  >
                    <MessageCircle className="w-4 h-4" /> Message on WhatsApp
                  </button>
                </div>

                {/* Email Support (Secondary) */}
                <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col h-full">
                  <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-900 flex items-center justify-center mb-4">
                    <Mail className="w-5 h-5" />
                  </div>
                  <h4 className="text-stone-900 font-bold mb-1">Email Support</h4>
                  <p className="text-stone-500 text-sm mb-4 flex-grow">
                    Best for detailed inquiries, feedback, and support tickets.
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-stone-400 mb-4">
                    <Clock className="w-3.5 h-3.5" /> Average response: 24 hrs
                  </div>
                  <a
                    href="mailto:support@jiyoo.in"
                    className="w-full py-3 bg-white border border-stone-300 hover:border-stone-400 text-stone-900 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Mail className="w-4 h-4" /> Email Us
                  </a>
                </div>
              </div>
            </div>

            {/* Sales / Bulk Segment */}
            <div>
              <h3 className="text-[11px] font-bold text-stone-900 uppercase tracking-widest mb-4">
                Business & Wholesale
              </h3>
              <div className="bg-[#1C1917] p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-[#292524] text-[#FAF9F5] flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[#FAF9F5] font-bold">Partner with JIYOO</h4>
                    <p className="text-stone-400 text-sm mt-0.5">
                      For bulk orders, corporate gifting, or wholesale inquiries.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleWhatsApp('sales')}
                  className="shrink-0 w-full sm:w-auto px-6 py-3 bg-[#FAF9F5] text-[#1C1917] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-white transition-all active:scale-[0.98]"
                >
                  Contact Sales
                </button>
              </div>
            </div>

            {/* General Info & Socials */}
            <div className="pt-8 border-t border-stone-200 grid sm:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-bold text-stone-900 mb-2">Direct Line</h4>
                <a href={`tel:${settings.whatsappNumber || "+919739391891"}`} className="text-stone-600 hover:text-emerald-600 transition-colors flex items-center gap-2 text-lg font-mono mb-1">
                  <Phone className="w-4 h-4" /> {settings.aboutUs?.contactPhone || settings.whatsappNumber || "+91 97393 91891"}
                </a>
                <p className="text-xs text-stone-400">Available Mon-Sat, 9 AM to 8 PM</p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-stone-900 mb-3">Connect on Socials</h4>
                <div className="flex items-center gap-3">
                  <a href="https://www.instagram.com/shamsjiyoo2026?utm_source=qr&igsh=MWh3YWlzOWV1N3Aweg==" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-[#1C1917] hover:border-[#1C1917] hover:shadow-md transition-all">
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a href={`https://wa.me/${(settings.whatsappNumber || "+919739391891").replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-[#1C1917] hover:border-[#1C1917] hover:shadow-md transition-all">
                    <MessageCircle className="w-4 h-4" />
                  </a>
                  <a href="mailto:support@jiyoo.in" className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-[#1C1917] hover:border-[#1C1917] hover:shadow-md transition-all">
                    <Mail className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
