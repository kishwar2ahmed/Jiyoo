import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BannerSlide } from '../../../types';
import { DEFAULT_HERO_BANNERS } from '../../../constants/banners';
import { useSettings } from '../../../contexts/SettingsContext';

export type { BannerSlide };
export const HERO_BANNERS = DEFAULT_HERO_BANNERS;

const FAST_AUTOPLAY_INTERVAL = 2800; // 2.8s: category banners change fast-fast
const SLOW_AUTOPLAY_INTERVAL = 7500; // 7.5s: Diwali and Coming Soon banners stay comfortably slow

export function HeroSlideshow() {
  const { settings } = useSettings();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build the slides array, interleaving Diwali & WhatsApp banners frequently with fast category slides
  const slides = useMemo<BannerSlide[]>(() => {
    const raw = settings.heroBanners && settings.heroBanners.length > 0 
      ? settings.heroBanners 
      : DEFAULT_HERO_BANNERS;
    const active = raw
      .filter((b) => b.isActive !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const base = active.length > 0 ? active : DEFAULT_HERO_BANNERS;

    // Identify featured priority banners: Diwali Festive Sale & Coming Soon WhatsApp Order
    const diwaliBanner = base.find((b) => 
      b.id?.includes('diwali') || 
      b.image?.includes('diwali') || 
      b.image?.includes('file_000000002410821198a81a83a16d503f')
    );

    const whatsAppBanner = base.find((b) => 
      b.id?.includes('whatsapp') || 
      b.image?.includes('whatsapp') || 
      b.image?.includes('file_00000000e7e48211898141e9b8e21f64')
    );

    const highlightBanners: BannerSlide[] = [];
    if (diwaliBanner) {
      highlightBanners.push({
        ...diwaliBanner,
        durationMs: SLOW_AUTOPLAY_INTERVAL,
        isFeatured: true,
      });
    }
    if (whatsAppBanner) {
      highlightBanners.push({
        ...whatsAppBanner,
        durationMs: SLOW_AUTOPLAY_INTERVAL,
        isFeatured: true,
        hideCaption: true,
      });
    }

    // Regular category banners to advance fast
    const categorySlides = base.filter((b) => 
      b.id !== diwaliBanner?.id && 
      b.id !== whatsAppBanner?.id && 
      !b.image?.includes('diwali') && 
      !b.image?.includes('whatsapp') && 
      !b.image?.includes('file_000000002410821198a81a83a16d503f') &&
      !b.image?.includes('file_00000000e7e48211898141e9b8e21f64')
    );

    // If highlights are present, interleave them every 2 fast category slides
    if (highlightBanners.length > 0 && categorySlides.length > 0) {
      const interleaved: BannerSlide[] = [];
      let catIdx = 0;
      let highlightCycle = 0;

      // Start with first highlight (Diwali Special Sale)
      const firstHighlight = highlightBanners[0];
      interleaved.push({
        ...firstHighlight,
        id: `${firstHighlight.id}-featured-${highlightCycle++}`,
      });

      // Insert 2 fast category slides, then alternate with the next highlight banner
      while (catIdx < categorySlides.length) {
        for (let i = 0; i < 2 && catIdx < categorySlides.length; i++) {
          interleaved.push({
            ...categorySlides[catIdx],
            durationMs: FAST_AUTOPLAY_INTERVAL,
          });
          catIdx++;
        }

        if (catIdx < categorySlides.length) {
          const nextHighlight = highlightBanners[highlightCycle % highlightBanners.length];
          interleaved.push({
            ...nextHighlight,
            id: `${nextHighlight.id}-featured-${highlightCycle++}`,
          });
        }
      }

      return interleaved;
    }

    return base;
  }, [settings.heroBanners]);

  const total = slides.length;

  // Auto-correct index if banners list changes
  useEffect(() => {
    if (currentIndex >= total) {
      setCurrentIndex(0);
    }
  }, [currentIndex, total]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const currentSlide = slides[currentIndex] || slides[0];

  const isDiwaliSlide = Boolean(
    currentSlide?.id?.includes('diwali') || 
    currentSlide?.image?.includes('diwali') || 
    currentSlide?.image?.includes('file_000000002410821198a81a83a16d503f')
  );

  const isWhatsAppSlide = Boolean(
    currentSlide?.id?.includes('whatsapp') ||
    currentSlide?.image?.includes('whatsapp') ||
    currentSlide?.image?.includes('file_00000000e7e48211898141e9b8e21f64')
  );

  const isSlowSlide = isDiwaliSlide || isWhatsAppSlide || currentSlide?.isFeatured;

  // Dynamic duration: Diwali & Coming Soon banners stay slow (7.5s), regular category banners change fast (2.8s)
  const currentDuration = currentSlide?.durationMs || (isSlowSlide ? SLOW_AUTOPLAY_INTERVAL : FAST_AUTOPLAY_INTERVAL);

  // Autoplay handler with variable per-slide duration
  useEffect(() => {
    if (isPaused || prefersReducedMotion) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(() => {
      goToNext();
    }, currentDuration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [goToNext, isPaused, prefersReducedMotion, currentIndex, currentDuration]);

  // Touch Swipe gestures for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const diffX = touchStartX.current - touchEndX.current;
      const minSwipeDistance = 40;
      if (diffX > minSwipeDistance) {
        goToNext();
      } else if (diffX < -minSwipeDistance) {
        goToPrev();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
    setIsPaused(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      goToNext();
    } else if (e.key === 'ArrowLeft') {
      goToPrev();
    }
  };

  // Preload upcoming slide image to guarantee instantaneous, stutter-free transitions
  useEffect(() => {
    if (slides.length <= 1) return;
    const nextIdx = (currentIndex + 1) % slides.length;
    const nextSlide = slides[nextIdx];
    if (nextSlide?.image) {
      const img = new Image();
      img.src = nextSlide.image;
    }
  }, [currentIndex, slides]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Fresh Category Highlights Showcase"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full overflow-hidden rounded-xl sm:rounded-2xl border transition-all duration-700 select-none ${
        isDiwaliSlide
          ? 'border-amber-400/90 shadow-[0_0_35px_-4px_rgba(245,158,11,0.55)] ring-2 ring-amber-400/80 bg-gradient-to-br from-amber-950/20 via-stone-900 to-black'
          : isWhatsAppSlide
          ? 'border-emerald-700/50 shadow-[0_6px_25px_-4px_rgba(5,150,105,0.25)] ring-1.5 ring-emerald-600/30 bg-[#F6EFE6]'
          : 'border-[#E7E2D8] bg-[#1C1917]/5 shadow-[0_10px_35px_-12px_rgba(28,25,23,0.18)] focus-visible:outline-2 focus-visible:outline-[#8A5A36]'
      }`}
    >
      {/* Aspect Ratio Container: Matched to 2048x768 (8:3) banner proportions so nothing is cropped */}
      <div className={`relative w-full aspect-[2048/768] overflow-hidden transition-colors duration-700 ${
        isWhatsAppSlide ? 'bg-[#F6EFE6]' : 'bg-stone-900'
      }`}>
        {/* Silky Overlapping Crossfade: Zero flash, continuous smooth blend */}
        <AnimatePresence initial={false}>
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0.1 : 0.75,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className={`absolute inset-0 w-full h-full flex items-center justify-center will-change-[opacity] ${
              isWhatsAppSlide ? 'bg-[#F6EFE6]' : 'bg-stone-900'
            }`}
          >
            <img
              src={currentSlide.image}
              alt={currentSlide.alt}
              loading={currentIndex === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className={`w-full h-full pointer-events-none select-none ${
                isWhatsAppSlide
                  ? 'object-contain object-center'
                  : 'object-cover object-center'
              }`}
            />
          </motion.div>
        </AnimatePresence>

        {/* Ambient Warm Golden Aura for Diwali Slide */}
        {isDiwaliSlide && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-black/40 z-10 animate-pulse duration-1000"
          />
        )}

        {/* Ambient Emerald Aura for WhatsApp Slide */}
        {isWhatsAppSlide && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-radial-gradient from-emerald-600/5 via-transparent to-transparent z-10"
          />
        )}

        {/* Subtle Edge Ring for Refined Luxury Finish */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl transition-all duration-500 z-10 ${
            isDiwaliSlide 
              ? 'ring-1 ring-inset ring-amber-400/40' 
              : isWhatsAppSlide 
              ? 'ring-1 ring-inset ring-emerald-600/20'
              : 'ring-1 ring-inset ring-white/10'
          }`}
        />

        {/* Classy & Premium Editorial Bottom Caption (only for slides without built-in graphics) */}
        <AnimatePresence>
          {currentSlide.title && !currentSlide.hideCaption && (
            <motion.div
              key={`caption-container-${currentSlide.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute inset-x-0 bottom-0 pt-10 sm:pt-14 pb-2.5 sm:pb-3.5 px-3.5 sm:px-5 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none z-20"
            >
              <motion.div
                key={`caption-${currentSlide.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className="max-w-[90%]"
              >
                <h3
                  className={`font-serif text-sm sm:text-base lg:text-xl font-medium tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] ${
                    isDiwaliSlide ? 'text-amber-200' : 'text-white'
                  }`}
                >
                  {currentSlide.title}
                </h3>
                {currentSlide.subtitle && (
                  <p className="mt-0.5 text-[10.5px] sm:text-xs text-stone-300 font-sans tracking-normal line-clamp-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                    {currentSlide.subtitle}
                  </p>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Arrows (Hover / Focus visible on desktop, unobtrusive on mobile) */}
        <div className="absolute inset-y-0 left-2 right-2 flex items-center justify-between z-30 pointer-events-none">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            aria-label="Previous banner"
            className="pointer-events-auto p-1.5 sm:p-2 rounded-full bg-black/45 hover:bg-black/75 backdrop-blur-md text-white/90 hover:text-white border border-white/15 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            aria-label="Next banner"
            className="pointer-events-auto p-1.5 sm:p-2 rounded-full bg-black/45 hover:bg-black/75 backdrop-blur-md text-white/90 hover:text-white border border-white/15 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Top Dynamic Progress Bar for Current Slide (Signature JIYOO Blue Morpho Butterfly Cyan) */}
        {!prefersReducedMotion && (
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-black/20 backdrop-blur-[1px] z-30 overflow-hidden pointer-events-none">
            <motion.div
              key={`progress-${currentIndex}-${isPaused}-${currentDuration}`}
              initial={{ width: '0%' }}
              animate={{ width: isPaused ? '0%' : '100%' }}
              transition={{
                duration: isPaused ? 0 : currentDuration / 1000,
                ease: 'linear',
              }}
              className="h-full bg-gradient-to-r from-[#00D2FF] via-[#0EA5E9] to-[#0284C7] shadow-[0_0_10px_rgba(14,165,233,0.9),0_0_4px_rgba(56,189,248,1)]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
