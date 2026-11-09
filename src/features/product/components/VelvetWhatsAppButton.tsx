import React, { useState, useRef, useCallback } from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";

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

const WHATSAPP_PILL_IMAGE_SRC = "/assets/aistudio/velvet_whatsapp_pill_final.webp";

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

