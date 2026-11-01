import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "../../../contexts/CartContext";
import { useSettings } from "../../../contexts/SettingsContext";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);
  const [loadingText, setLoadingText] = useState(
    "Preparing Curated Collection...",
  );
  const { user } = useCart();
  const { settings } = useSettings();
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const textTimer1 = setTimeout(
      () => setLoadingText("Preparing Your Experience..."),
      600,
    );
    const textTimer2 = setTimeout(
      () => setLoadingText("Welcome to JIYOO..."),
      1200,
    );

    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      finishTimer = setTimeout(() => onCompleteRef.current(), 400);
    }, 1800);

    return () => {
      clearTimeout(textTimer1);
      clearTimeout(textTimer2);
      clearTimeout(completeTimer);
      if (finishTimer) clearTimeout(finishTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
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

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center justify-center max-w-sm w-full text-center"
          >
            {/* Premium Image Logo with Concentric Architectural Halo */}
            <div className="relative mb-8 flex items-center justify-center">
              <motion.div
                aria-hidden="true"
                initial={{ scale: 0.82, opacity: 0 }}
                animate={{ scale: [0.94, 1.06, 0.98], opacity: [0.2, 0.5, 0.25] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                className="pointer-events-none absolute -inset-4 rounded-2xl border border-[#C5A880]/35"
              />
              <motion.div
                initial={{ scale: 0.92, opacity: 0, filter: "blur(6px)" }}
                animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.78, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex items-center justify-center p-1.5 rounded-2xl bg-white/70 shadow-[0_20px_50px_-12px_rgba(28,25,23,0.14)] border border-[#E7E3DA]"
              >
                <img
                  src="/jiyoo.logo.jpeg"
                  alt="JIYOO Logo"
                  className="h-28 md:h-36 w-auto max-w-[80vw] object-contain rounded-xl"
                />
              </motion.div>
            </div>

            {/* Personalized Greeting or Luxury Curation Title */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8"
            >
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
            </motion.div>

            {/* Animated Progress Bar (Ultra-slim Luxury Hairline) */}
            <div className="w-full max-w-[210px] mb-3.5 px-2">
              <div className="h-[2px] w-full bg-stone-300/40 rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#00D2FF] via-[#0EA5E9] to-[#0284C7] rounded-full relative shadow-[0_0_8px_rgba(14,165,233,0.85),0_0_3px_rgba(56,189,248,1)]"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Subtle leading light glint */}
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#00D2FF] opacity-90 pointer-events-none" />
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
                  transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                  className="text-[11px] tracking-wider text-stone-500 font-light"
                >
                  {loadingText}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Personal Curation Signature */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mt-10 pt-6 border-t border-stone-200/60 w-full flex flex-col items-center justify-center gap-1"
            >
              <span className="text-[9px] tracking-[0.3em] uppercase text-stone-400 font-medium">
                Personalized Curation
              </span>
              <span className="text-xs font-serif italic text-stone-800 tracking-wider">
                by SHAM'S
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
