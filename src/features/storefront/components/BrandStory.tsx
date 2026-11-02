import { motion } from 'motion/react';
import { useSettings } from '../../../contexts/SettingsContext';

export function BrandStory() {
  const { settings } = useSettings();
  const storeName = settings.storeName?.split(' ')[0] || 'JIYOO';
  return (
    <section className="relative w-full bg-[#1C1917] py-16 sm:py-20 overflow-hidden">
      {/* Background Image - Fresh Organic Luxury Food & Produce */}
      <div className="absolute inset-0 w-full h-full">
        <img 
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=2000&auto=format&fit=crop"
          alt="Fresh artisanal organic food" 
          className="w-full h-full object-cover object-center opacity-30 mix-blend-luminosity grayscale-[20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1C1917]/90 via-[#1C1917]/70 to-[#1C1917]/95" />
      </div>

      {/* Brand Narrative Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.span 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="inline-block text-[10px] sm:text-xs uppercase tracking-[0.35em] text-emerald-400 font-bold mb-4 bg-emerald-950/60 border border-emerald-800/40 px-4 py-1.5 rounded-full"
        >
          The {storeName} Philosophy
        </motion.span>
        
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-3xl sm:text-4xl md:text-5xl font-serif-luxury text-[#FAF9F5] leading-tight tracking-tight"
        >
          True luxury is found in <br className="hidden md:block"/> the <span className="italic font-light text-emerald-200">purity of nature.</span>
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-5 text-sm sm:text-base text-[#E7E3DA]/90 font-light max-w-2xl mx-auto leading-relaxed"
        >
          From organic farm-fresh produce to premium meats and handcrafted smoothies, we connect discerning palates with uncompromising quality.
        </motion.p>
      </div>
    </section>
  );
}
