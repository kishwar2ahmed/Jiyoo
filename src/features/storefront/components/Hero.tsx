import React, { useRef, useState, useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useSettings } from '../../../contexts/SettingsContext';
import { sanitizeWhatsAppNumber } from '../../../utils/whatsapp';
import { VelvetWhatsAppButton } from '../../product/components/VelvetWhatsAppButton';
import { HeroSlideshow } from './HeroSlideshow';

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const HEADLINE_LINE_1 = ['Exotic', 'fruits,', 'daily', 'veggies', '&'];

const HERO_TYPEWRITER_PHRASES = [
  'fresh custom-cut meats, delivered fast.',
  'imported orchard fruits, handpicked daily.',
  'coastal catch & sea prawns, cleaned fresh.',
  'farm-fresh daily veggies, at your doorstep.',
  'pure cold-pressed smoothies, made to order.',
] as const;

export function Hero({
  onOpenWholesale: _onOpenWholesale,
}: {
  onOpenWholesale?: () => void;
}) {
  const { settings } = useSettings();
  const heroRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setPhraseIdx((prev) => (prev + 1) % HERO_TYPEWRITER_PHRASES.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

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
  const eyebrowY = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -12]);
  const headlineY = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -20]);
  const subcopyY = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -16]);
  const ctaY = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -10]);
  const ambientY = useTransform(smoothProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, 48]);
  const horizonScaleX = useTransform(smoothProgress, [0, 0.65], prefersReducedMotion ? [1, 1] : [0.15, 1]);

  const handleExploreCatalog = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Subtle interactive pointer parallax for desktop ambient contours & showcase depth
  const pointerX = useSpring(0, { stiffness: 120, damping: 28, mass: 0.6 });
  const pointerY = useSpring(0, { stiffness: 120, damping: 28, mass: 0.6 });
  const showcaseRotateX = useTransform(pointerY, [-0.5, 0.5], prefersReducedMotion ? [0, 0] : [2.2, -2.2]);
  const showcaseRotateY = useTransform(pointerX, [-0.5, 0.5], prefersReducedMotion ? [0, 0] : [-2.6, 2.6]);
  const contourShiftX = useTransform(pointerX, [-0.5, 0.5], prefersReducedMotion ? [0, 0] : [-14, 14]);

  const handleHeroPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (prefersReducedMotion || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerX.set((e.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleHeroPointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const whatsappHref = `https://wa.me/${sanitizeWhatsAppNumber(settings.whatsappNumber)}?text=${encodeURIComponent(
    `Hi ${settings.storeName || 'JIYOO'}! I would like to place a fresh order.`
  )}`;

  return (
    <section
      ref={heroRef}
      onPointerMove={handleHeroPointerMove}
      onPointerLeave={handleHeroPointerLeave}
      className="relative w-full bg-[#FAF9F5] border-b border-[#E7E3DA] overflow-hidden"
    >
      {/* Bespoke Warm Botanical & Architectural Contour Backdrop */}
      <motion.div
        aria-hidden="true"
        style={{ y: ambientY, x: contourShiftX }}
        className="pointer-events-none absolute inset-0 overflow-hidden will-change-transform"
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

      <div className="relative z-10 max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-12 pt-2.5 pb-3 sm:pt-8 sm:pb-10 lg:pt-14 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-6 lg:gap-10 items-center">
          {/* Left Column on Desktop / Top Header Above Banner on Mobile */}
          <div className="order-1 lg:order-1 lg:col-span-6 xl:col-span-6 flex flex-col justify-between">
            {/* Row 1: JIYOO PREMIUM Eyebrow (Zero symbols, high visibility) */}
            <motion.div
              style={{ y: eyebrowY }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
              className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2.5 lg:mb-4"
            >
              <div className="min-w-0 inline-flex items-center">
                <span className="font-sans text-[13px] sm:text-[15px] lg:text-[16px] font-extrabold tracking-[0.22em] sm:tracking-[0.26em] uppercase text-[#1C1917] leading-none select-none">
                  JIYOO PREMIUM
                </span>
              </div>

              <div className="shrink-0 flex lg:hidden items-center justify-end">
                <VelvetWhatsAppButton
                  href={whatsappHref}
                  label="Order via WhatsApp"
                  size="compact"
                />
              </div>
            </motion.div>

            {/* Row 2 (div:nth-of-type(2)): Unified Responsive Display Headline & Smooth Editorial Tagline */}
            <motion.h1
              style={{ y: headlineY }}
              className="editorial-hero-headline font-medium text-[#1C1917] origin-left pb-0.5 text-balance"
            >
              {/* Line 1 (div:nth-of-type(1)): Static Display Words */}
              <div className="flex flex-wrap gap-x-[0.22em] sm:gap-x-[0.25em] pb-0.5 text-[18px] sm:text-[22px] lg:text-[clamp(1.85rem,3.1vw,3.25rem)] font-serif-luxury font-semibold lg:font-medium text-[#1C1917] leading-[1.18] lg:leading-[1.15]">
                {HEADLINE_LINE_1.map((word, index) => (
                  <span
                    key={word}
                    className="inline-block overflow-hidden py-0.5 -my-0.5 px-0.5 -mx-0.5"
                  >
                    <motion.span
                      initial={{
                        opacity: 0,
                        y: prefersReducedMotion ? 0 : '100%',
                      }}
                      animate={{ opacity: 1, y: '0%' }}
                      transition={{
                        duration: 0.65,
                        delay: 0.03 + index * 0.04,
                        ease: EASE_OUT_EXPO,
                      }}
                      className="inline-block origin-bottom-left"
                    >
                      {word}
                    </motion.span>
                  </span>
                ))}
              </div>

              {/* Line 2 (div:nth-of-type(2)): Smooth Editorial Serif Phrase Showcase (Zero Blank Frame) */}
              <div
                aria-label={HERO_TYPEWRITER_PHRASES[phraseIdx]}
                className="relative flex items-center pt-0.5 pb-2 lg:pb-3 min-h-[1.75rem] sm:min-h-[2.1rem] lg:min-h-[2.75rem] w-full text-[17px] sm:text-[20px] lg:text-[clamp(1.85rem,3.1vw,3.25rem)] leading-snug lg:leading-[1.15] overflow-hidden"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={phraseIdx}
                    initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                    className="block w-full font-serif-luxury italic font-semibold lg:font-normal text-[#7C4A24] lg:text-[#8A5A36] tracking-[0.01em] lg:tracking-[-0.01em]"
                  >
                    {HERO_TYPEWRITER_PHRASES[phraseIdx]}
                  </motion.span>
                </AnimatePresence>

                {/* Scroll-linked & Entrance-drawn Editorial Accent Hairline */}
                <motion.span
                  aria-hidden="true"
                  style={{ scaleX: horizonScaleX }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 1.05, delay: 0.52, ease: EASE_OUT_EXPO }}
                  className="pointer-events-none absolute left-0 bottom-0 h-[1.5px] w-full max-w-[260px] sm:max-w-[360px] bg-gradient-to-r from-[#8A5A36]/70 via-[#C5A880]/60 to-transparent origin-left"
                />
              </div>
            </motion.h1>

            {/* Desktop Subcopy & Primary CTA Row */}
            <div className="hidden lg:block">
              <motion.p
                style={{ y: subcopyY }}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.68, delay: 0.38, ease: EASE_OUT_EXPO }}
                className="mt-4 text-base text-[#44403C] font-sans-clean font-normal leading-[1.68] max-w-[58ch] text-left"
              >
                Fresh imported fruits, farm-fresh daily vegetables, and clean custom-cut meats made just how you like.
              </motion.p>

              <motion.div
                style={{ y: ctaY }}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.68, delay: 0.46, ease: EASE_OUT_EXPO }}
                className="mt-7 flex flex-wrap items-center gap-3.5"
              >
                <motion.button
                  type="button"
                  onClick={handleExploreCatalog}
                  whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.015 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  transition={{ duration: 0.16, ease: EASE_OUT_EXPO }}
                  className="group relative overflow-hidden inline-flex items-center justify-center gap-3 h-[50px] sm:h-[52px] px-7 text-xs font-semibold tracking-[0.12em] uppercase text-[#FAF9F5] bg-[#1C1917] hover:bg-[#292524] rounded-full border border-[#C5A880]/40 shadow-[0_10px_24px_-8px_rgba(28,25,23,0.38)] transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1917]"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-500 ease-out group-hover:translate-x-full" />
                  <span className="relative z-10">Shop Catalog</span>
                  <ArrowRight
                    className="relative z-10 w-3.5 h-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1"
                    strokeWidth={1.75}
                  />
                </motion.button>

                <VelvetWhatsAppButton
                  href={whatsappHref}
                  label="Order via WhatsApp"
                  size="modal"
                />
              </motion.div>
            </div>
          </div>

          {/* Right Column on Desktop / Order 2 on Mobile: Hero Banner Slideshow */}
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 18, scale: prefersReducedMotion ? 1 : 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.78, delay: 0.15, ease: EASE_OUT_EXPO }}
            style={{
              rotateX: showcaseRotateX,
              rotateY: showcaseRotateY,
              transformPerspective: 1200,
            }}
            className="order-2 lg:order-2 lg:col-span-6 xl:col-span-6 w-full will-change-transform"
          >
            <HeroSlideshow />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

