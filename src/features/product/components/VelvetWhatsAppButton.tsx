import React, { useState, useRef, useCallback } from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";

export function VelvetWhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.68 12.04 3.68C14.25 3.68 16.31 4.54 17.87 6.1C19.42 7.66 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15ZM16.56 14.37C16.31 14.25 15.09 13.65 14.86 13.56C14.64 13.48 14.47 13.44 14.31 13.69C14.14 13.94 13.66 14.51 13.51 14.68C13.37 14.85 13.22 14.87 12.97 14.75C12.72 14.62 11.92 14.36 10.97 13.51C10.23 12.85 9.73 12.03 9.58 11.78C9.44 11.53 9.57 11.39 9.69 11.27C9.8 11.16 9.94 10.98 10.06 10.83C10.19 10.69 10.23 10.58 10.31 10.42C10.39 10.25 10.35 10.11 10.29 9.98C10.23 9.86 9.74 8.65 9.53 8.16C9.33 7.68 9.13 7.74 8.98 7.73C8.83 7.72 8.67 7.72 8.5 7.72C8.33 7.72 8.06 7.78 7.84 8.03C7.61 8.27 6.97 8.87 6.97 10.09C6.97 11.31 7.86 12.49 7.98 12.65C8.11 12.82 9.73 15.31 12.21 16.38C12.8 16.63 13.26 16.78 13.61 16.9C14.21 17.09 14.75 17.06 15.18 17C15.66 16.93 16.66 16.4 16.86 15.81C17.07 15.23 17.07 14.73 17.01 14.63C16.95 14.53 16.81 14.49 16.56 14.37Z" />
    </svg>
  );
}

interface VelvetWhatsAppButtonProps {
  onClick?: (e: React.MouseEvent<any>) => void;
  href?: string;
  target?: string;
  rel?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
  size?: "card" | "modal" | "compact";
}

const WHATSAPP_PILL_IMAGE_SRC = "/assets/aistudio/velvet_whatsapp_pill_final.png";

export const VelvetWhatsAppButton: React.FC<VelvetWhatsAppButtonProps> = ({
  onClick,
  href,
  target,
  rel,
  disabled = false,
  label = "Order via WhatsApp",
  className = "",
  size = "modal",
}) => {
  const prefersReduced = useReducedMotion();
  const elementRef = useRef<any>(null);

  // Dynamic cursor position for 3D micro-tilt and specular reflection
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const rotateX = useSpring(0, { stiffness: 320, damping: 24 });
  const rotateY = useSpring(0, { stiffness: 320, damping: 24 });

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (prefersReduced || disabled || e.pointerType === "touch") return;

      const rect = elementRef.current?.getBoundingClientRect();
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

  const sharedProps = {
    ref: elementRef,
    onPointerMove: handlePointerMove,
    onPointerEnter: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
    "aria-label": label,
    style: {
      rotateX: prefersReduced ? 0 : rotateX,
      rotateY: prefersReduced ? 0 : rotateY,
      transformStyle: "preserve-3d" as const,
    },
    animate: {
      scale: isHovered && !disabled ? 1.04 : 1,
    },
    whileTap: disabled
      ? undefined
      : {
          scale: 0.95,
          y: 1,
          transition: { type: "spring" as const, stiffness: 600, damping: 25 },
        },
    transition: {
      type: "spring" as const,
      stiffness: 380,
      damping: 20,
      mass: 0.6,
    },
    className: `group relative inline-flex items-center justify-center select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A880] focus-visible:ring-offset-2 bg-transparent p-0 border-0 ${className}`,
  };

  const imageSizeClass =
    size === "modal"
      ? "h-[50px] sm:h-[52px] w-auto max-w-full aspect-[1975/472] object-contain pointer-events-none select-none transition-transform duration-200"
      : size === "compact"
      ? "h-[36px] sm:h-[40px] w-auto max-w-[158px] sm:max-w-[172px] aspect-[1975/472] object-contain pointer-events-none select-none transition-transform duration-200"
      : "w-full max-w-[180px] sm:w-[165px] h-[44px] sm:h-[42px] aspect-[1975/472] object-contain pointer-events-none select-none transition-transform duration-200";

  const content = (
    <>
      {/* 1. Dynamic Imperial Maroon & Emerald Aura Bloom on Hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-[4px]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 80%, rgba(136,19,55,0.5) 0%, rgba(22,163,74,0.28) 55%, transparent 80%)",
        }}
      />

      {/* 2. Exact Maroon Velvet WhatsApp Pill Asset from User Reference */}
      <div className="relative inline-flex items-center justify-center rounded-full overflow-hidden transform-gpu drop-shadow-[0_6px_16px_rgba(65,8,22,0.35)]">
        <img
          src={WHATSAPP_PILL_IMAGE_SRC}
          alt={label}
          loading="eager"
          decoding="async"
          className={imageSizeClass}
        />

        {/* 3. Dynamic Specular Light Glint Following Cursor */}
        {cursorPos && !prefersReduced && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-150"
            style={{
              background: `radial-gradient(circle 44px at ${cursorPos.x}% ${cursorPos.y}%, rgba(255, 255, 255, 0.42) 0%, rgba(255, 210, 220, 0.16) 35%, transparent 70%)`,
              mixBlendMode: "overlay",
            }}
          />
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <motion.a
        {...(sharedProps as any)}
        href={href}
        target={target || "_blank"}
        rel={rel || "noopener noreferrer"}
        onClick={onClick as any}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      {...(sharedProps as any)}
      type="button"
      disabled={disabled}
      onClick={onClick as any}
    >
      {content}
    </motion.button>
  );
};

