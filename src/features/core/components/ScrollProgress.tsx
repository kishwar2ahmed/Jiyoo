import React, { useRef } from "react";
import { motion, useScroll, useSpring, useTransform, useInView } from "framer-motion";

/**
 * Ambient Top Micro-Progress Bar
 * Displays an ultra-slim 2px Apple-grade progress tracker along the top of the viewport
 * using hardware-accelerated transforms and spring physics.
 */
export const ScrollProgress: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    restDelta: 0.001,
  });

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[2.5px] z-[9999] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <motion.div
        className="h-full w-full bg-gradient-to-r from-[#00D2FF] via-[#0EA5E9] to-[#0284C7] origin-left shadow-[0_0_12px_rgba(14,165,233,0.95),0_0_4px_rgba(56,189,248,1)]"
        style={{ scaleX }}
      />
    </div>
  );
};

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  yOffset?: number;
  className?: string;
}

/**
 * Editorial Luxury Scroll Reveal
 * Fades and glides elements into the viewport with subtle Apple-style easing.
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  delay = 0,
  duration = 0.6,
  yOffset = 24,
  className = "",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: yOffset }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface ScrollCardTiltProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Subtle 3D Perspective Card Tilt & Lift on View
 * Applies staggered viewport entrance and dynamic GPU-accelerated micro-lift.
 */
export const ScrollCardTilt: React.FC<ScrollCardTiltProps> = ({
  children,
  className = "",
  delay = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28, scale: 0.985 }}
      animate={
        isInView
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 28, scale: 0.985 }
      }
      transition={{
        duration: 0.65,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2, ease: "easeOut" },
      }}
      className={`transform-gpu transition-shadow duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
};
