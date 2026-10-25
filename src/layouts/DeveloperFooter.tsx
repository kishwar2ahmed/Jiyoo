import { useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { DeveloperPresentation } from "../features/core/components/DeveloperPresentation";
import { useSettings } from "../contexts/SettingsContext";

export function DeveloperFooter() {
  const { settings } = useSettings();
  const containerRef = useRef<HTMLButtonElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setIsModalOpen(true)}
        ref={containerRef}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "60px" }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        aria-label="View design presentation by Kishwar Ahmed"
        className="group relative w-full mt-8 overflow-hidden rounded-xl border border-[#2B2622] hover:border-[#4A423A] bg-[#181513] hover:bg-[#1E1B18] transition-all duration-500 cursor-pointer text-left shadow-[0_8px_32px_rgba(0,0,0,0.36)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A880]"
      >
        {/* Subtle Ambient Gold Radiance on Hover */}
        <div 
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(197,168,128,0.12)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" 
        />

        {/* Hairline Inner Highlight */}
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A880]/30 to-transparent" 
        />

        {/* Main Content Layout */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between px-5 sm:px-6 py-4 sm:py-4.5 gap-4">
          {/* Left: Designer Portrait & Typography */}
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="relative shrink-0">
              <img
                src={settings.developerImageUrl || "/developer.png"}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (!target.dataset.failed) {
                    target.dataset.failed = "true";
                    target.src = "/developer.png";
                  }
                }}
                alt="Kishwar Ahmed"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg object-cover object-top border border-[#3A332C] shadow-md group-hover:border-[#C5A880]/60 transition-colors duration-500"
                referrerPolicy="no-referrer"
              />
              <span 
                aria-hidden="true" 
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#10B981] border-2 border-[#181513]" 
                title="Available for bespoke projects"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-mono text-[9px] sm:text-[9.5px] uppercase tracking-[0.22em] text-[#C5A880] font-medium">
                  Digital Atelier &amp; Engineering
                </span>
              </div>
              <h3 className="font-serif-luxury text-sm sm:text-base font-medium tracking-wide text-[#FAF9F5] group-hover:text-white transition-colors duration-300 mt-0.5">
                Designed &amp; Developed by Kishwar Ahmed
              </h3>
              <p className="text-[11px] sm:text-xs text-[#8E867E] font-sans-clean truncate mt-0.5">
                Award-winning digital experiences &amp; luxury e-commerce architecture
              </p>
            </div>
          </div>

          {/* Right: Architectural Interactive Badge */}
          <div className="flex items-center self-end sm:self-auto gap-2 shrink-0">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#24201D] group-hover:bg-[#C5A880] border border-[#38322C] group-hover:border-[#C5A880] text-[#D6D0C4] group-hover:text-[#181513] text-xs font-semibold tracking-wide transition-all duration-300">
              <span>View Designer Profile</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </div>
      </motion.button>

      <DeveloperPresentation
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
