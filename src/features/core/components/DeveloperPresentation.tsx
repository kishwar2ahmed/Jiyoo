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
import { InstagramIcon } from "./SocialIcons";
import { useModalBackButton } from "../hooks/useModalBackButton";

export function DeveloperPresentation({
  isOpen,
  onClose,
}: DeveloperPresentationProps) {
  const { settings } = useSettings();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useModalBackButton(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
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
          {/* Overlay Scrim */}
          <motion.div
            className="absolute inset-0 bg-[#18181B]/80 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
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

              {/* Bento Grid Services */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8 relative z-20">
                {services.map((service, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.8,
                      delay: 1 + idx * 0.1,
                      ease: easing,
                    }}
                    whileHover={{ y: -4, scale: 1.01 }}
                    className={`p-5 rounded-2xl border border-[#DDD5CB]/80 bg-white/40 backdrop-blur-md hover:bg-white/80 hover:border-[#5C2328]/30 hover:shadow-[0_10px_30px_rgba(92,35,40,0.08)] transition-all duration-500 group cursor-default ${
                      idx === 4 ? "sm:col-span-2" : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-[#EFECE6] text-[#5C2328] group-hover:bg-[#5C2328] group-hover:text-[#F5F1EB] transition-colors duration-500">
                        <service.icon className="w-5 h-5" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h4 className="text-base font-serif text-[#1E1E1C] mb-1 group-hover:text-[#5C2328] transition-colors">
                          {service.title}
                        </h4>
                        <p className="text-xs text-[#71717A] font-sans leading-relaxed">
                          {service.desc}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bottom CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 1.6, ease: easing }}
                className="mt-auto pt-6 border-t border-[#DDD5CB] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-serif italic text-[#71717A]">
                    Interested in working together?
                  </p>
                  <p className="text-xs font-mono uppercase tracking-wider text-[#1E1E1C] mt-0.5">
                    Available for select projects
                  </p>
                </div>

                <a
                  href="https://www.instagram.com/yo_yo_kishwar_lucky?igsh=MWlieDNzbjY0bGJ3NA=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center gap-3 bg-[#1E1E1C] text-[#F5F1EB] px-6 py-3.5 rounded-full text-xs font-mono uppercase tracking-widest overflow-hidden transition-all duration-500 hover:bg-[#5C2328] hover:shadow-[0_10px_20px_rgba(92,35,40,0.2)] hover:scale-105 active:scale-95"
                >
                  <InstagramIcon className="w-4 h-4 relative z-10 text-white" />
                  <span className="relative z-10">Let's Connect</span>
                  <div className="relative z-10 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform duration-300">
                    <ArrowRight
                      className="w-3 h-3 text-[#F5F1EB]"
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
