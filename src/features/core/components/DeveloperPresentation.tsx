import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  X,
  Code,
  Layout,
  Sparkles,
  Zap,
  Globe,
} from "lucide-react";

interface DeveloperPresentationProps {
  isOpen: boolean;
  onClose: () => void;
}

import { useSettings } from "../../../contexts/SettingsContext";

export function DeveloperPresentation({
  isOpen,
  onClose,
}: DeveloperPresentationProps) {
  const { settings } = useSettings();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return;
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        const x = (clientX / innerWidth - 0.5) * 20;
        const y = (clientY / innerHeight - 0.5) * 20;
        setMousePos({ x, y });
      };
      window.addEventListener("mousemove", handleMouseMove);
      return () => {
        document.body.style.overflow = "auto";
        window.removeEventListener("mousemove", handleMouseMove);
      };
    }
  }, [isOpen]);

  const services = [
    {
      title: "Full-Stack Architecture",
      icon: Code,
      desc: "Robust, scalable systems built for production.",
    },
    {
      title: "Premium UI/UX Design",
      icon: Layout,
      desc: "Aesthetic interfaces with meticulous attention to detail.",
    },
    {
      title: "AI Integrations",
      icon: Sparkles,
      desc: "Smart systems powered by the latest LLMs.",
    },
    {
      title: "High-Performance Web",
      icon: Zap,
      desc: "Optimized experiences achieving perfect Lighthouse scores.",
    },
    {
      title: "Global E-Commerce",
      icon: Globe,
      desc: "Secure, reliable, and conversion-optimized storefronts.",
    },
  ];

  const easing = [0.16, 1, 0.3, 1] as const;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: easing } }}
          style={{ perspective: "2000px" }}
        >
          {/* Overlay with Heartbeat & Ripple */}
          <motion.div
            className="absolute inset-0 bg-[#2A1114]/90 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: easing }}
            onClick={onClose}
          >
            <div
              className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage:
                  'url("https://www.transparenttextures.com/patterns/stardust.png")',
              }}
            ></div>
          </motion.div>

          {/* Main Card */}
          <motion.div
            ref={containerRef}
            className="relative w-full max-w-6xl h-full max-h-[85vh] bg-[#F5F1EB] rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.8)] overflow-hidden flex flex-col md:flex-row transform-gpu origin-center"
            initial={{ opacity: 0, y: 100, rotateX: 15, scale: 0.9 }}
            animate={{
              opacity: 1,
              y: 0,
              rotateX: mousePos.y * -0.5,
              rotateY: mousePos.x * 0.5,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 50,
              rotateX: -5,
              scale: 0.95,
              transition: { duration: 0.8, ease: easing },
            }}
            transition={{
              duration: 1.2,
              ease: easing,
              rotateX: { type: "spring", stiffness: 40, damping: 30 },
              rotateY: { type: "spring", stiffness: 40, damping: 30 },
            }}
            onClick={(e) => e.stopPropagation()}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* SVG Paper Texture */}
            <svg
              className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-[0.05] mix-blend-multiply"
              xmlns="http://www.w3.org/2000/svg"
            >
              <filter id="noiseFilterModal">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.8"
                  numOctaves="4"
                  stitchTiles="stitch"
                />
              </filter>
              <rect
                width="100%"
                height="100%"
                filter="url(#noiseFilterModal)"
              />
            </svg>

            {/* Left Column: Portrait */}
            <div className="relative w-full md:w-5/12 h-[40vh] md:h-full overflow-hidden bg-[#2A1114] flex-shrink-0 border-b md:border-b-0 md:border-r border-[#DDD5CB]/20">
              {/* Ambient Spotlight */}
              <motion.div
                className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,rgba(245,241,235,0.15)_0%,transparent_60%)] z-10 mix-blend-overlay pointer-events-none"
                animate={{ x: mousePos.x * 2, y: mousePos.y * 2 }}
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
              />

              <motion.div
                className="absolute inset-0 w-full h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, ease: easing, delay: 0.2 }}
              >
                <img
                  src={settings.developerImageUrl || "/developer.png"}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (!target.dataset.failed) {
                      target.dataset.failed = "true";
                      target.src = "/developer.png";
                    }
                  }}
                  alt="Developer Kishwar Ahmed"
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2A1114] via-[#2A1114]/20 to-transparent opacity-80" />
              </motion.div>

              {/* Portrait Overlay Text */}
              <div className="absolute bottom-8 left-8 right-8 z-20">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.8, ease: easing }}
                >
                  <p className="text-[#F5F1EB]/70 font-mono text-xs uppercase tracking-[0.2em] mb-2">
                    Developed By
                  </p>
                  <h3 className="text-[#F5F1EB] font-serif text-3xl md:text-4xl tracking-tight">
                    Kishwar Ahmed
                  </h3>
                </motion.div>
              </div>
            </div>

            {/* Right Column: Content */}
            <div className="relative w-full md:w-7/12 h-full p-8 md:p-12 lg:p-16 flex flex-col justify-between overflow-y-auto no-scrollbar z-10">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full border border-[#DDD5CB] text-[#1E1E1C] hover:bg-[#2A1114] hover:text-[#F5F1EB] transition-colors duration-500 z-50 group"
              >
                <X
                  className="w-5 h-5 transition-transform duration-500 group-hover:rotate-90"
                  strokeWidth={1.5}
                />
              </button>

              {/* Typography */}
              <div className="max-w-xl">
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.6, ease: easing }}
                  className="font-mono text-xs uppercase tracking-[0.2em] text-[#85786F] mb-4"
                >
                  What I Do Best
                </motion.p>
                <h2 className="text-3xl md:text-5xl font-serif text-[#1E1E1C] leading-[1.1] tracking-tight mb-8">
                  <span className="block overflow-hidden pb-1">
                    <motion.span
                      className="block"
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 1.2, delay: 0.8, ease: easing }}
                    >
                      Solutions that
                    </motion.span>
                  </span>
                  <span className="block overflow-hidden pb-1">
                    <motion.span
                      className="block"
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 1.2, delay: 0.9, ease: easing }}
                    >
                      drive real{" "}
                      <span className="italic text-[#5C2328] relative">
                        impact.
                        <svg
                          className="absolute -bottom-2 left-0 w-full h-3 stroke-[#5C2328] opacity-50"
                          viewBox="0 0 100 10"
                          preserveAspectRatio="none"
                        >
                          <motion.path
                            d="M0,5 Q50,10 100,2"
                            fill="none"
                            strokeWidth="2"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{
                              duration: 1,
                              delay: 1.5,
                              ease: "easeInOut",
                            }}
                          />
                        </svg>
                      </span>
                    </motion.span>
                  </span>
                </h2>
              </div>

              {/* Services Grid */}
              <div className="grid gap-4 my-8 relative z-20">
                {services.map((service, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.8,
                      delay: 1 + idx * 0.12,
                      ease: easing,
                    }}
                    className="group relative bg-[#F9F7F4] border border-[#DDD5CB]/60 rounded-2xl p-5 flex items-start gap-5 transition-all duration-700 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(42,17,20,0.08)] hover:border-[#5C2328]/30 hover:bg-[#FCFAF8] overflow-hidden cursor-default"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#F5F1EB]/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                    <div className="w-10 h-10 rounded-full bg-[#F5F1EB] border border-[#DDD5CB] flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110 group-hover:border-[#5C2328]/40 group-hover:text-[#5C2328]">
                      <service.icon
                        className="w-4 h-4 text-[#85786F] group-hover:text-[#5C2328] transition-colors duration-500"
                        strokeWidth={1.5}
                      />
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-serif text-[#1E1E1C] mb-1 group-hover:text-[#5C2328] transition-colors duration-500">
                        {service.title}
                      </h4>
                      <p className="text-xs md:text-sm text-[#85786F] font-sans leading-relaxed group-hover:text-[#53624C] transition-colors duration-500">
                        {service.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bottom CTA */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 1,
                  delay: 1.8,
                  type: "spring",
                  stiffness: 60,
                  damping: 15,
                }}
                className="mt-auto pt-6"
              >
                <a
                  href="https://www.instagram.com/yo_yo_kishwar_lucky?igsh=MWlieDNzbjY0bGJ3NA=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center gap-4 bg-[#1E1E1C] text-[#F5F1EB] px-8 py-4 rounded-full overflow-hidden transition-all duration-500 hover:shadow-[0_12px_24px_rgba(42,17,20,0.25)] hover:-translate-y-1"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                  <span className="relative z-10 font-mono uppercase tracking-[0.1em] text-xs font-medium group-hover:text-white transition-colors duration-300">
                    Let's Connect
                  </span>
                  <div className="relative z-10 w-8 h-8 rounded-full bg-[#F5F1EB]/10 flex items-center justify-center group-hover:bg-[#F5F1EB] transition-colors duration-500">
                    <ArrowRight
                      className="w-4 h-4 text-[#F5F1EB] group-hover:text-[#1E1E1C] group-hover:translate-x-0.5 transition-all duration-500"
                      strokeWidth={2}
                    />
                  </div>
                </a>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
