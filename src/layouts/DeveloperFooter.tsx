import { useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { DeveloperPresentation } from "../features/core/components/DeveloperPresentation";

import { useSettings } from "../contexts/SettingsContext";

export function DeveloperFooter() {
  const { settings } = useSettings();
  const containerRef = useRef<HTMLButtonElement>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setIsModalOpen(true)}
        ref={containerRef}
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "100px" }}
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full mt-8 overflow-hidden rounded-2xl group transition-shadow duration-700 hover:shadow-[0_20px_40px_rgba(42,17,20,0.12)] cursor-pointer block text-left"
        style={{ backgroundColor: "#F5F1EB" }}
      >
        {/* Dynamic Glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#5C2328]/0 via-[#5C2328]/[0.03] to-[#5C2328]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-xl" />
        {/* SVG Noise Texture */}
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-[0.04] mix-blend-multiply"
          xmlns="http://www.w3.org/2000/svg"
        >
          <filter id="noiseFilterMin">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilterMin)" />
        </svg>

        {/* Outer Paper Shadow */}
        <div className="absolute inset-0 z-0 transition-all duration-500 ease-out shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] group-hover:shadow-[inset_0_2px_8px_rgba(255,255,255,1),inset_0_-2px_10px_rgba(0,0,0,0.03)]" />

        {/* Main Content */}
        <div className="relative z-10 flex flex-row items-center justify-between px-4 py-3 gap-3">
          {/* LEFT: Mini Portrait & Text */}
          <div className="flex items-center gap-3 w-full md:w-auto">
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
              className="w-12 h-12 md:w-14 md:h-14 rounded-md object-cover object-top shadow-sm"
              referrerPolicy="no-referrer"
            />

            {/* Typography */}
            <div className="flex flex-col justify-center">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="flex flex-col md:flex-row md:gap-1.5 md:items-baseline"
              >
                <h2 className="text-xs md:text-sm font-serif tracking-tight text-[#1E1E1C] leading-tight group-hover:text-[#5C2328] transition-colors duration-500">
                  Designed with{" "}
                  <span
                    role="img"
                    aria-label="heart"
                    className="inline-block text-red-500"
                  >
                    ❤️
                  </span>{" "}
                  <span className="text-[#85786F] italic transition-transform duration-500 group-hover:translate-x-1 inline-block">
                    by Kishwar Ahmed
                  </span>
                </h2>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-[#53624C] font-mono text-[8.5px] uppercase tracking-[0.2em] mt-0.5 mix-blend-color-burn group-hover:text-[#1E1E1C] transition-colors duration-500"
              >
                Premium Digital Experiences
              </motion.p>
            </div>
          </div>

          {/* RIGHT: Action Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex-shrink-0"
          >
            <div className="w-7 h-7 rounded-full border border-[#DDD5CB] flex items-center justify-center transition-all duration-500 group-hover:border-[#1E1E1C] group-hover:bg-[#1E1E1C] group-hover:shadow-[0_4px_12px_rgba(30,30,28,0.15)] group-hover:scale-105">
              <ArrowRight
                className="w-3 h-3 text-[#1E1E1C] transition-all duration-500 group-hover:text-[#F5F1EB] group-hover:translate-x-0.5"
                strokeWidth={1.5}
              />
            </div>
          </motion.div>
        </div>
      </motion.button>

      <DeveloperPresentation
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
