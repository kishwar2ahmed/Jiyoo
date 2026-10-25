import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useSettings } from '../../../contexts/SettingsContext';

export function Hero() {
  const { settings } = useSettings();

  return (
    <section className="relative w-full bg-[#FAF9F5] border-b border-[#E7E3DA] overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 pt-16 sm:pt-24 pb-12 sm:pb-16">
        
        {/* Top Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8 flex items-center gap-4"
            >
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[#1C1917] font-semibold">
                {settings.storeName || "Fine Living & Artisanal Pantry"}
              </span>
              <div className="h-[1px] w-12 sm:w-20 bg-[#1C1917]/20" />
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl sm:text-7xl lg:text-[6.5rem] font-serif-luxury font-normal leading-[1.05] text-[#1C1917] tracking-tight"
            >
              Curated <br />
              <span className="italic font-light text-[#78716C]">perfection.</span>
            </motion.h1>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start md:items-end gap-6 max-w-sm"
          >
            <p className="text-base sm:text-lg text-[#57534E] font-normal leading-relaxed md:text-right">
              Sourced from sustainable farms and master artisans. Experience the true taste of uncompromising quality.
            </p>
            <button 
              onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FAF9F5] bg-[#1C1917] transition-all duration-500 cursor-pointer rounded-full overflow-hidden shadow-[0_10px_40px_-10px_rgba(28,25,23,0.4)] hover:shadow-[0_20px_40px_-10px_rgba(28,25,23,0.5)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98]"
            >
              <span className="absolute inset-0 w-full h-full bg-[#292524] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10 flex items-center">
                Explore Collection
                <span className="ml-4 flex items-center justify-center w-7 h-7 rounded-full bg-white/10 group-hover:bg-white/20 transition-all duration-500 group-hover:scale-110">
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-500 group-hover:translate-x-0.5" strokeWidth={2} />
                </span>
              </span>
            </button>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
