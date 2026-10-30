import React from "react";
import { motion } from "motion/react";
import { ArrowLeft, MessageCircle, Clock, Sparkles } from "lucide-react";
import { useSettings } from "../../../contexts/SettingsContext";
import { sanitizeWhatsAppNumber } from "../../../utils/whatsapp";

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function WholesalePage({
  onBackToRetail,
}: {
  onBackToRetail: () => void;
}) {
  const { settings } = useSettings();

  const whatsappB2BUrl = `https://wa.me/${sanitizeWhatsAppNumber(
    settings?.whatsappNumber
  )}?text=${encodeURIComponent(
    "Hello JIYOO Team! I would like to enquire about upcoming Pan-India Wholesale & B2B bulk supply."
  )}`;

  return (
    <section className="min-h-[85vh] bg-[#FAF9F5] text-[#1C1917] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Top Navigation Anchor */}
      <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToRetail}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-black text-[#FAF9F5] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Retail Store</span>
        </button>

        <span className="text-[11px] font-mono uppercase tracking-widest text-[#78716C] hidden sm:inline-block">
          JIYOO B2B Portal
        </span>
      </div>

      {/* Pure, Classy & Focused "Launching Soon" Announcement Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        className="w-full max-w-2xl bg-white rounded-3xl border border-[#E7E3DA] p-8 sm:p-14 text-center shadow-sm flex flex-col items-center justify-center space-y-7 relative overflow-hidden"
      >
        {/* Subtle ambient luxury backdrop glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-radial-gradient from-emerald-500/10 via-transparent to-transparent blur-2xl"
        />

        {/* Minimalist Clock Icon Emblem */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-[#FAF9F5] border border-[#E7E3DA] flex items-center justify-center text-[#1C1917] shadow-inner">
          <Clock className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-700" strokeWidth={1.5} />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1 -right-1"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
          </motion.div>
        </div>

        {/* Text Presentation */}
        <div className="space-y-3 max-w-lg mx-auto">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.28em] text-emerald-800 block">
            JIYOO Pan-India Wholesale
          </span>
          <h1 className="font-serif-luxury text-3xl sm:text-5xl font-bold text-[#1C1917] tracking-tight">
            Launching Soon
          </h1>
          <p className="text-sm sm:text-base text-[#57534E] leading-relaxed pt-1">
            Our specialized B2B wholesale platform for HoReCa, supermarkets, and bulk buyers across India is currently being prepared.
          </p>
        </div>

        {/* Direct Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onBackToRetail}
            className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#1C1917] hover:bg-black text-[#FAF9F5] text-xs font-bold uppercase tracking-[0.14em] transition-all cursor-pointer whitespace-nowrap shadow-xs"
          >
            Browse Retail Store
          </button>
          <a
            href={whatsappB2BUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-[0.14em] transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap shadow-xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Enquire on WhatsApp</span>
          </a>
        </div>
      </motion.div>
    </section>
  );
}
