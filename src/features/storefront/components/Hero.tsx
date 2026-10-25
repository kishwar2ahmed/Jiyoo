import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'motion/react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useSettings } from '../../../contexts/SettingsContext';
import { sanitizeWhatsAppNumber } from '../../../utils/whatsapp';
import { WhatsAppIcon } from '../../core/components/SocialIcons';

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const HEADLINE_LINE_1 = ['Exotic', 'fruits,', 'daily', 'veggies', '&'];
const HEADLINE_LINE_2 = ['fresh', 'custom-cut', 'meats,', 'delivered', 'fast.'];

export function Hero({
  onOpenWholesale,
}: {
  onOpenWholesale?: () => void;
}) {
  const { settings } = useSettings();
  const heroRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 26,
    mass: 0.45,
  });

  // Multi-layer scroll parallax transforms (compositor-only: transform & opacity)
  const headlineY = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -36]);
  const subcopyY = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -22]);
  const ctaY = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -14]);
  const heroOpacity = useTransform(smoothProgress, [0, 0.85], prefersReducedMotion ? [1, 1] : [1, 0.25]);
  const heroScale = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [1, 1] : [1, 0.985]);
  const bgGridY = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, 48]);
  const emblemRotate = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, 65]);

  const handleExploreCatalog = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenWholesale = () => {
    if (onOpenWholesale) {
      onOpenWholesale();
    } else {
      document.dispatchEvent(new CustomEvent('open-wholesale'));
    }
  };

  const whatsappHref = `https://wa.me/${sanitizeWhatsAppNumber(settings.whatsappNumber)}?text=${encodeURIComponent(
    `Hi ${settings.storeName || 'JIYOO'}! I would like to place a fresh order.`
  )}`;

  const deliveryWindow = settings.estimatedDeliveryTime || '30 - 60 mins';

  const businessPillars = [
    {
      index: '01.',
      title: 'Direct Farm & Import Sourcing',
      detail: 'Partnered with local growers & importers for fair prices',
    },
    {
      index: '02.',
      title: 'Cleaned & Cut to Order',
      detail: 'Custom butcher & fish cuts prepared fresh after you order',
    },
    {
      index: '03.',
      title: `Express ${deliveryWindow} Dispatch`,
      detail: 'Temperature-controlled doorstep delivery with COD & UPI',
      isTabular: true,
    },
    {
      index: '04.',
      title: 'Homes, Hotels & Restaurants',
      detail: `Retail & wholesale kitchen supply by ${settings.aboutUs?.marketedBy || "SHAM'S™"}`,
    },
  ];

  return (
    <section
      ref={heroRef}
      className="relative w-full bg-[#FAF9F5] border-b border-[#E7E3DA] overflow-hidden"
    >
      {/* Subtle Parallax Architectural Vector Grid & Ambient Aura */}
      <motion.div
        aria-hidden="true"
        style={{ y: bgGridY }}
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.32]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="jiyoo-editorial-grid"
              width="72"
              height="72"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 72 0 L 0 0 0 72"
                fill="none"
                stroke="#E7E3DA"
                strokeWidth="0.75"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#jiyoo-editorial-grid)" />
        </svg>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,transparent_25%,#FAF9F5_82%)]" />
      </motion.div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 pt-7 sm:pt-12 lg:pt-14 pb-8 sm:pb-12 lg:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <motion.div
            style={{ opacity: heroOpacity, scale: heroScale }}
            className="lg:col-span-12 flex flex-col justify-between origin-top-left"
          >
            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <div className="max-w-4xl">
                {/* Unboxed Trust & Regulatory Eyebrow */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
                  className="mb-3.5 sm:mb-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] sm:text-xs text-[#57534E] font-sans-clean"
                >
                  <span className="font-semibold tracking-[0.12em] uppercase text-[#1C1917]">
                    {settings.storeName || 'JIYOO Premium Products'}
                  </span>
                  <span aria-hidden="true" className="text-[#A8A29E]">·</span>
                  <span className="inline-flex items-center gap-1 text-[#065F46] font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>FSSAI Certified Quality</span>
                  </span>
                </motion.div>

                {/* Word-by-Word Mask-Clipped Kinetic Headline (with descender-safe vertical padding) */}
                <motion.h1
                  style={{ y: headlineY }}
                  className="editorial-hero-headline font-medium text-[#1C1917]"
                >
                  <span className="flex flex-wrap gap-x-[0.26em] pb-0.5">
                    {HEADLINE_LINE_1.map((word, index) => (
                      <span key={word} className="inline-block overflow-hidden py-1 -my-1 px-0.5 -mx-0.5">
                        <motion.span
                          initial={{
                            opacity: 0,
                            y: prefersReducedMotion ? 0 : '105%',
                            rotateZ: prefersReducedMotion ? 0 : 1.5,
                          }}
                          animate={{ opacity: 1, y: '0%', rotateZ: 0 }}
                          transition={{
                            duration: 0.72,
                            delay: 0.04 + index * 0.045,
                            ease: EASE_OUT_EXPO,
                          }}
                          className="inline-block origin-bottom-left"
                        >
                          {word}
                        </motion.span>
                      </span>
                    ))}
                  </span>

                  <span className="flex flex-wrap gap-x-[0.26em] pt-0.5 pb-1">
                    {HEADLINE_LINE_2.map((word, index) => (
                      <span key={word} className="inline-block overflow-hidden py-1.5 -my-1.5 px-1 -mx-1">
                        <motion.span
                          initial={{
                            opacity: 0,
                            y: prefersReducedMotion ? 0 : '105%',
                            rotateZ: prefersReducedMotion ? 0 : 1.5,
                          }}
                          animate={{ opacity: 1, y: '0%', rotateZ: 0 }}
                          transition={{
                            duration: 0.76,
                            delay: 0.22 + index * 0.05,
                            ease: EASE_OUT_EXPO,
                          }}
                          className="inline-block origin-bottom-left italic font-normal text-[#78716C] tracking-[-0.01em]"
                        >
                          {word}
                        </motion.span>
                      </span>
                    ))}
                  </span>
                </motion.h1>

                {/* Concise Benefit Subheadline */}
                <motion.p
                  style={{ y: subcopyY }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.38, ease: EASE_OUT_EXPO }}
                  className="mt-4 sm:mt-5 text-sm sm:text-base text-[#44403C] font-sans-clean font-normal leading-[1.65] max-w-[56ch] text-left"
                >
                  Hand-selected produce, imported fruits, and fresh meats prepared with utmost care and delivered express to your doorstep.
                </motion.p>

                {/* Primary & Secondary Conversion Actions */}
                <motion.div
                  style={{ y: ctaY }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.46, ease: EASE_OUT_EXPO }}
                  className="mt-6 sm:mt-7 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-3.5"
                >
                  <motion.button
                    type="button"
                    onClick={handleExploreCatalog}
                    whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.01 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                    transition={{ duration: 0.16, ease: EASE_OUT_EXPO }}
                    className="group relative overflow-hidden inline-flex items-center justify-center gap-3 px-6 py-3.5 text-xs font-semibold tracking-[0.1em] uppercase text-[#FAF9F5] bg-[#1C1917] hover:bg-[#292524] rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1917]"
                  >
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/12 to-transparent transition-transform duration-500 ease-out group-hover:translate-x-full" />
                    <span className="relative z-10">Shop Catalog</span>
                    <ArrowRight
                      className="relative z-10 w-3.5 h-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1"
                      strokeWidth={1.75}
                    />
                  </motion.button>

                  <motion.a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.01 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                    transition={{ duration: 0.16, ease: EASE_OUT_EXPO }}
                    className="inline-flex items-center justify-center gap-2.5 px-5 py-3.5 text-xs font-semibold tracking-[0.06em] uppercase text-[#1C1917] bg-white hover:bg-[#F4F1EA] border border-[#D6D0C4] rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <WhatsAppIcon className="w-5 h-5 shrink-0" />
                    <span>Order on WhatsApp</span>
                  </motion.a>
                </motion.div>
              </div>

              {/* Scroll-Linked Kinetic Vector Seal (Desktop Architectural Accent) */}
              <motion.div
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.85, delay: 0.35, ease: EASE_OUT_EXPO }}
                className="hidden lg:flex items-center justify-center shrink-0 pr-2 pb-1"
              >
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <motion.svg
                    style={{ rotate: emblemRotate }}
                    viewBox="0 0 120 120"
                    className="w-full h-full text-[#78716C]"
                  >
                    <defs>
                      <path
                        id="jiyoo-seal-circle"
                        d="M 60, 60 m -44, 0 a 44,44 0 1,1 88,0 a 44,44 0 1,1 -88,0"
                      />
                    </defs>
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="#E7E3DA"
                      strokeWidth="1"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="32"
                      fill="none"
                      stroke="#E7E3DA"
                      strokeWidth="0.75"
                      strokeDasharray="2 3"
                    />
                    <text
                      fill="currentColor"
                      className="text-[7.5px] font-mono uppercase tracking-[0.23em]"
                    >
                      <textPath href="#jiyoo-seal-circle" startOffset="0%">
                        FARM &amp; ORCHARD DIRECT · COLD CHAIN ·
                      </textPath>
                    </text>
                  </motion.svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-serif-luxury italic text-sm text-[#1C1917] leading-none">
                      100%
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#78716C] mt-0.5">
                      Fresh
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Full-Width 4-Column Business & Fulfillment Proof Strip with Scroll-Drawn Dividers */}
        <div className="mt-10 sm:mt-12 pt-6 relative">
          <motion.div
            aria-hidden="true"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.15, ease: EASE_OUT_EXPO }}
            className="absolute top-0 left-0 right-0 h-[1px] bg-[#E7E3DA] origin-left"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 text-xs text-[#57534E]">
            {businessPillars.map((item, idx) => (
              <motion.div
                key={item.index}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.5, delay: 0.18 + idx * 0.07, ease: EASE_OUT_EXPO }}
                className="relative flex items-baseline gap-2.5 lg:pl-4 first:lg:pl-0"
              >
                {idx > 0 && (
                  <motion.span
                    aria-hidden="true"
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.25 + idx * 0.08, ease: EASE_OUT_EXPO }}
                    className="hidden lg:block absolute left-0 top-0.5 bottom-0.5 w-[1px] bg-[#E7E3DA] origin-top"
                  />
                )}
                <span className="font-mono text-[11px] text-[#78716C] tabular-nums shrink-0">
                  {item.index}
                </span>
                <div>
                  <span className="font-semibold text-[#1C1917] block mb-0.5">{item.title}</span>
                  <span className={`text-[11px] leading-relaxed text-[#57534E] ${item.isTabular ? 'tabular-nums' : ''}`}>
                    {item.detail}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
