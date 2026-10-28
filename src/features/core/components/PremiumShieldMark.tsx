import React, { useId } from "react";

interface PremiumShieldMarkProps {
  className?: string;
  variant?: "gold" | "emerald" | "compact";
}

/**
 * Realistic and Premium Official Quality Shield Seal
 * Designed with multi-layered dimensional shading, metallic rim, lustrous enamel core,
 * and crisp certified checkmark. Replaces flat generic vector shield icons.
 */
export function PremiumShieldMark({
  className = "w-4 h-4 shrink-0",
  variant = "emerald",
}: PremiumShieldMarkProps) {
  const uid = useId().replace(/:/g, "");
  const rimGradId = `shield-rim-${uid}`;
  const fillGradId = `shield-fill-${uid}`;
  const bevelGradId = `shield-bevel-${uid}`;
  const tickGradId = `shield-tick-${uid}`;

  const isGold = variant === "gold";

  return (
    <svg
      className={className}
      viewBox="0 0 32 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Outer Metallic Rim Gradient */}
        <linearGradient id={rimGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          {isGold ? (
            <>
              <stop offset="0%" stopColor="#F5E6C8" />
              <stop offset="35%" stopColor="#D4AF37" />
              <stop offset="70%" stopColor="#8A6B1C" />
              <stop offset="100%" stopColor="#F3E5AB" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="30%" stopColor="#10B981" />
              <stop offset="70%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064E3B" />
            </>
          )}
        </linearGradient>

        {/* Deep Enamel Core Gradient */}
        <linearGradient id={fillGradId} x1="50%" y1="0%" x2="50%" y2="100%">
          {isGold ? (
            <>
              <stop offset="0%" stopColor="#2A2218" />
              <stop offset="100%" stopColor="#15120E" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#064E3B" />
              <stop offset="50%" stopColor="#043E2E" />
              <stop offset="100%" stopColor="#02271D" />
            </>
          )}
        </linearGradient>

        {/* 3D Top-Light Bevel Highlight */}
        <linearGradient id={bevelGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </linearGradient>

        {/* Checkmark Metallic Fill */}
        <linearGradient id={tickGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        <filter id={`shadow-${uid}`} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Main Shield Outer Rim */}
      <path
        d="M16 1.5 C22.5 1.5 29.5 4.5 29.5 4.5 C29.5 4.5 30 18 16 34.5 C2 18 2.5 4.5 2.5 4.5 C2.5 4.5 9.5 1.5 16 1.5 Z"
        fill={`url(#${rimGradId})`}
        filter={`url(#shadow-${uid})`}
      />

      {/* Inner Enamel Core */}
      <path
        d="M16 3.5 C21.8 3.5 27.5 6.2 27.5 6.2 C27.5 6.2 28 17.5 16 32 C4 17.5 4.5 6.2 4.5 6.2 C4.5 6.2 10.2 3.5 16 3.5 Z"
        fill={`url(#${fillGradId})`}
      />

      {/* 3D Inner Bevel Contour */}
      <path
        d="M16 4.5 C21.2 4.5 26.5 7 26.5 7 C26.5 7 27 17 16 30.5 C5 17 5.5 7 5.5 7 C5.5 7 10.8 4.5 16 4.5 Z"
        stroke={`url(#${bevelGradId})`}
        strokeWidth="1.2"
        fill="none"
      />

      {/* Dimensional Center Checkmark */}
      <path
        d="M10 17.2 L14.2 21.4 L22 13"
        stroke="#011F15"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 17 L14.2 21.2 L22 12.8"
        stroke={`url(#${tickGradId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
