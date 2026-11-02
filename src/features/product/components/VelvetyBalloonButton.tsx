import React, { useState, useRef, useCallback } from "react";
import { motion, useReducedMotion, useSpring, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";

interface VelvetyBalloonButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  justAdded?: boolean;
  label?: string;
  className?: string;
  size?: "card" | "modal";
}

const PILL_IMAGE_SRC = "/assets/aistudio/velvet_butterfly_pill_final.png";

export const VelvetyBalloonButton: React.FC<VelvetyBalloonButtonProps> = ({
  onClick,
  disabled = false,
  justAdded = false,
  label = "Add to Cart",
  className = "",
  size = "card",
}) => {
  const prefersReduced = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Dynamic cursor position for 3D tilt & specular reflection
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Smooth springs for 3D micro-tilt
  const rotateX = useSpring(0, { stiffness: 320, damping: 24 });
  const rotateY = useSpring(0, { stiffness: 320, damping: 24 });

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (prefersReduced || disabled || e.pointerType === "touch") return;

      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setCursorPos({ x, y });

      const normX = (e.clientX - rect.left) / rect.width - 0.5;
      const normY = (e.clientY - rect.top) / rect.height - 0.5;
      rotateX.set(-normY * 8);
      rotateY.set(normX * 8);
    },
    [prefersReduced, disabled, rotateX, rotateY]
  );

  const handlePointerEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    setCursorPos(null);
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      aria-label={`${label} to cart`}
      style={{
        rotateX: prefersReduced ? 0 : rotateX,
        rotateY: prefersReduced ? 0 : rotateY,
        transformStyle: "preserve-3d",
      }}
      animate={{
        scale: isHovered && !disabled ? 1.04 : 1,
      }}
      whileTap={
        disabled
          ? undefined
          : {
              scale: 0.95,
              y: 1,
              transition: { type: "spring", stiffness: 600, damping: 25 },
            }
      }
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 20,
        mass: 0.6,
      }}
      className={`group relative inline-flex items-center justify-center select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A880] focus-visible:ring-offset-2 bg-transparent p-0 border-0 ${className}`}
    >
      {/* 1. Dynamic Champagne-Gold & Warm Espresso Aura Bloom on Hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-[4px]"
        style={{
          background: "radial-gradient(ellipse at 50% 80%, rgba(197,168,128,0.45) 0%, rgba(28,25,23,0.22) 55%, transparent 80%)",
        }}
      />

      {/* 2. The EXACT Pill Image Asset from User Reference */}
      <div className="relative inline-flex items-center justify-center rounded-full overflow-hidden transform-gpu">
        <img
          src={PILL_IMAGE_SRC}
          alt={label}
          loading="eager"
          decoding="async"
          className={
            size === "modal"
              ? "h-[50px] sm:h-[52px] w-auto max-w-full aspect-[1902/577] object-contain pointer-events-none select-none transition-transform duration-200"
              : "w-full max-w-[165px] sm:w-[142px] h-[44px] sm:h-[42px] aspect-[1902/577] object-contain pointer-events-none select-none transition-transform duration-200"
          }
        />

        {disabled && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-[#1C1917]/80 backdrop-blur-[1.5px] border border-[#C5A880]/40">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-[#FAF9F5]">
              {label}
            </span>
          </div>
        )}

        {/* 3. Dynamic Specular Light Glint Following Cursor */}
        {cursorPos && !prefersReduced && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-150"
            style={{
              background: `radial-gradient(circle 44px at ${cursorPos.x}% ${cursorPos.y}%, rgba(255, 255, 255, 0.42) 0%, rgba(229, 201, 155, 0.22) 35%, transparent 70%)`,
              mixBlendMode: "overlay",
            }}
          />
        )}

        {/* 4. Luxury Gold Velvet Sheen Sweep on Added (Texture Remains 100% Intact & Uncovered) */}
        <AnimatePresence>
          {justAdded && (
            <>
              <motion.div
                initial={{ opacity: 0, x: "-100%" }}
                animate={{ opacity: 1, x: "100%" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.75, ease: "easeInOut" }}
                className="pointer-events-none absolute inset-0 rounded-full z-10"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255, 235, 180, 0.5) 50%, transparent 100%)",
                  mixBlendMode: "overlay",
                }}
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.9, 0] }}
                transition={{ duration: 0.85 }}
                className="pointer-events-none absolute -inset-0.5 rounded-full border border-[#E5C99B]/80 z-10"
              />
            </>
          )}
        </AnimatePresence>
      </div>

      {/* 5. Floating Gold Micro-Badge Feedback (Never Covers the Velvet Pill) */}
      <AnimatePresence>
        {justAdded && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.85 }}
            animate={{ opacity: 1, y: -6, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute -top-3 right-1 sm:right-2 z-40 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1C1917] border border-[#C5A880] shadow-sm"
          >
            <Check className="w-3 h-3 text-[#E5C99B]" strokeWidth={3} />
            <span className="text-[10.5px] font-serif font-semibold tracking-wide text-[#FAF2E1]">
              Added
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};
