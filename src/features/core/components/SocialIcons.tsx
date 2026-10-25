import { useState, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Copy } from 'lucide-react';

/**
 * Official WhatsApp full-color brand SVG (#25D366 circle/bubble + crisp white handset)
 */
export function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M4.868 43.303l2.694-9.835a19.9 19.9 0 01-2.665-9.956C4.897 12.538 13.835 3.6 24.815 3.6c5.327 0 10.33 2.076 14.093 5.842 3.763 3.765 5.834 8.77 5.832 14.096-.004 10.978-8.942 19.914-19.925 19.914-3.338 0-6.633-.839-9.559-2.433L4.868 43.303z"
        fill="#FFFFFF"
      />
      <path
        d="M24.815 5.4c-9.983 0-18.108 8.122-18.112 18.106 0 3.431.964 6.774 2.788 9.666l.433.688-1.825 6.663 6.837-1.793.665.394a18.06 18.06 0 009.208 2.523h.007c9.981 0 18.106-8.123 18.11-18.107.002-4.838-1.88-9.388-5.3-12.811C34.205 7.284 29.655 5.4 24.815 5.4z"
        fill="#25D366"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.38 14.375c-.407-.905-.835-.923-1.223-.939-.317-.014-.679-.013-1.041-.013-.363 0-.951.136-1.45.679-.498.543-1.902 1.857-1.902 4.529 0 2.672 1.947 5.254 2.219 5.617.271.362 3.759 6.021 9.282 8.202 4.591 1.813 5.525 1.451 6.521 1.36.996-.091 3.215-1.313 3.668-2.581.453-1.268.453-2.355.317-2.582-.136-.226-.498-.362-1.042-.634-.543-.272-3.215-1.586-3.713-1.767-.498-.181-.86-.272-1.223.272-.362.543-1.403 1.766-1.72 2.129-.317.362-.634.408-1.178.136-.543-.272-2.294-.846-4.37-2.697-1.615-1.441-2.706-3.221-3.023-3.765-.317-.543-.034-.837.239-1.108.244-.243.543-.634.815-.951.271-.317.362-.544.543-.906.181-.362.091-.679-.045-.951-.136-.272-1.192-2.956-1.681-4.005z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * Official Instagram full-color radial-gradient brand SVG
 */
export function InstagramIcon({ className = 'w-5 h-5' }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const grad1 = `ig-rad-1-${uid}`;
  const grad2 = `ig-rad-2-${uid}`;

  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id={grad1} cx="30%" cy="107%" r="125%">
          <stop offset="0%" stopColor="#FDF497" />
          <stop offset="5%" stopColor="#FDF497" />
          <stop offset="45%" stopColor="#FD5949" />
          <stop offset="60%" stopColor="#D6249F" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
        <linearGradient id={grad2} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="25%" stopColor="#F77737" />
          <stop offset="50%" stopColor="#E1306C" />
          <stop offset="75%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="11" fill={`url(#${grad1})`} />
      <rect x="4" y="4" width="40" height="40" rx="11" fill={`url(#${grad2})`} fillOpacity="0.35" />
      <rect x="10.5" y="10.5" width="27" height="27" rx="7.5" stroke="#FFFFFF" strokeWidth="2.8" />
      <circle cx="24" cy="24" r="6.5" stroke="#FFFFFF" strokeWidth="2.8" />
      <circle cx="31.8" cy="16.2" r="1.9" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * Full-color Direct Phone Call badge icon (#10B981 / #059669 emerald badge + crisp white handset)
 */
export function PhoneCallIcon({ className = 'w-5 h-5' }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `phone-grad-${uid}`;

  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="11" fill={`url(#${gradId})`} />
      <path
        d="M18.92 21.86a17.65 17.65 0 007.22 7.22l2.41-2.41a1.1 1.1 0 011.12-.26c1.23.41 2.55.63 3.93.63.61 0 1.1.49 1.1 1.1v3.84c0 .61-.49 1.1-1.1 1.1C22.25 33.08 14.92 25.75 14.92 14.42c0-.61.49-1.1 1.1-1.1h3.85c.61 0 1.1.49 1.1 1.1 0 1.37.22 2.7.63 3.93.12.38.03.81-.27 1.12l-2.41 2.39z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * Official 5-color Gmail / Google Mail envelope SVG (for jiyooshams@gmail.com & shamsjiyoo@gmail.com)
 */
export function EmailEnvelopeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="4" y="4" width="40" height="40" rx="11" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1.5" />
      <path d="M11 16.5v16.25c0 1.24 1.01 2.25 2.25 2.25H16V21.8l-5-3.75v-1.55z" fill="#4285F4" />
      <path d="M37 16.5v16.25c0 1.24-1.01 2.25-2.25 2.25H32V21.8l5-3.75v-1.55z" fill="#34A853" />
      <path d="M32 14.8v7L37 18v-2c0-2.06-2.35-3.24-4-2l-1 .8z" fill="#FBBC05" />
      <path d="M16 21.8v-7l8 6 8-6v7l-8 6-8-6z" fill="#EA4335" />
      <path d="M11 16v2l5 3.8v-7l-1-.8c-1.65-1.24-4-.06-4 2z" fill="#C5221F" />
    </svg>
  );
}

export const SOCIAL_LINKS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    handle: '+91 97393 91891',
    href: 'https://wa.me/919739391891',
    icon: (props: { className?: string }) => <WhatsAppIcon className={props.className || 'w-5 h-5'} />,
    badge: 'Fast Support',
    accentColor: '#25D366',
  },
  {
    id: 'phone',
    label: 'Call Direct',
    handle: '+91 78997 44335',
    href: 'tel:+917899744335',
    icon: (props: { className?: string }) => <PhoneCallIcon className={props.className || 'w-5 h-5'} />,
    badge: 'Customer Desk',
    accentColor: '#10B981',
  },
  {
    id: 'email',
    label: 'Email Care',
    handle: 'jiyooshams@gmail.com',
    href: 'mailto:jiyooshams@gmail.com,shamsjiyoo@gmail.com',
    icon: (props: { className?: string }) => <EmailEnvelopeIcon className={props.className || 'w-5 h-5'} />,
    badge: 'Inquiries',
    accentColor: '#EA4335',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@shamsjiyoo2026',
    href: 'https://www.instagram.com/shamsjiyoo2026?utm_source=qr&igsh=MWh3YWlzOWV1N3Aweg==',
    icon: (props: { className?: string }) => <InstagramIcon className={props.className || 'w-5 h-5'} />,
    badge: 'Official',
    accentColor: '#E1306C',
  },
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
    <div className="w-full my-6 sm:my-8">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-4 mb-5 sm:mb-6"
      >
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#C5A880] font-semibold block">
            Concierge &amp; Direct Support
          </span>
          <h3 className="font-serif-luxury text-xl sm:text-2xl font-normal text-[#FAF9F5] mt-1">
            Official Customer Care &amp; Ordering Channels
          </h3>
          <p className="text-xs sm:text-sm text-[#A8A29E] font-sans-clean font-light mt-1 max-w-2xl">
            Direct assistance with our sourcing desk for farm orders, custom butcher cuts, and express delivery
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {SOCIAL_LINKS.map((item, idx) => {
          const isCopied = copiedId === item.id;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              className="group relative rounded-xl border border-[#2B2622] hover:border-[#443D36] bg-[#181513] hover:bg-[#1E1B18] transition-all duration-300 p-3.5 sm:p-4 shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            >
              <div className="flex items-center justify-between gap-3 h-full">
                <a
                  href={item.href}
                  target={item.href.startsWith('http') ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 min-w-0 flex-1 group/link"
                >
                  <div 
                    className="w-10 h-10 rounded-lg bg-[#24201D] border border-[#332D28] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/link:scale-105"
                    style={{ color: item.accentColor }}
                  >
                    {item.icon({ className: 'w-5 h-5' })}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-[#FAF9F5] group-hover/link:text-white transition-colors">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-[#78716C] font-mono tracking-wider">
                        · {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[#A8A29E] font-mono truncate mt-0.5 tabular-nums">
                      {item.handle}
                    </p>
                  </div>
                </a>

                <button
                  type="button"
                  onClick={(e) => handleCopy(e, item.id, item.handle)}
                  className="p-2 rounded-lg bg-[#24201D] hover:bg-[#2F2A26] border border-[#332D28] text-[#A8A29E] hover:text-[#FAF9F5] transition-colors relative cursor-pointer shrink-0"
                  title={`Copy ${item.label}`}
                  aria-label={`Copy ${item.label} handle`}
                >
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-[#10B981]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}

                  <AnimatePresence>
                    {isCopied && (
                      <motion.span
                        initial={{ opacity: 0, y: 8, scale: 0.85 }}
                        animate={{ opacity: 1, y: -26, scale: 1 }}
                        exit={{ opacity: 0, y: -32 }}
                        className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[#FAF9F5] text-[#181513] text-[10px] font-bold whitespace-nowrap shadow-md pointer-events-none"
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
  return (
    <div className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col gap-2.5 sm:gap-3">
      {SOCIAL_LINKS.map((link) => (
        <motion.a
          key={link.id}
          href={link.href}
          target={link.href.startsWith('http') ? '_blank' : '_self'}
          rel="noopener noreferrer"
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.94 }}
          className="group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white shadow-lg border border-[#E7E3DA]"
          aria-label={link.label}
        >
          {link.icon({ className: 'w-6 h-6' })}
          <span className="hidden sm:block absolute right-14 px-3 py-1.5 rounded-xl bg-zinc-900/95 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-xl border border-white/10">
            {link.label}: {link.handle}
          </span>
        </motion.a>
      ))}
    </div>
  );
}
