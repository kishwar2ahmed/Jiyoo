import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "../../../contexts/CartContext";
import { useSettings } from "../../../contexts/SettingsContext";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isQuickRefresh] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("jiyoo_splash_shown") === "1";
    } catch {
      return false;
    }
  });
  const [loadingText, setLoadingText] = useState(() =>
    isQuickRefresh ? "Welcome to JIYOO..." : "Preparing Curated Collection...",
  );
  const { user } = useCart();
  const { settings } = useSettings();
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (isQuickRefresh) {
      let finishTimer: ReturnType<typeof setTimeout> | undefined;
      const completeTimer = setTimeout(() => {
        setIsVisible(false);
        finishTimer = setTimeout(() => onCompleteRef.current(), 240);
      }, 600);
      return () => {
        clearTimeout(completeTimer);
        if (finishTimer) clearTimeout(finishTimer);
      };
    }

    const textTimer1 = setTimeout(
      () => setLoadingText("Selecting Finest Harvests..."),
      700,
    );
    const textTimer2 = setTimeout(
      () => setLoadingText("Welcome to JIYOO..."),
      1400,
    );

    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      finishTimer = setTimeout(() => onCompleteRef.current(), 420);
    }, 2100);

    return () => {
      clearTimeout(textTimer1);
      clearTimeout(textTimer2);
      clearTimeout(completeTimer);
      if (finishTimer) clearTimeout(finishTimer);
    };
  }, [isQuickRefresh]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          data-testid="jiyoo-splash-screen"
          role="status"
          aria-live="polite"
          aria-label="Loading JIYOO Curated Storefront"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.015 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] bg-[#f8f6f0] flex flex-col items-center justify-center p-6 overflow-hidden select-none supports-[height:100dvh]:h-[100dvh]"
        >
          {/* Textured luxury radial background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#FAF8F5] via-[#F3EFE6] to-[#E8E2D5] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(217,119,6,0.08)_0%,_transparent_60%)] pointer-events-none" />

          {/* Ambient champagne-gold luminescence particles */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {[...Array(14)].map((_, i) => {
              const leftPct = (i * 17 + 9) % 90 + 5;
              const topPct = (i * 23 + 11) % 84 + 8;
              const durationSec = 3.2 + (i % 4) * 0.65;
              const delaySec = (i % 5) * 0.22;
              return (
                <motion.div
                  key={i}
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                  className="absolute w-1.5 h-1.5 bg-[#C5A880]/35 rounded-full blur-[0.5px] will-change-transform"
                  initial={{ y: 0, scale: 0.7, opacity: 0 }}
                  animate={{
                    y: [-4, -44],
                    scale: [0.7, 1.15, 0.8],
                    opacity: [0, 0.65, 0],
                  }}
                  transition={{
                    duration: durationSec,
                    delay: delaySec,
                    repeat: Infinity,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              );
            })}
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center max-w-sm w-full text-center">
            {/* Premium Image Logo with Concentric Architectural Halo */}
            <div className="relative mb-8 flex items-center justify-center">
              <motion.div
                aria-hidden="true"
                initial={false}
                animate={{ scale: [0.96, 1.05, 0.98], opacity: [0.25, 0.5, 0.25] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                className="pointer-events-none absolute -inset-4 rounded-2xl border border-[#C5A880]/35"
              />
              <div className="relative flex items-center justify-center p-1.5 rounded-2xl bg-white/70 shadow-[0_20px_50px_-12px_rgba(28,25,23,0.14)] border border-[#E7E3DA]">
                <img
                  src={settings.logoUrl || "/jiyoo.logo.jpeg"}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith("/jiyoo.logo.jpeg")) {
                      target.src = "/jiyoo.logo.jpeg";
                    }
                  }}
                  alt="JIYOO Logo"
                  className="h-28 md:h-36 w-auto max-w-[80vw] object-contain rounded-xl"
                />
              </div>
            </div>

            {/* Personalized Greeting or Luxury Curation Title */}
            <div className="mb-8">
              <span className="text-[10px] md:text-xs tracking-[0.35em] uppercase text-stone-500 font-medium block mb-2">
                {user
                  ? `Welcome Back, ${(user.name || user.displayName || user.email || "Member").split(" ")[0]}`
                  : "Curated & Handpicked"}
              </span>
              <h1 className="font-serif-luxury text-3xl md:text-4xl tracking-widest text-[#1C1917] font-semibold">
                {settings.storeName?.split(' ')[0] || "JIYOO"}
              </h1>
              <p className="text-xs text-[#78716C] font-normal mt-1 tracking-widest uppercase">
                Fine Living &amp; Artisanal Pantry
              </p>
            </div>

            {/* Animated Progress Bar (Ultra-slim Luxury Champagne-Gold Hairline) */}
            <div className="w-full max-w-[210px] mb-3.5 px-2">
              <div className="h-[2px] w-full bg-stone-300/40 rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#C5A880] via-[#D4AF37] to-[#8A5A36] rounded-full relative shadow-[0_0_8px_rgba(212,175,55,0.65),0_0_3px_rgba(197,168,128,0.9)]"
                  initial={{ width: "8%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: isQuickRefresh ? 0.55 : 2.0, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Subtle leading light glint */}
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#FAF9F5] shadow-[0_0_6px_#D4AF37] opacity-90 pointer-events-none" />
                </motion.div>
              </div>
            </div>

            {/* Loading Status Text with Silky Vertical Crossfade */}
            <div className="h-5 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={loadingText}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                  className="text-[11px] tracking-wider text-stone-500 font-light"
                >
                  {loadingText}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Personal Curation Signature */}
            <div className="mt-10 pt-6 border-t border-stone-200/60 w-full flex flex-col items-center justify-center gap-1">
              <span className="text-[9px] tracking-[0.3em] uppercase text-stone-400 font-medium">
                Personalized Curation
              </span>
              <span className="text-xs font-serif italic text-stone-800 tracking-wider">
                by SHAM'S
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
