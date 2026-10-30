import React from "react";
import { motion } from "motion/react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useSettings } from "../../../contexts/SettingsContext";
import { sanitizeWhatsAppNumber } from "../../../utils/whatsapp";

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const CLOCK_NUMERALS = [
  { label: "12", x: 50, y: 19.5 },
  { label: "1", x: 65.25, y: 23.59 },
  { label: "2", x: 76.41, y: 34.75 },
  { label: "3", x: 80.5, y: 50 },
  { label: "4", x: 76.41, y: 65.25 },
  { label: "5", x: 65.25, y: 76.41 },
  { label: "6", x: 50, y: 80.5 },
  { label: "7", x: 34.75, y: 76.41 },
  { label: "8", x: 23.59, y: 65.25 },
  { label: "9", x: 19.5, y: 50 },
  { label: "10", x: 23.59, y: 34.75 },
  { label: "11", x: 34.75, y: 23.59 },
];

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

        {/* Authentic iPhone Clock Emoji / iOS Clock Squircle Emblem */}
        <div
          role="img"
          aria-label="🕒 iPhone Clock"
          className="relative w-18 h-18 sm:w-22 sm:h-22 rounded-[22px] sm:rounded-[26px] bg-gradient-to-b from-[#2C2C2E] via-[#1C1C1E] to-[#000000] p-1.5 sm:p-2 flex items-center justify-center shadow-[0_12px_28px_-6px_rgba(0,0,0,0.38),0_2px_6px_rgba(0,0,0,0.2),inset_0_1px_0.5px_rgba(255,255,255,0.22)] ring-1 ring-black/10 select-none"
        >
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full overflow-visible drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
          >
            <defs>
              <radialGradient id="iosClockFace" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="88%" stopColor="#F9F9FB" />
                <stop offset="100%" stopColor="#E5E5EA" />
              </radialGradient>
            </defs>

            {/* Crisp White iPhone Clock Dial */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="url(#iosClockFace)"
              stroke="#D1D1D6"
              strokeWidth="0.6"
            />

            {/* 60 Precision Minute & Hour Ticks */}
            {Array.from({ length: 60 }).map((_, i) => {
              const isHour = i % 5 === 0;
              return (
                <line
                  key={i}
                  x1="50"
                  y1={isHour ? "7.8" : "8.6"}
                  x2="50"
                  y2={isHour ? "11.6" : "10.6"}
                  stroke={isHour ? "#1C1C1E" : "#8E8E93"}
                  strokeWidth={isHour ? "1.35" : "0.65"}
                  strokeLinecap="round"
                  transform={`rotate(${i * 6} 50 50)`}
                />
              );
            })}

            {/* 12 Apple SF Pro Bold Numerals */}
            {CLOCK_NUMERALS.map((n) => (
              <text
                key={n.label}
                x={n.x}
                y={n.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#1C1C1E"
                fontSize="8.8"
                fontWeight="700"
                style={{
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
                }}
              >
                {n.label}
              </text>
            ))}

            {/* Hour Hand (10:09 Apple Signature Position) */}
            <g transform="rotate(-55 50 50)">
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="39"
                stroke="#1C1C1E"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <rect
                x="48.1"
                y="24"
                width="3.8"
                height="17"
                rx="1.9"
                fill="#1C1C1E"
              />
            </g>

            {/* Minute Hand (Pointing to 2 / 10 min) */}
            <g transform="rotate(60 50 50)">
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="37"
                stroke="#1C1C1E"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <rect
                x="48.4"
                y="14.5"
                width="3.2"
                height="24.5"
                rx="1.6"
                fill="#1C1C1E"
              />
            </g>

            {/* Center Black Boss */}
            <circle cx="50" cy="50" r="3.3" fill="#1C1C1E" />

            {/* Sweeping iPhone Orange Second Hand (#FF9500) */}
            <motion.g
              style={{ originX: "50px", originY: "50px" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            >
              <line
                x1="50"
                y1="59.5"
                x2="50"
                y2="11.5"
                stroke="#FF9500"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
              <circle cx="50" cy="50" r="2.2" fill="#FF9500" />
              <circle cx="50" cy="50" r="0.85" fill="#FFFFFF" />
            </motion.g>
          </svg>
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
