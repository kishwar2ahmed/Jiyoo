import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BannerSlide } from '../../../types';
import { DEFAULT_HERO_BANNERS } from '../../../constants/banners';
import { useSettings } from '../../../contexts/SettingsContext';
import { getOptimizedBannerUrl } from '../../../utils/imageUtils';

const FAST_AUTOPLAY_INTERVAL = 3600; // 3.6s for general category slides
const SLOW_AUTOPLAY_INTERVAL = 4500; // 4.5s for Diwali & featured highlight slides

interface PosterTypographySpec {
  side: 'left' | 'right';
  brandSeal?: string;
  eyebrow: string;
  mainTitle: string;
  subTitle: string;
  targetCategory?: string;
  openWholesale?: boolean;
  tone?: 'diwali-royal' | 'warm-forest' | 'coastal-navy' | 'sage-emerald' | 'espresso-gold';
}

/**
 * Maps each studio banner photograph to the exact sunlit wall negative-space side
 * ('left' or 'right') and bespoke print-grade poster typography matching the
 * Special Diwali Sale poster layout.
 */
function resolvePosterTypography(slide: BannerSlide): PosterTypographySpec | null {
  const id = (slide.id || '').toLowerCase();
  const img = (slide.image || '').toLowerCase();

  // Only classic diwali_special_sale and whatsapp_order_banner have baked-in graphic text inside the image
  if (
    id.startsWith('diwali-special') ||
    img.includes('diwali_special_sale') ||
    img.includes('file_000000002410821198a81a83a16d503f') ||
    id.includes('whatsapp') ||
    img.includes('whatsapp') ||
    img.includes('file_00000000e7e48211898141e9b8e21f64')
  ) {
    return null;
  }

  // 1. JIYOO Exclusive Diwali Fruit Hampers & Gift Boxes
  if (id.includes('jiyoo-diwali-hampers') || img.includes('jiyoo_diwali_hampers')) {
    return {
      side: 'left',
      brandSeal: 'JIYOO EXCLUSIVE',
      eyebrow: 'S P E C I A L   F E S T I V E',
      mainTitle: 'Diwali',
      subTitle: 'F R U I T   G I F T   B O X E S',
      targetCategory: 'fruits',
      tone: 'diwali-royal',
    };
  }

  // 2. JIYOO Exclusive Diwali Wholesale Box Sale (All Over India)
  if (id.includes('jiyoo-diwali-wholesale') || img.includes('jiyoo_diwali_wholesale')) {
    return {
      side: 'left',
      brandSeal: 'JIYOO WHOLESALE',
      eyebrow: 'A L L   I N D I A   D E L I V E R Y',
      mainTitle: 'Diwali',
      subTitle: 'W H O L E S A L E   B O X E S',
      openWholesale: true,
      tone: 'diwali-royal',
    };
  }

  // 3. JIYOO Exclusive Diwali Feast (Fresh Meat, Kebabs & Biryani)
  if (id.includes('jiyoo-diwali-feast') || img.includes('jiyoo_diwali_feast')) {
    return {
      side: 'left',
      brandSeal: 'JIYOO ROYAL FEAST',
      eyebrow: 'F R E S H   M E A T   &   B I R Y A N I',
      mainTitle: 'Diwali',
      subTitle: 'F E S T I V E   S A L E',
      targetCategory: 'meat',
      tone: 'diwali-royal',
    };
  }

  // 4. Wholesale All Over India Delivery
  if (id.includes('wholesale') || img.includes('wholesale_india_banner')) {
    return {
      side: 'left',
      brandSeal: 'JIYOO WHOLESALE',
      eyebrow: 'A L L   O V E R   I N D I A',
      mainTitle: 'Wholesale',
      subTitle: 'F R U I T   B O X E S',
      openWholesale: true,
      tone: 'espresso-gold',
    };
  }

  // 5. Hot & Fresh Fast Food
  if (id.includes('fast-foods') || img.includes('fast_foods_banner')) {
    return {
      side: 'left',
      brandSeal: 'JIYOO KITCHEN',
      eyebrow: 'H O T   &   F R E S H',
      mainTitle: 'Fast Food',
      subTitle: 'P I Z Z A   ·   B I R Y A N I',
      targetCategory: 'fast-foods',
      tone: 'espresso-gold',
    };
  }

  if (id.includes('indian-fruits') || img.includes('02_indian_fruits')) {
    return {
      side: 'right',
      brandSeal: 'JIYOO FRESH',
      eyebrow: 'F A R M   F R E S H   D A I L Y',
      mainTitle: 'Indian',
      subTitle: 'F R E S H   F R U I T S',
      targetCategory: 'fruits',
      tone: 'warm-forest',
    };
  }

  if (id.includes('imported-fruits') || img.includes('03_imported_fruits')) {
    return {
      side: 'left',
      brandSeal: 'JIYOO PREMIUM',
      eyebrow: 'D A I L Y   F R E S H',
      mainTitle: 'Imported',
      subTitle: 'F R E S H   F R U I T S',
      targetCategory: 'fruits',
      tone: 'warm-forest',
    };
  }

  if (id.includes('thai-veggies') || img.includes('04_indian_thai_vegetables')) {
    return {
      side: 'right',
      brandSeal: 'JIYOO FRESH',
      eyebrow: 'M O R N I N G   H A R V E S T',
      mainTitle: 'Daily',
      subTitle: 'F R E S H   V E G G I E S',
      targetCategory: 'vegetables',
      tone: 'sage-emerald',
    };
  }

  if (id.includes('fresh-meats') || img.includes('05_fresh_meat_cuts')) {
    return {
      side: 'right',
      brandSeal: 'JIYOO FRESH CUTS',
      eyebrow: '1 0 0 %   C L E A N   &   F R E S H',
      mainTitle: 'Fresh',
      subTitle: 'C H I C K E N   &   M U T T O N',
      targetCategory: 'meat',
      tone: 'espresso-gold',
    };
  }

  if (id.includes('fish-seafood') || img.includes('06_fish_and_seafood')) {
    return {
      side: 'left',
      brandSeal: 'JIYOO SEAFOOD',
      eyebrow: 'D A I L Y   F R E S H   C A T C H',
      mainTitle: 'Fresh',
      subTitle: 'F I S H   &   P R A W N S',
      targetCategory: 'meat',
      tone: 'coastal-navy',
    };
  }

  if (id.includes('cold-smoothies') || img.includes('07_smoothies')) {
    return {
      side: 'left',
      brandSeal: 'JIYOO SMOOTHIES',
      eyebrow: '1 0 0 %   R E A L   F R U I T',
      mainTitle: 'Fresh',
      subTitle: 'F R U I T   S M O O T H I E S',
      targetCategory: 'smoothies',
      tone: 'warm-forest',
    };
  }

  if (id.includes('fresh-preparation') || img.includes('08_everyday_fresh_preparation')) {
    return {
      side: 'left',
      brandSeal: 'JIYOO DAILY',
      eyebrow: 'R E A D Y   T O   C O O K',
      mainTitle: 'Clean',
      subTitle: 'K I T C H E N   V E G G I E S',
      targetCategory: 'vegetables',
      tone: 'warm-forest',
    };
  }

  if (id.includes('grocery-basket') || img.includes('09_grocery_basket')) {
    return {
      side: 'right',
      brandSeal: 'JIYOO HOME',
      eyebrow: 'D A I L Y   E S S E N T I A L S',
      mainTitle: 'Daily',
      subTitle: 'F A M I L Y   B A S K E T',
      targetCategory: 'fruits',
      tone: 'warm-forest',
    };
  }

  if (id.includes('fruit-bowl') || img.includes('10_fruit_bowl')) {
    return {
      side: 'left',
      brandSeal: 'JIYOO FRESH',
      eyebrow: 'R E A D Y   T O   E A T',
      mainTitle: 'Fresh',
      subTitle: 'F R U I T   B O W L S',
      targetCategory: 'fruits',
      tone: 'warm-forest',
    };
  }

  if (slide.hideCaption) return null;

  return {
    side: 'left',
    brandSeal: 'JIYOO PREMIUM',
    eyebrow: (slide.badge || 'FRESH DAILY').toUpperCase(),
    mainTitle: slide.title || 'Fresh Selection',
    subTitle: 'D E L I V E R E D   F A S T',
    targetCategory: 'fruits',
    tone: 'warm-forest',
  };
}

export function HeroSlideshow() {
  const { settings } = useSettings();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slides = useMemo<BannerSlide[]>(() => {
    const raw =
      settings.heroBanners && settings.heroBanners.length > 0
        ? settings.heroBanners
        : DEFAULT_HERO_BANNERS;
    const active = raw
      .filter((b) => b.isActive !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((b) => ({
        ...b,
        image: getOptimizedBannerUrl(b.image),
      }));
    const base = active.length > 0 ? active : DEFAULT_HERO_BANNERS;

    // Ensure all core DEFAULT_HERO_BANNERS are present even if remote settings had an older list
    const mergedBase = [...base];
    DEFAULT_HERO_BANNERS.forEach((defSlide) => {
      const exists = mergedBase.some(
        (b) =>
          b.id === defSlide.id ||
          b.image === getOptimizedBannerUrl(defSlide.image) ||
          b.image === defSlide.image
      );
      if (!exists) {
        mergedBase.push({
          ...defSlide,
          image: getOptimizedBannerUrl(defSlide.image),
        });
      }
    });

    // 1. Collect all 4 Diwali Sale banners (prioritizing the 3 clean JIYOO studio banners without diyas)
    const diwaliOrderedIds = [
      'jiyoo-diwali-hampers',
      'jiyoo-diwali-feast',
      'jiyoo-diwali-wholesale',
      'diwali-special',
    ];

    const diwaliBanners: BannerSlide[] = [];
    diwaliOrderedIds.forEach((pid) => {
      const found = mergedBase.find(
        (b) =>
          b.id === pid ||
          (pid === 'jiyoo-diwali-hampers' && b.image?.includes('jiyoo_diwali_hampers')) ||
          (pid === 'diwali-special' && b.image?.includes('diwali_special_sale')) ||
          (pid === 'jiyoo-diwali-feast' && b.image?.includes('jiyoo_diwali_feast')) ||
          (pid === 'jiyoo-diwali-wholesale' && b.image?.includes('jiyoo_diwali_wholesale'))
      );
      if (found) {
        diwaliBanners.push({
          ...found,
          durationMs: SLOW_AUTOPLAY_INTERVAL,
          isFeatured: true,
        });
      }
    });

    // Any additional custom Diwali banners added by admin
    mergedBase.forEach((b) => {
      const isDiwali =
        b.id?.toLowerCase().includes('diwali') ||
        b.image?.toLowerCase().includes('diwali');
      if (isDiwali && !diwaliBanners.some((d) => d.id === b.id)) {
        diwaliBanners.push({
          ...b,
          durationMs: SLOW_AUTOPLAY_INTERVAL,
          isFeatured: true,
        });
      }
    });

    const diwaliIdSet = new Set(diwaliBanners.map((d) => d.id));

    // 2. Collect all General / Category / Storefront banners in a balanced order
    const preferredGeneralOrder = [
      'imported-fruits',
      'fresh-meats',
      'wholesale-india',
      'indian-fruits',
      'thai-veggies',
      'fast-foods-banner',
      'fish-seafood',
      'cold-smoothies',
      'whatsapp-order',
      'fresh-preparation',
      'grocery-basket',
      'fruit-bowl',
    ];

    const generalPool = mergedBase.filter((b) => !diwaliIdSet.has(b.id));
    const generalBanners: BannerSlide[] = [];

    preferredGeneralOrder.forEach((gid) => {
      const found = generalPool.find((b) => b.id === gid);
      if (found && !generalBanners.some((g) => g.id === found.id)) {
        generalBanners.push({
          ...found,
          durationMs:
            found.id === 'wholesale-india' || found.id === 'whatsapp-order'
              ? SLOW_AUTOPLAY_INTERVAL
              : FAST_AUTOPLAY_INTERVAL,
        });
      }
    });

    generalPool.forEach((b) => {
      if (!generalBanners.some((g) => g.id === b.id)) {
        generalBanners.push({
          ...b,
          durationMs: FAST_AUTOPLAY_INTERVAL,
        });
      }
    });

    // 3. Weave Diwali banners "beech-beech mein" (1 Diwali banner after every 2 General banners)
    // Pattern: Diwali #1 -> General #1 -> General #2 -> Diwali #2 -> General #3 -> General #4 -> Diwali #3...
    if (diwaliBanners.length > 0 && generalBanners.length > 0) {
      const interleaved: BannerSlide[] = [];
      let diwaliCursor = 0;

      generalBanners.forEach((genSlide, gIdx) => {
        // Insert a Diwali banner at the start and after every 2 general banners
        if (gIdx % 2 === 0) {
          const dSlide = diwaliBanners[diwaliCursor % diwaliBanners.length];
          interleaved.push({
            ...dSlide,
            id: `${dSlide.id}-interleaved-${diwaliCursor}`,
          });
          diwaliCursor++;
        }

        interleaved.push({
          ...genSlide,
          id: `${genSlide.id}-general-${gIdx}`,
        });
      });

      return interleaved;
    }

    return mergedBase;
  }, [settings.heroBanners]);

  const total = slides.length;

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
  const posterSpec = useMemo(
    () => (currentSlide ? resolvePosterTypography(currentSlide) : null),
    [currentSlide]
  );

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

  const isWholesaleSlide = Boolean(
    currentSlide?.id?.includes('wholesale') ||
      currentSlide?.image?.includes('wholesale_india_banner')
  );

  const isSlowSlide = isDiwaliSlide || isWhatsAppSlide || isWholesaleSlide || currentSlide?.isFeatured;
  const currentDuration =
    currentSlide?.durationMs || (isSlowSlide ? SLOW_AUTOPLAY_INTERVAL : FAST_AUTOPLAY_INTERVAL);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      goToNext();
    } else if (e.key === 'ArrowLeft') {
      goToPrev();
    }
  };

  useEffect(() => {
    if (slides.length <= 1) return;
    const nextSlide = slides[(currentIndex + 1) % slides.length];
    if (nextSlide?.image) {
      const img = new Image();
      img.decoding = 'async';
      img.src = nextSlide.image;
    }
  }, [currentIndex, slides]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const uniqueUrls = Array.from(new Set(slides.map((s) => s.image).filter(Boolean)));
      uniqueUrls.forEach((url) => {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
      });
    }, 4500);
    return () => clearTimeout(timer);
  }, [slides]);

  const handleBannerAction = () => {
    if (isWhatsAppSlide) {
      document.dispatchEvent(new CustomEvent('open-whatsapp-checkout'));
      return;
    }
    if (posterSpec?.openWholesale || currentSlide?.linkUrl === '#wholesale') {
      document.dispatchEvent(new CustomEvent('open-wholesale'));
      return;
    }
    if (posterSpec?.targetCategory) {
      window.dispatchEvent(
        new CustomEvent('select-category', { detail: posterSpec.targetCategory })
      );
      return;
    }
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const tonePalette =
    posterSpec?.tone === 'coastal-navy'
      ? {
          crest: '#1E4E68',
          seal: '#1E4E68',
          eyebrow: '#163A4F',
          main: '#0C2536',
          sub: '#8A4F22',
        }
      : posterSpec?.tone === 'sage-emerald'
      ? {
          crest: '#6B4423',
          seal: '#6B4423',
          eyebrow: '#1A3324',
          main: '#0F2619',
          sub: '#7D441B',
        }
      : posterSpec?.tone === 'diwali-royal'
      ? {
          crest: '#9A4B1A',
          seal: '#8B4519',
          eyebrow: '#142319',
          main: '#0D2115',
          sub: '#9A4B1A',
        }
      : {
          crest: '#8B4519',
          seal: '#8B4519',
          eyebrow: '#142319',
          main: '#0F2417',
          sub: '#9A4B1A',
        };

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
      onClick={handleBannerAction}
      className={`group relative w-full overflow-hidden rounded-xl sm:rounded-2xl border transition-all duration-700 select-none cursor-pointer ${
        isDiwaliSlide || isWholesaleSlide
          ? 'border-[#C5A880] shadow-[0_14px_38px_-10px_rgba(138,90,54,0.34)] ring-1.5 ring-[#C5A880]/75 bg-[#F3E9D8]'
          : isWhatsAppSlide
          ? 'border-emerald-700/50 shadow-[0_6px_25px_-4px_rgba(5,150,105,0.25)] ring-1.5 ring-emerald-600/30 bg-[#F6EFE6]'
          : 'border-[#DCD4C6] bg-[#EFE9DE] shadow-[0_12px_36px_-12px_rgba(28,25,23,0.18)] focus-visible:outline-2 focus-visible:outline-[#8A5A36]'
      }`}
    >
      {/* Aspect Ratio Container: Matched to 2048x768 (8:3) banner proportions */}
      <div
        className={`relative w-full aspect-[2048/768] overflow-hidden transition-colors duration-700 ${
          isWhatsAppSlide ? 'bg-[#F6EFE6]' : 'bg-[#EFE9DE]'
        }`}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0.1 : 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={`absolute inset-0 w-full h-full flex items-center justify-center will-change-[opacity] ${
              isWhatsAppSlide ? 'bg-[#F6EFE6]' : 'bg-[#EFE9DE]'
            }`}
          >
            <motion.img
              src={currentSlide.image}
              alt={currentSlide.alt}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/banners/diwali_special_sale.webp')) {
                  target.src = '/banners/diwali_special_sale.webp';
                }
              }}
              initial={
                prefersReducedMotion
                  ? { scale: 1 }
                  : { scale: isWhatsAppSlide ? 0.99 : 1.03 }
              }
              animate={{ scale: 1 }}
              transition={{
                duration: prefersReducedMotion
                  ? 0.1
                  : isWhatsAppSlide
                  ? 0.85
                  : Math.max(2.6, currentDuration / 1000),
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`w-full h-full pointer-events-none select-none will-change-transform ${
                isWhatsAppSlide
                  ? 'object-contain object-center'
                  : 'object-cover object-center'
              }`}
            />

            {/* Bespoke Print-Grade Poster Typography in the Studio Sunlit Wall Negative Space */}
            {posterSpec && (
              <div
                className={`pointer-events-none absolute inset-y-0 z-20 flex flex-col items-center justify-center text-center px-3 sm:px-5 lg:px-6 pb-4 sm:pb-8 w-[45%] sm:w-[44%] ${
                  posterSpec.side === 'left' ? 'left-0' : 'right-0'
                }`}
              >
                {/* Clean Modern Luxury Botanical Leaf & Crown Crest (Zero Diya/Pooja Motif) */}
                <svg
                  viewBox="0 0 72 28"
                  fill="none"
                  aria-hidden="true"
                  className="w-8 h-3.5 sm:w-12 sm:h-5 mb-1 sm:mb-1.5 shrink-0"
                >
                  {/* Center Diamond Leaf */}
                  <path
                    d="M36 3L40.5 11.5L36 21L31.5 11.5L36 3Z"
                    stroke={tonePalette.crest}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Left & Right Botanical Leaves */}
                  <path
                    d="M32 20C25 17 20 12.5 18 7C24 8.5 28.5 12.5 31 17.5"
                    stroke={tonePalette.crest}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M40 20C47 17 52 12.5 54 7C48 8.5 43.5 12.5 41 17.5"
                    stroke={tonePalette.crest}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Subtle Base Accent */}
                  <path
                    d="M22 24H50"
                    stroke={tonePalette.crest}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    opacity="0.65"
                  />
                </svg>

                {/* Single Clean Wide-Tracked Eyebrow */}
                <span
                  style={{ color: tonePalette.eyebrow }}
                  className="font-sans text-[7px] sm:text-[9.5px] lg:text-[10.5px] font-semibold uppercase tracking-[0.16em] sm:tracking-[0.22em] leading-none mb-0.5 sm:mb-1"
                >
                  {posterSpec.eyebrow}
                </span>

                {/* Monumental High-Contrast Serif Display Word */}
                <h3
                  style={{ color: tonePalette.main }}
                  className={`font-serif-luxury font-bold tracking-tight leading-[0.95] ${
                    posterSpec.tone === 'diwali-royal'
                      ? 'text-2xl sm:text-5xl lg:text-[54px]'
                      : 'text-xl sm:text-4xl lg:text-[44px]'
                  }`}
                >
                  {posterSpec.mainTitle}
                </h3>

                {/* Terracotta-Gold Serif Sub-Headline */}
                <span
                  style={{ color: tonePalette.sub }}
                  className="font-serif-luxury text-[8px] sm:text-xs lg:text-[13px] font-semibold uppercase tracking-[0.14em] sm:tracking-[0.18em] mt-0.5 sm:mt-1.5 leading-tight"
                >
                  {posterSpec.subTitle}
                </span>

                {/* Fine Architectural Rule with Center Diamond (────── ◆ ──────) */}
                <div
                  aria-hidden="true"
                  className="flex items-center justify-center gap-1.5 sm:gap-2 w-24 sm:w-36 mt-1.5 sm:mt-2"
                >
                  <span
                    style={{ backgroundColor: tonePalette.crest }}
                    className="h-[1px] flex-1 opacity-45"
                  />
                  <span
                    style={{ backgroundColor: tonePalette.crest }}
                    className="w-1.5 h-1.5 rotate-45 opacity-80 shrink-0"
                  />
                  <span
                    style={{ backgroundColor: tonePalette.crest }}
                    className="h-[1px] flex-1 opacity-45"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Subtle Edge Ring for Refined Luxury Finish */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl transition-all duration-500 z-10 ${
            isDiwaliSlide || isWholesaleSlide
              ? 'ring-1 ring-inset ring-[#C5A880]/55'
              : isWhatsAppSlide
              ? 'ring-1 ring-inset ring-emerald-600/20'
              : 'ring-1 ring-inset ring-black/8'
          }`}
        />

        {/* Navigation Arrows */}
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

        {/* Top Dynamic Progress Bar for Current Slide */}
        {!prefersReducedMotion && (
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-black/15 backdrop-blur-[1px] z-30 overflow-hidden pointer-events-none">
            <motion.div
              key={`progress-${currentIndex}-${isPaused}-${currentDuration}`}
              initial={{ width: '0%' }}
              animate={{ width: isPaused ? '0%' : '100%' }}
              transition={{
                duration: isPaused ? 0 : currentDuration / 1000,
                ease: 'linear',
              }}
              className="h-full bg-gradient-to-r from-[#C5A880] via-[#D4AF37] to-[#8A5A36] shadow-[0_0_10px_rgba(212,175,55,0.85),0_0_4px_rgba(197,168,128,0.95)]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
