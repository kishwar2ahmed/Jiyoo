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
import { TypewriterText } from '../../core/components/TypewriterText';
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

const MOBILE_HERO_TYPEWRITER_PHRASES = [
  'Exotic fruits, daily veggies & fresh custom-cut meats.',
  'Cleaned with pure RO water & delivered cold to your home.',
  'Handpicked imported fruits, coastal fish & rich smoothies.',
] as const;

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
      className="relative w-full bg-gradient-to-b from-[#FAF8F3] via-white to-[#FCFBF8] border-b border-[#E5DEC9] overflow-hidden"
    >
      {/* Bespoke Warm Botanical & Architectural Contour Backdrop */}
      <motion.div
        aria-hidden="true"
        style={{ y: ambientY, x: contourShiftX }}
        className="pointer-events-none absolute inset-0 overflow-hidden will-change-transform"
      >
        <div className="absolute -top-32 right-[-8%] w-[560px] h-[560px] rounded-full bg-[radial-gradient(circle,rgba(197,168,128,0.14)_0%,rgba(255,255,255,0)_70%)]" />
        <div className="absolute bottom-[-20%] left-[-6%] w-[480px] h-[480px] rounded-full bg-[radial-gradient(circle,rgba(235,226,208,0.45)_0%,rgba(255,255,255,0)_72%)]" />
      </motion.div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-12 pt-2.5 pb-3 sm:pt-8 sm:pb-10 lg:pt-14 lg:pb-16">
        <motion.div
          style={{ opacity: heroOpacity }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-6 lg:gap-10 items-center"
        >
          {/* Left Column on Desktop / Top Strip Above Banner on Mobile */}
          <div className="order-1 lg:order-1 lg:col-span-6 xl:col-span-6 flex flex-col justify-between">
            {/* Desktop Editorial Headline & Value Prop */}
            <div className="hidden lg:block">
              {/* Restrained Editorial Eyebrow with Champagne-Gold Accent Line */}
              <div className="mb-4 flex items-center gap-2.5 text-xs sm:text-sm text-[#57534E] font-sans">
                <span className="inline-block w-6 h-[1.5px] bg-[#C5A880]" aria-hidden="true" />
                <span className="text-[#1C1917] font-bold tracking-[0.14em] uppercase text-xs">JIYOO RESERVE</span>
                <span aria-hidden="true" className="text-[#C5A880]">•</span>
                <span className="font-serif-luxury italic text-base text-[#6B4C35]">Fresh Harvest &amp; Custom Cuts</span>
              </div>

              {/* Word-by-Word Kinetic Display Headline with Solid Typography */}
              <motion.h1
                style={{ y: headlineY, scale: headlineScale }}
                className="editorial-hero-headline font-semibold text-[#1C1917] origin-left"
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

                <span className="relative block pt-0.5 pb-2.5">
                  <TypewriterText
                    phrases={HERO_TYPEWRITER_PHRASES}
                    typingSpeed={44}
                    deletingSpeed={22}
                    pauseDuration={2900}
                    startDelay={1100}
                    textClassName="italic font-normal text-[#6B4C35] tracking-tight"
                    cursorClassName="bg-[#8C6D46]"
                    ariaLabel="fresh custom-cut meats, delivered fast."
                  />
                </span>
              </motion.h1>

              {/* Concise Editorial Value Proposition */}
              <p className="mt-4 text-base text-[#57534E] font-sans font-normal leading-[1.7] max-w-[56ch] text-left">
                Fresh imported fruits, farm-fresh daily vegetables, and clean custom-cut meats made just how you like.
              </p>

              {/* Primary & Secondary Conversion Actions */}
              <div className="mt-7 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={handleExploreCatalog}
                  className="group relative overflow-hidden inline-flex items-center justify-center gap-2.5 h-12 px-7 text-xs font-bold uppercase tracking-[0.12em] text-[#F5E6C8] bg-[#1C1917] hover:bg-black border border-[#C5A880]/70 rounded-full shadow-[0_10px_24px_-6px_rgba(28,25,23,0.3)] transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Shop Catalog</span>
                  <ArrowRight
                    className="w-3.5 h-3.5 text-[#E5C99B] transition-transform duration-200 ease-out group-hover:translate-x-1"
                    strokeWidth={2.2}
                  />
                </button>

                <VelvetWhatsAppButton
                  href={whatsappHref}
                  label="Order via WhatsApp"
                  size="modal"
                />
              </div>
            </div>

            {/* Mobile Strip Above Banner: Bold JIYOO PREMIUM + Velvet Maroon WhatsApp Pill Button + Compact Editorial Typewriter */}
            <div className="block lg:hidden pb-0.5">
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-gradient-to-r from-[#FAF6EE] via-[#FDFBF7] to-[#FAF6EE] border border-[#E2D6C1] shadow-[0_4px_14px_-6px_rgba(28,25,23,0.08)]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C5A880] shrink-0" aria-hidden="true" />
                    <span className="font-serif-luxury font-bold text-xs sm:text-sm tracking-[0.16em] uppercase text-[#1C1917] block truncate">
                      JIYOO PREMIUM
                    </span>
                  </div>
                  <div className="min-h-[1.15rem] flex items-center overflow-hidden mt-0.5">
                    <TypewriterText
                      phrases={MOBILE_HERO_TYPEWRITER_PHRASES}
                      typingSpeed={42}
                      deletingSpeed={20}
                      pauseDuration={2700}
                      startDelay={800}
                      reserveLongestSpace={false}
                      className="truncate max-w-full"
                      textClassName="font-serif-luxury italic text-[11.5px] sm:text-xs text-[#6B4C35] tracking-wide"
                      cursorClassName="bg-[#8A5A36]"
                    />
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-end">
                  <VelvetWhatsAppButton
                    href={whatsappHref}
                    label="Order via WhatsApp"
                    size="compact"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column on Desktop / Order 2 on Mobile (Below JIYOO PREMIUM bar): Hero Banner Slideshow */}
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
        </motion.div>
      </div>
    </section>
  );
}

