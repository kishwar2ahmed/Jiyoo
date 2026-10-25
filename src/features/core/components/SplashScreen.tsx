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

          {/* Ambient gold particles */}
          <div className="absolute inset-0 pointer-events-none z-0">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-amber-600/20 rounded-full"
                initial={{
                  x:
                    1 *
                    (typeof window !== "undefined" ? window.innerWidth : 800),
                  y:
                    1 *
                    (typeof window !== "undefined" ? window.innerHeight : 800),
                  opacity: 0.2,
                }}
                animate={{
                  y: [null, 1 * -60 - 20],
                  opacity: [0.2, 0.6, 0],
                }}
                transition={{
                  duration: 1 * 4 + 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center justify-center max-w-sm w-full text-center"
          >
            {/* Premium Image Logo with Blinking Animation */}
            <div className="relative mb-8">
              <div className="relative flex items-center justify-center">
                <img
                  src="/jiyoo.logo.jpeg"
                  alt="JIYOO Logo"
                  className="h-28 md:h-36 w-auto max-w-[80vw] object-contain rounded-xl"
                />
              </div>
            </div>

            {/* Personalized Greeting or Luxury Curation Title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
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
                Fine Living & Artisanal Pantry
              </p>
            </motion.div>

            {/* Animated Progress Bar */}
            <div className="w-full max-w-[200px] mb-3">
              <div className="h-1 w-full bg-[#E7E3DA] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#1C1917] rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                />
              </div>
            </div>

            {/* Loading Status Text */}
            <motion.div
              key={loadingText}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] tracking-wider text-stone-500 font-light h-4"
            >
              {loadingText}
            </motion.div>

            {/* Personal Curation Signature */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
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
