import React, { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useSettings } from '../../../contexts/SettingsContext';
import { sanitizeWhatsAppNumber } from '../../../utils/whatsapp';
import { WhatsAppIcon } from '../../core/components/SocialIcons';
import { FssaiLogo } from '../../core/components/FssaiLogo';

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const HEADLINE_LINE_1 = ['Exotic', 'fruits,', 'daily', 'veggies', '&'];
const HEADLINE_LINE_2 = ['fresh', 'custom-cut', 'meats,', 'delivered', 'fast.'];

export function Hero({
  onOpenWholesale: _onOpenWholesale,
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

  // Multi-layer GPU-accelerated scroll parallax & kinetic typography transforms
  const eyebrowY = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -18]);
  const headlineY = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -38]);
  const headlineScale = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [1, 1] : [1, 0.975]);
  const subcopyY = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -24]);
  const ctaY = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -14]);
  const heroOpacity = useTransform(smoothProgress, [0, 0.88], prefersReducedMotion ? [1, 1] : [1, 0.2]);
  const ambientY = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, 48]);
  const horizonScaleX = useTransform(smoothProgress, [0, 0.65], prefersReducedMotion ? [1, 1] : [0.15, 1]);

  const handleExploreCatalog = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const whatsappHref = `https://wa.me/${sanitizeWhatsAppNumber(settings.whatsappNumber)}?text=${encodeURIComponent(
    `Hi ${settings.storeName || 'JIYOO'}! I would like to place a fresh order.`
  )}`;

  return (
    <section
      ref={heroRef}
      className="relative w-full bg-[#FAF9F5] border-b border-[#E7E3DA] overflow-hidden"
    >
      {/* Bespoke Warm Botanical & Architectural Contour Backdrop */}
      <motion.div
        aria-hidden="true"
        style={{ y: ambientY }}
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 right-[-8%] w-[540px] h-[540px] rounded-full bg-[radial-gradient(circle,rgba(214,204,186,0.34)_0%,rgba(250,249,245,0)_70%)]" />
        <div className="absolute bottom-[-20%] left-[-6%] w-[460px] h-[460px] rounded-full bg-[radial-gradient(circle,rgba(229,222,208,0.36)_0%,rgba(250,249,245,0)_72%)]" />
        <svg
          className="absolute right-0 top-0 h-full w-full max-w-[960px] opacity-[0.28] text-[#D8D1C5]"
          viewBox="0 0 960 640"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            d="M420 -40C520 120 710 180 980 150"
            stroke="currentColor"
            strokeWidth="1"
            initial={{ pathLength: prefersReducedMotion ? 1 : 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.6, ease: EASE_OUT_EXPO }}
          />
          <motion.path
            d="M540 -60C610 170 770 290 1020 310"
            stroke="currentColor"
            strokeWidth="0.75"
            strokeDasharray="4 6"
            initial={{ pathLength: prefersReducedMotion ? 1 : 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.9, delay: 0.15, ease: EASE_OUT_EXPO }}
          />
          <motion.path
            d="M320 680C460 470 690 390 1000 440"
            stroke="currentColor"
            strokeWidth="1"
            initial={{ pathLength: prefersReducedMotion ? 1 : 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.8, delay: 0.25, ease: EASE_OUT_EXPO }}
          />
        </svg>
      </motion.div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 pt-7 sm:pt-11 lg:pt-14 pb-9 sm:pb-13 lg:pb-16">
        <motion.div
          style={{ opacity: heroOpacity }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center"
        >
          {/* Editorial Typography, Original FSSAI Mark & Conversion Actions */}
          <div className="lg:col-span-10 xl:col-span-9 flex flex-col justify-between">
            <div>
              {/* Unboxed Editorial Eyebrow with Original Full-Color FSSAI Logo */}
              <motion.div
                style={{ y: eyebrowY }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
                className="mb-4 sm:mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-[#57534E] font-sans-clean"
              >
                <span className="font-semibold tracking-[0.14em] uppercase text-[#1C1917]">
                  {settings.storeName || 'JIYOO Premium Products'}
                </span>
                <span aria-hidden="true" className="text-[#C7C0B5]">·</span>
                <span className="inline-flex items-center gap-2 text-[#1C1917] font-medium">
                  <FssaiLogo className="h-5 sm:h-5.5 w-auto" variant="original" />
                  <span className="font-mono text-[10.5px] sm:text-[11px] text-[#57534E] tracking-wider tabular-nums">
                    Lic. 21226112000732
                  </span>
                </span>
              </motion.div>

              {/* Word-by-Word Mask-Clipped Kinetic Display Headline with Editorial Shimmer & Underline */}
              <motion.h1
                style={{ y: headlineY, scale: headlineScale }}
                className="editorial-hero-headline font-medium text-[#1C1917] origin-left"
              >
                <span className="flex flex-wrap gap-x-[0.25em] pb-0.5">
                  {HEADLINE_LINE_1.map((word, index) => (
                    <span
                      key={word}
                      className="inline-block overflow-hidden py-1 -my-1 px-0.5 -mx-0.5"
                    >
                      <motion.span
                        initial={{
                          opacity: 0,
                          y: prefersReducedMotion ? 0 : '108%',
                          rotateZ: prefersReducedMotion ? 0 : 1.75,
                        }}
                        animate={{ opacity: 1, y: '0%', rotateZ: 0 }}
                        transition={{
                          duration: 0.76,
                          delay: 0.04 + index * 0.048,
                          ease: EASE_OUT_EXPO,
                        }}
                        className="inline-block origin-bottom-left"
                      >
                        {word}
                      </motion.span>
                    </span>
                  ))}
                </span>

                <span className="relative inline-flex flex-wrap gap-x-[0.25em] pt-0.5 pb-2">
                  {HEADLINE_LINE_2.map((word, index) => (
                    <span
                      key={word}
                      className="inline-block overflow-hidden py-1.5 -my-1.5 px-1 -mx-1"
                    >
                      <motion.span
                        initial={{
                          opacity: 0,
                          y: prefersReducedMotion ? 0 : '108%',
                          rotateZ: prefersReducedMotion ? 0 : 1.75,
                        }}
                        animate={{ opacity: 1, y: '0%', rotateZ: 0 }}
                        transition={{
                          duration: 0.82,
                          delay: 0.24 + index * 0.055,
                          ease: EASE_OUT_EXPO,
                        }}
                        className="inline-block origin-bottom-left italic font-normal bg-gradient-to-r from-[#57534E] via-[#8A5A36] to-[#57534E] bg-clip-text text-transparent tracking-[-0.01em]"
                      >
                        {word}
                      </motion.span>
                    </span>
                  ))}

                  {/* Scroll-linked & Entrance-drawn Editorial Accent Hairline */}
                  <motion.span
                    aria-hidden="true"
                    style={{ scaleX: horizonScaleX }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ duration: 1.05, delay: 0.52, ease: EASE_OUT_EXPO }}
                    className="pointer-events-none absolute left-0 bottom-0 h-[1.5px] w-full max-w-[360px] bg-gradient-to-r from-[#8A5A36]/70 via-[#C5A880]/60 to-transparent origin-left"
                  />
                </span>
              </motion.h1>

              {/* Concise Editorial Value Proposition */}
              <motion.p
                style={{ y: subcopyY }}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.68, delay: 0.38, ease: EASE_OUT_EXPO }}
                className="mt-4 sm:mt-5 text-sm sm:text-base text-[#44403C] font-sans-clean font-normal leading-[1.68] max-w-[58ch] text-left"
              >
                Fresh imported fruits, farm-fresh daily vegetables, and clean custom-cut meats made just how you like.
              </motion.p>

              {/* Primary & Secondary Conversion Actions */}
              <motion.div
                style={{ y: ctaY }}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.68, delay: 0.46, ease: EASE_OUT_EXPO }}
                className="mt-6 sm:mt-7 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-3.5"
              >
                <motion.button
                  type="button"
                  onClick={handleExploreCatalog}
                  whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.01 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  transition={{ duration: 0.16, ease: EASE_OUT_EXPO }}
                  className="group relative overflow-hidden inline-flex items-center justify-center gap-3 px-6 py-3.5 text-xs font-semibold tracking-[0.11em] uppercase text-[#FAF9F5] bg-[#1C1917] hover:bg-[#292524] rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1917]"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/12 to-transparent transition-transform duration-500 ease-out group-hover:translate-x-full" />
                  <span className="relative z-10">Shop Fresh Catalog</span>
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
          </div>
        </motion.div>
      </div>
    </section>
  );
}

