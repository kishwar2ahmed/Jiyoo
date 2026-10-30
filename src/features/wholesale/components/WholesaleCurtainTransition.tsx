import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const ARCHITECTURAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface WholesaleCurtainTransitionProps {
  active: boolean;
  transitionKey: number;
  onComplete: () => void;
}

export function WholesaleCurtainTransition({
  active,
  transitionKey,
  onComplete,
}: WholesaleCurtainTransitionProps) {
  const [phase, setPhase] = useState<"hold" | "opening">("hold");

  useEffect(() => {
    if (!active) {
      setPhase("hold");
      return;
    }

    setPhase("hold");

    // Hold closed briefly so JIYOO PREMIUM (Top) + Butterfly Blue Line + WHOLESALE STORE (Bottom)
    // register cleanly without any collision, then smoothly glide both shutters apart.
    const openTimer = window.setTimeout(() => {
      setPhase("opening");
    }, 380);

    const completeTimer = window.setTimeout(() => {
      onComplete();
    }, 1180);

    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(completeTimer);
    };
  }, [active, transitionKey, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <div
          key={transitionKey}
          aria-hidden="true"
          className="fixed inset-0 z-[120] pointer-events-none overflow-hidden select-none h-screen supports-[height:100dvh]:h-[100dvh]"
        >
          {/* TOP ARCHITECTURAL SHUTTER (0 to 50dvh) — Houses ONLY "JIYOO PREMIUM" safely above the seam */}
          <motion.div
            initial={{ y: "0%" }}
            animate={{ y: phase === "opening" ? "-100%" : "0%" }}
            transition={{
              duration: 0.78,
              ease: ARCHITECTURAL_EASE,
            }}
            style={{ willChange: "transform" }}
            className="absolute top-0 left-0 right-0 h-[50vh] supports-[height:50dvh]:h-[50dvh] bg-gradient-to-b from-[#FAF9F5] via-[#F7F4EC] to-[#F2EDE2] border-b border-[#0EA5E9]/45 flex flex-col items-center justify-end pb-5 sm:pb-7 md:pb-9 px-4 overflow-hidden shadow-[0_8px_30px_rgba(28,25,23,0.08)]"
          >
            {/* Subtle warm ivory architectural radial light */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.06)_0%,transparent_65%)]" />

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: phase === "opening" ? 0.85 : 1,
                y: 0,
              }}
              transition={{ duration: 0.32, ease: ARCHITECTURAL_EASE }}
              className="relative z-10 flex flex-col items-center text-center max-w-full"
            >
              <span className="font-serif-luxury font-bold uppercase text-[#1C1917] text-[clamp(0.9rem,2.1vw,1.35rem)] tracking-[0.28em] sm:tracking-[0.36em] leading-none whitespace-nowrap">
                JIYOO PREMIUM
              </span>
            </motion.div>
          </motion.div>

          {/* CENTER HORIZONTAL SPLIT LINE — Signature Glowing Butterfly Blue Seam */}
          <motion.div
            initial={{ scaleX: 0.2, opacity: 0 }}
            animate={
              phase === "opening"
                ? { scaleX: 1.03, opacity: 0 }
                : { scaleX: 1, opacity: 1 }
            }
            transition={{
              duration: phase === "opening" ? 0.24 : 0.34,
              ease: ARCHITECTURAL_EASE,
            }}
            style={{ willChange: "transform, opacity" }}
            className="absolute top-1/2 left-0 right-0 -translate-y-1/2 z-20 flex items-center justify-center pointer-events-none"
          >
            {/* Ambient Butterfly Blue Halo */}
            <div className="w-full h-[6px] bg-gradient-to-r from-transparent via-[#0EA5E9]/45 to-transparent blur-[3px] absolute" />
            {/* Razor-Sharp Butterfly Blue Laser Seam */}
            <div className="w-full h-[2px] bg-gradient-to-r from-[#0284C7]/30 via-[#00D2FF] to-[#0284C7]/30 shadow-[0_0_16px_rgba(0,210,255,0.95),0_0_6px_rgba(14,165,233,1)]" />
          </motion.div>

          {/* BOTTOM ARCHITECTURAL SHUTTER (50dvh to 100dvh) — Houses ONLY "WHOLESALE STORE" safely below the seam */}
          <motion.div
            initial={{ y: "0%" }}
            animate={{ y: phase === "opening" ? "100%" : "0%" }}
            transition={{
              duration: 0.78,
              ease: ARCHITECTURAL_EASE,
            }}
            style={{ willChange: "transform" }}
            className="absolute bottom-0 left-0 right-0 h-[50vh] supports-[height:50dvh]:h-[50dvh] bg-gradient-to-t from-[#FAF9F5] via-[#F7F4EC] to-[#F2EDE2] border-t border-[#0EA5E9]/45 flex flex-col items-center justify-start pt-5 sm:pt-7 md:pt-9 px-4 overflow-hidden shadow-[0_-8px_30px_rgba(28,25,23,0.08)]"
          >
            {/* Subtle warm ivory architectural radial light */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.06)_0%,transparent_65%)]" />

            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{
                opacity: phase === "opening" ? 0.85 : 1,
                y: 0,
              }}
              transition={{ duration: 0.32, ease: ARCHITECTURAL_EASE }}
              className="relative z-10 flex flex-col items-center text-center max-w-full"
            >
              <span className="font-serif-luxury font-bold uppercase text-[#1C1917] text-[clamp(1.2rem,3.3vw,2.25rem)] tracking-[0.16em] sm:tracking-[0.24em] leading-none whitespace-nowrap">
                WHOLESALE STORE
              </span>
              <span className="mt-2.5 text-[10px] sm:text-[11px] uppercase tracking-[0.24em] text-[#78716C] font-medium leading-none whitespace-nowrap">
                Pan-India B2B &amp; Bulk Supply
              </span>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
