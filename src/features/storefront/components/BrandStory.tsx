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
        <span className="inline-block text-xs text-stone-400 font-medium mb-3">
          The {storeName} Philosophy
        </span>
        
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif-luxury text-white leading-tight tracking-tight">
          True luxury is found in <br className="hidden md:block"/> the <span className="italic font-light text-emerald-300">purity of nature.</span>
        </h2>

        <p className="mt-5 text-sm sm:text-base text-stone-300 font-light max-w-2xl mx-auto leading-relaxed">
          From organic farm-fresh produce to premium meats and handcrafted smoothies, we connect discerning palates with uncompromising quality.
        </p>
      </div>
    </section>
  );
}
