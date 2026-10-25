import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Mail, Check, Copy } from 'lucide-react';

export const SOCIAL_LINKS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    handle: '+91 97393 91891',
    href: 'https://wa.me/919739391891',
    icon: (props: { className?: string }) => (
      <svg className={props.className || "w-5 h-5"} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.333 5.001l-1.417 5.176 5.292-1.388c1.464.798 3.114 1.218 4.78 1.219h.004c5.505 0 9.988-4.478 9.989-9.985 0-2.668-1.038-5.176-2.925-7.062-1.886-1.887-4.394-2.925-7.066-2.945zm5.836 14.195c-.246.691-1.425 1.319-1.99 1.404-.508.075-1.151.107-1.857-.118-.428-.136-.978-.318-1.682-.622-2.962-1.279-4.896-4.262-5.044-4.459-.147-.197-1.206-1.603-1.206-3.056 0-1.453.762-2.167 1.033-2.463.271-.296.591-.37.788-.37.197 0 .394.001.566.01.181.009.425-.068.664.506.246.591.839 2.046.912 2.194.074.148.123.321.025.518-.098.197-.148.321-.295.494-.148.173-.312.386-.446.521-.148.148-.302.308-.13.603.172.296.765 1.264 1.642 2.046 1.127 1.005 2.079 1.316 2.375 1.464.296.148.469.123.643-.074.173-.197.741-.861.938-1.157.197-.296.394-.247.69-.148.296.099 1.883.887 2.204 1.047.321.16.535.238.613.366.078.128.078.739-.168 1.43z"/>
      </svg>
    ),
    color: 'from-emerald-500 to-teal-600',
    hoverGlow: 'rgba(37, 211, 102, 0.4)',
    badge: 'Fast Support',
    accentColor: '#25D366'
  },
  {
    id: 'phone',
    label: 'Call Direct',
    handle: '+91 78997 44335',
    href: 'tel:+917899744335',
    icon: (props: { className?: string }) => <Phone className={props.className || "w-5 h-5"} />,
    color: 'from-amber-400 to-yellow-600',
    hoverGlow: 'rgba(217, 119, 6, 0.4)',
    badge: 'Customer Desk',
    accentColor: '#D97706'
  },
  {
    id: 'email',
    label: 'Email Care',
    handle: 'jiyooshams@gmail.com & shamsjiyoo@gmail.com',
    href: 'mailto:jiyooshams@gmail.com,shamsjiyoo@gmail.com',
    icon: (props: { className?: string }) => <Mail className={props.className || "w-5 h-5"} />,
    color: 'from-sky-400 to-blue-600',
    hoverGlow: 'rgba(59, 130, 246, 0.4)',
    badge: 'Inquiries',
    accentColor: '#3B82F6'
  },
  {
    id: 'instagram',
    label: 'Instagram',
    handle: 'jiyoo shams',
    href: 'https://www.instagram.com/shamsjiyoo2026?utm_source=qr&igsh=MWh3YWlzOWV1N3Aweg==',
    icon: (props: { className?: string }) => (
      <svg className={props.className || "w-5 h-5"} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    color: 'from-pink-500 to-purple-600',
    hoverGlow: 'rgba(236, 72, 153, 0.4)',
    badge: 'Socials',
    accentColor: '#EC4899'
  }
];

export function PremiumSocialBar() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, id: string, text: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full my-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-emerald-400 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Customer Care & Social Channels
          </h3>
          <p className="text-sm text-slate-400 font-light mt-1">
            Connect instantly with our concierge team across official platforms
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SOCIAL_LINKS.map((item) => {
          const isCopied = copiedId === item.id;

          return (
            <motion.div
              key={item.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="relative group rounded-xl p-[1px] bg-[#292524] hover:bg-[#44403C] transition-all duration-300 border border-[#44403C]"
            >
              <div className="relative bg-[#1C1917] rounded-xl p-4 flex items-center justify-between h-full">
                <a
                  href={item.href}
                  target={item.href.startsWith('http') ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className="flex items-center gap-3.5 min-w-0 flex-1 group/link"
                >
                  {/* Icon Container */}
                  <div className="w-10 h-10 rounded-lg bg-[#292524] border border-[#44403C] flex items-center justify-center text-[#FAF9F5] flex-shrink-0">
                    {item.icon({ className: "w-4 h-4" })}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#FAF9F5]">
                        {item.label}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#292524] text-[#A8A29E] font-mono tracking-tight">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[#A8A29E] font-mono truncate mt-0.5">
                      {item.handle}
                    </p>
                  </div>
                </a>

                {/* Quick copy / action button */}
                <button
                  onClick={(e) => handleCopy(e, item.id, item.handle)}
                  className="ml-2 p-2 rounded-lg bg-[#292524] hover:bg-[#44403C] text-[#A8A29E] hover:text-[#FAF9F5] transition-colors relative cursor-pointer"
                  title={`Copy ${item.label}`}
                >
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  
                  <AnimatePresence>
                    {isCopied && (
                      <motion.span
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: -28, scale: 1 }}
                        exit={{ opacity: 0, y: -35 }}
                        className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[#FAF9F5] text-[#1C1917] text-[10px] font-bold whitespace-nowrap shadow-md pointer-events-none"
                      >
                        Copied!
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function FloatingSocialDock() {
  const whatsappIcon = SOCIAL_LINKS[0].icon;
  const phoneIcon = SOCIAL_LINKS[1].icon;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
      {/* WhatsApp Quick Floating Button */}
      <motion.a
        href="https://wa.me/919739391891"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.9 }}
        className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-2xl shadow-emerald-500/40 border border-emerald-300/30"
        aria-label="WhatsApp Concierge"
      >
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-zinc-950 animate-ping" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-zinc-950" />
        
        {whatsappIcon({ className: "w-6 h-6" })}

        {/* Hover Tooltip */}
        <span className="absolute right-14 px-3 py-1.5 rounded-xl bg-zinc-900/90 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-xl border border-white/10 backdrop-blur-md">
          Chat on WhatsApp
        </span>
      </motion.a>

      {/* Phone Quick Floating Button */}
      <motion.a
        href="tel:+917899744335"
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.9 }}
        className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-600 text-white shadow-2xl shadow-amber-500/30 border border-white/20"
        aria-label="Call Us"
      >
        {phoneIcon({ className: "w-5 h-5" })}
        
        {/* Hover Tooltip */}
        <span className="absolute right-14 px-3 py-1.5 rounded-xl bg-zinc-900/90 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-xl border border-white/10 backdrop-blur-md">
          Call Now
        </span>
      </motion.a>
    </div>
  );
}
