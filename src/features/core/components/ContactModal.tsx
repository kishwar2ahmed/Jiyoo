import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Clock,
  Briefcase,
  MapPin,
  ShieldCheck
} from "lucide-react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useModalBackButton } from "../hooks/useModalBackButton";
import {
  WhatsAppIcon,
  InstagramIcon,
  PhoneCallIcon,
  EmailEnvelopeIcon,
} from "./SocialIcons";
import { SEO } from "../../../components/SEO";
import {
  generateOrganizationSchema,
  generateBreadcrumbSchema,
} from "../../../utils/schemaGenerator";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { settings } = useSettings();
  useModalBackButton(isOpen, onClose);

  const whatsappHref = (type: 'support' | 'sales') => {
    const number = settings.whatsappNumber?.replace(/\D/g, "") || "919739391891";
    const message =
      type === 'sales'
        ? "Hi JIYOO, I'm interested in wholesale/bulk orders."
        : "Hi JIYOO, I need help with my order.";
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <SEO
          title="Contact Us — Customer Support & Registered Office in Bengaluru | JIYOO"
          description="Contact JIYOO (Marketed by SHAM'S™) via WhatsApp (+91 97393 91891), phone, or email (shamsjiyoo@gmail.com). Registered Indian Office: Thanisandra Main Road, Nagavara, Bengaluru, Karnataka – 560045."
          canonicalPath="/?modal=contact"
          schema={[
            generateOrganizationSchema(),
            generateBreadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Contact Us", url: "/?modal=contact" },
            ]),
          ]}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#1C1917]/70"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
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
              <h3 className="text-xs font-semibold text-emerald-800 mb-3">
                Customer Support
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* WhatsApp Support (Primary) */}
                <div className="bg-stone-50/70 p-5 rounded-xl border border-stone-200 shadow-xs transition-shadow flex flex-col h-full">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#25D366] flex items-center justify-center mb-4">
                    <WhatsAppIcon className="w-5 h-5" />
                  </div>
                  <h4 className="text-stone-900 font-bold mb-1">WhatsApp Concierge</h4>
                  <p className="text-stone-500 text-xs sm:text-sm mb-4 flex-grow">
                    Perfect for quick questions, order tracking, and instant support.
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-4">
                    <Clock className="w-3.5 h-3.5" /> Avg response: 5 mins
                  </div>
                  <a
                    href={whatsappHref('support')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                  >
                    <WhatsAppIcon className="w-4 h-4" /> WhatsApp Chat
                  </a>
                </div>

                {/* Instagram Support */}
                <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col h-full">
                  <div className="w-10 h-10 rounded-full bg-pink-50 text-[#E1306C] flex items-center justify-center mb-4">
                    <InstagramIcon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-stone-900 font-bold">Instagram Support</h4>
                    <span className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 text-[10px] font-bold uppercase tracking-wider">
                      Official
                    </span>
                  </div>
                  <p className="text-stone-500 text-xs mb-3 flex-grow">
                    DM us on Instagram for customer support, order queries &amp; fresh arrival updates.
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-stone-400 mb-4 mt-auto">
                    <Clock className="w-3.5 h-3.5" /> Direct DM Support
                  </div>
                  <a
                    href="https://www.instagram.com/shamsjiyoo2026?exln=aG43cXdnZmgwZDRu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm"
                  >
                    <InstagramIcon className="w-4 h-4" /> Message on Instagram
                  </a>
                </div>

                {/* Email Support (Primary: shamsjiyoo@gmail.com) */}
                <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col h-full">
                  <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-900 flex items-center justify-center mb-4">
                    <EmailEnvelopeIcon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-stone-900 font-bold">Email Support</h4>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                      Primary
                    </span>
                  </div>
                  <p className="text-stone-900 font-mono text-xs font-semibold mb-0.5 truncate">
                    shamsjiyoo@gmail.com
                  </p>
                  <p className="text-stone-400 font-mono text-[11px] mb-3 truncate">
                    Backup: jiyooshams@gmail.com
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-stone-400 mb-4 mt-auto">
                    <Clock className="w-3.5 h-3.5" /> Avg response: 24 hrs
                  </div>
                  <a
                    href="mailto:shamsjiyoo@gmail.com?cc=jiyooshams@gmail.com"
                    className="w-full py-3 bg-[#1C1917] hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm"
                  >
                    <EmailEnvelopeIcon className="w-4 h-4" /> Email Us
                  </a>
                </div>
              </div>
            </div>

            {/* Sales / Bulk Segment */}
            <div>
              <h3 className="text-[11px] font-bold text-stone-900 uppercase tracking-widest mb-4">
                Business &amp; Wholesale
              </h3>
              <div className="bg-[#1C1917] p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-[#292524] text-[#FAF9F5] flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[#FAF9F5] font-bold">Partner with JIYOO</h4>
                    <p className="text-stone-400 text-sm mt-0.5">
                      For bulk orders, hotel/restaurant supply, or wholesale inquiries.
                    </p>
                  </div>
                </div>
                <a
                  href={whatsappHref('sales')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-full sm:w-auto px-6 py-3 bg-[#FAF9F5] text-[#1C1917] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-white transition-all active:scale-[0.98] text-center"
                >
                  Contact Sales
                </a>
              </div>
            </div>

            {/* General Info & Socials */}
            <div className="pt-8 border-t border-stone-200 grid sm:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-bold text-stone-900 mb-2">Direct Call Support</h4>
                <a href="tel:+919739391891" className="text-stone-600 hover:text-emerald-600 transition-colors flex items-center gap-2 text-lg font-mono mb-1 tabular-nums">
                  <PhoneCallIcon className="w-4 h-4 text-[#D97706]" /> +91 97393 91891
                </a>
                <p className="text-xs text-stone-400">Available Daily, 7:00 AM to 10:00 PM</p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-stone-900 mb-3">Official Socials</h4>
                <div className="flex items-center gap-3">
                  <a
                    href="tel:+919739391891"
                    aria-label="Call Support (+91 97393 91891)"
                    title="Call Support: +91 97393 91891"
                    className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center text-[#10B981] hover:border-[#1C1917] hover:shadow-md transition-all"
                  >
                    <PhoneCallIcon className="w-4 h-4" />
                  </a>
                  <a
                    href="https://www.instagram.com/shamsjiyoo2026?exln=aG43cXdnZmgwZDRu"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram Customer Support"
                    title="Instagram Customer Support"
                    className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center text-[#E1306C] hover:border-[#1C1917] hover:shadow-md transition-all"
                  >
                    <InstagramIcon className="w-4 h-4" />
                  </a>
                  <a
                    href={whatsappHref('support')}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center text-[#25D366] hover:border-[#1C1917] hover:shadow-md transition-all"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                  </a>
                  <a
                    href="mailto:shamsjiyoo@gmail.com?cc=jiyooshams@gmail.com"
                    aria-label="Email Primary (shamsjiyoo@gmail.com)"
                    title="Primary Support: shamsjiyoo@gmail.com"
                    className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center text-[#3B82F6] hover:border-[#1C1917] hover:shadow-md transition-all"
                  >
                    <EmailEnvelopeIcon className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Registered Indian Business Address & Regulatory Identity */}
            <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-900">
                  <MapPin className="w-4 h-4 text-[#8A5A36] shrink-0" />
                  <span>Registered Indian Business Address</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-md font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  FSSAI Lic. 21226112000732
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                <strong>SHAM&apos;S™ — JIYOO Fresh Foods &amp; Wholesale</strong><br />
                Thanisandra Main Road, Nagavara &amp; North Bengaluru Cold-Chain Hub,<br />
                Bengaluru, Karnataka – 560045, India
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-mono text-stone-700">
                <span>Phone: +91 97393 91891</span>
                <span>Email: shamsjiyoo@gmail.com</span>
                <span>MSME: UDYAM-KR-19-0005999</span>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
