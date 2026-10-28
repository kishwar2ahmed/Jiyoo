import React, { useId } from "react";

interface RealisticDeliveryScooterProps {
  className?: string;
  showSmoke?: boolean;
  animated?: boolean;
}

/**
 * RealisticDeliveryScooter
 * A high-fidelity, realistic delivery scooter featuring:
 * - 3D metallic chassis in deep emerald and chrome accents
 * - Rubber wheels with silver alloy rims and spinning reflections
 * - Rear cargo carrier with an insulated delivery box proudly carrying the JIYOO logo
 * - Realistic exhaust pipe with animated drifting smoke puffs
 * - Subtle engine suspension vibration
 */
export function RealisticDeliveryScooter({
  className = "w-7 h-5 shrink-0",
  showSmoke = true,
  animated = true,
}: RealisticDeliveryScooterProps) {
  const uid = useId().replace(/:/g, "");

  const bodyGradId = `scooter-body-${uid}`;
  const rimGradId = `scooter-rim-${uid}`;
  const tireGradId = `scooter-tire-${uid}`;
  const chromeGradId = `scooter-chrome-${uid}`;
  const bagGradId = `scooter-bag-${uid}`;
  const smokeGradId = `scooter-smoke-${uid}`;
  const headlampGlowId = `scooter-glow-${uid}`;
  const bagClipId = `scooter-bag-clip-${uid}`;
  const shadowFilterId = `scooter-shadow-${uid}`;

  return (
    <span
      className={`inline-flex items-center justify-center align-middle relative select-none ${className}`}
      aria-label="Express Delivery Scooter"
      title="Fresh Express Delivery by JIYOO"
    >
      <svg
        viewBox="0 0 84 46"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <style>
            {`
              @keyframes scooter-vibe-${uid} {
                0%, 100% { transform: translateY(0px); }
                30% { transform: translateY(-0.7px); }
                70% { transform: translateY(0.4px); }
              }
              @keyframes smoke-drift-1-${uid} {
                0% {
                  transform: translate(0px, 0px) scale(0.35);
                  opacity: 0.85;
                }
                50% {
                  opacity: 0.5;
                }
                100% {
                  transform: translate(-18px, -6px) scale(1.4);
                  opacity: 0;
                }
              }
              @keyframes smoke-drift-2-${uid} {
                0% {
                  transform: translate(0px, 0px) scale(0.3);
                  opacity: 0.8;
                }
                40% {
                  opacity: 0.55;
                }
                100% {
                  transform: translate(-23px, -8px) scale(1.65);
                  opacity: 0;
                }
              }
              @keyframes smoke-drift-3-${uid} {
                0% {
                  transform: translate(0px, 0px) scale(0.25);
                  opacity: 0.9;
                }
                45% {
                  opacity: 0.45;
                }
                100% {
                  transform: translate(-27px, -5px) scale(1.9);
                  opacity: 0;
                }
              }
              @keyframes wheel-spin-${uid} {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}
          </style>

          {/* Scooter Body Metallic Emerald Gradient */}
          <linearGradient id={bodyGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="25%" stopColor="#10B981" />
            <stop offset="65%" stopColor="#047857" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>

          {/* Chrome & Silver Alloy Gradient */}
          <linearGradient id={chromeGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#E2E8F0" />
            <stop offset="70%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Tire Rubber Dark Gradient */}
          <radialGradient id={tireGradId} cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="#1E293B" />
            <stop offset="85%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          {/* Wheel Alloy Rim Radial */}
          <radialGradient id={rimGradId} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#CBD5E1" />
            <stop offset="80%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#334155" />
          </radialGradient>

          {/* Delivery Bag Texture Gradient */}
          <linearGradient id={bagGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#065F46" />
            <stop offset="40%" stopColor="#044E39" />
            <stop offset="100%" stopColor="#022C20" />
          </linearGradient>

          {/* Realistic Smoke Particle Gradient */}
          <radialGradient id={smokeGradId} cx="40%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#E2E8F0" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#94A3B8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#64748B" stopOpacity="0" />
          </radialGradient>

          {/* Headlight Warm Forward Glow */}
          <linearGradient id={headlampGlowId} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#FDE047" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FACC15" stopOpacity="0" />
          </linearGradient>

          {/* Bag Logo Clip Path */}
          <clipPath id={bagClipId}>
            <rect x="20" y="11" width="12" height="12" rx="2.5" />
          </clipPath>

          {/* Realistic Drop Shadow */}
          <filter id={shadowFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* ================= BACKGROUND SHADOW & ROAD REFLECTION ================= */}
        <ellipse cx="48" cy="42" rx="28" ry="2.2" fill="#000000" fillOpacity="0.18" />

        {/* ================= REALISTIC EXHAUST SMOKE PUFFS ================= */}
        {showSmoke && (
          <g className="smoke-trail pointer-events-none" style={{ transformOrigin: "17px 37px" }}>
            {/* Puff 1: Fast lead puff */}
            <circle
              cx="17"
              cy="36.5"
              r="4.2"
              fill={`url(#${smokeGradId})`}
              style={
                animated
                  ? {
                      transformOrigin: "17px 36.5px",
                      animation: `smoke-drift-1-${uid} 1.45s ease-out infinite`,
                    }
                  : undefined
              }
            />

            {/* Puff 2: Mid plume puff */}
            <circle
              cx="17"
              cy="37"
              r="5"
              fill={`url(#${smokeGradId})`}
              style={
                animated
                  ? {
                      transformOrigin: "17px 37px",
                      animation: `smoke-drift-2-${uid} 1.75s ease-out infinite 0.45s`,
                    }
                  : undefined
              }
            />

            {/* Puff 3: Wide dispersing puff */}
            <circle
              cx="17"
              cy="36.2"
              r="6"
              fill={`url(#${smokeGradId})`}
              style={
                animated
                  ? {
                      transformOrigin: "17px 36.2px",
                      animation: `smoke-drift-3-${uid} 2.1s ease-out infinite 0.95s`,
                    }
                  : undefined
              }
            />
          </g>
        )}

        {/* ================= CHASSIS & SCOOTER BODY (With Engine Vibration) ================= */}
        <g
          id="scooter-rig"
          style={
            animated
              ? {
                  animation: `scooter-vibe-${uid} 0.38s ease-in-out infinite`,
                }
              : undefined
          }
        >
          {/* Headlamp Forward Light Beam */}
          <polygon
            points="70,17 84,13 84,23 70,19"
            fill={`url(#${headlampGlowId})`}
            opacity="0.6"
          />

          {/* Chrome Exhaust Pipe & Muffler */}
          <path
            d="M33 34.5 C28 35.5 22 36.8 17 37"
            stroke={`url(#${chromeGradId})`}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Muffler Nozzle Tip */}
          <ellipse cx="16.8" cy="37" rx="1" ry="1.5" fill="#0F172A" />

          {/* Rear Suspension Shock Strut */}
          <line
            x1="28"
            y1="27"
            x2="30"
            y2="34"
            stroke={`url(#${chromeGradId})`}
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* REAR WHEEL */}
          <g id="rear-wheel">
            {/* Rubber Tire */}
            <circle cx="29" cy="34" r="7.5" fill={`url(#${tireGradId})`} />
            <circle cx="29" cy="34" r="7.2" stroke="#334155" strokeWidth="0.6" fill="none" />
            {/* Metallic Alloy Rim */}
            <circle cx="29" cy="34" r="4.6" fill={`url(#${rimGradId})`} />
            <circle cx="29" cy="34" r="2.2" fill="#1E293B" />
            {/* Spinning Spoke Accents */}
            <g
              style={
                animated
                  ? {
                      transformOrigin: "29px 34px",
                      animation: `wheel-spin-${uid} 0.75s linear infinite`,
                    }
                  : undefined
              }
            >
              <line x1="29" y1="30" x2="29" y2="38" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.8" />
              <line x1="25" y1="34" x2="33" y2="34" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.8" />
            </g>
            <circle cx="29" cy="34" r="1.1" fill="#FFFFFF" />
          </g>

          {/* FRONT WHEEL */}
          <g id="front-wheel">
            {/* Rubber Tire */}
            <circle cx="64" cy="34" r="7.5" fill={`url(#${tireGradId})`} />
            <circle cx="64" cy="34" r="7.2" stroke="#334155" strokeWidth="0.6" fill="none" />
            {/* Metallic Alloy Rim */}
            <circle cx="64" cy="34" r="4.6" fill={`url(#${rimGradId})`} />
            <circle cx="64" cy="34" r="2.2" fill="#1E293B" />
            {/* Spinning Spoke Accents */}
            <g
              style={
                animated
                  ? {
                      transformOrigin: "64px 34px",
                      animation: `wheel-spin-${uid} 0.75s linear infinite`,
                    }
                  : undefined
              }
            >
              <line x1="64" y1="30" x2="64" y2="38" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.8" />
              <line x1="60" y1="34" x2="68" y2="34" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.8" />
            </g>
            <circle cx="64" cy="34" r="1.1" fill="#FFFFFF" />
          </g>

          {/* Front Hydraulic Fork / Suspension Strut */}
          <line
            x1="64"
            y1="34"
            x2="60"
            y2="19"
            stroke={`url(#${chromeGradId})`}
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Front Mudguard Hugging Wheel */}
          <path
            d="M57 32 C57 28 61 26 66 26.5"
            stroke={`url(#${bodyGradId})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Rear Mudguard / Fender */}
          <path
            d="M22 34 C22 28 26 26 31 26"
            stroke={`url(#${bodyGradId})`}
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Floorboard & Underside Chassis */}
          <path
            d="M34 32.5 L55 32.5 C56.5 32.5 57.5 31.5 58 30 L55 24 L36 24 C34 24 33 28 34 32.5 Z"
            fill="#0F172A"
          />
          {/* Textured Footboard Grip */}
          <line x1="38" y1="31" x2="52" y2="31" stroke="#334155" strokeWidth="1.2" strokeLinecap="round" />

          {/* Main Curved Body Cowl (Emerald Metallic Shell) */}
          <path
            d="M30 26 C30 24 34 21 40 21 L51 21 C54 21 57 24 57.5 28 L53 32 L36 32 C32 32 30 29 30 26 Z"
            fill={`url(#${bodyGradId})`}
            filter={`url(#${shadowFilterId})`}
          />

          {/* Front Steering Column & Apron Shield */}
          <path
            d="M54 28 L59 16 C59.5 14.5 61 14 62.5 14.2 L66 14.8 C68 15.2 69 16.5 68.5 18.5 L64 30 C63 32 60 32 58 31 Z"
            fill={`url(#${bodyGradId})`}
          />

          {/* Front Apron Bevel Highlight */}
          <path
            d="M60 16 L65 17.5 C66.5 18 67 19.5 66.5 21 L63.5 29"
            stroke="#6EE7B7"
            strokeWidth="0.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.75"
          />

          {/* Leather Rider Saddle Seat */}
          <path
            d="M33 21 C33 19 36 18.5 41 18.5 L48 18.5 C50.5 18.5 51.5 19.5 50.5 21 Z"
            fill="#1E1B18"
          />
          <path
            d="M34 19.5 C37 19 44 19 49 19.5"
            stroke="#C5A880"
            strokeWidth="0.5"
            strokeDasharray="1.2 0.8"
            fill="none"
          />

          {/* Handlebar & Steering Head */}
          <path
            d="M59.5 14.5 L58 11.5 L65.5 11.5 L67.5 14"
            stroke={`url(#${chromeGradId})`}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Black Rubber Grip Handle */}
          <line x1="56.5" y1="11.5" x2="58.5" y2="11.5" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
          {/* Rear View Mirror */}
          <line x1="59" y1="11.5" x2="57.5" y2="8" stroke={`url(#${chromeGradId})`} strokeWidth="1" strokeLinecap="round" />
          <circle cx="57" cy="7.5" r="1.5" fill="#E2E8F0" stroke="#475569" strokeWidth="0.6" />

          {/* Front Headlight (Bright Lens with Chrome Rim) */}
          <ellipse cx="68.2" cy="18" rx="1.6" ry="2.2" fill="#FEF08A" stroke="#FFFFFF" strokeWidth="0.7" />
          <circle cx="68" cy="17.6" r="0.6" fill="#FFFFFF" />

          {/* Chrome Rear Cargo Rack */}
          <path
            d="M20 23 L32 23 L33 26"
            stroke={`url(#${chromeGradId})`}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <line x1="23" y1="23" x2="25" y2="28" stroke={`url(#${chromeGradId})`} strokeWidth="1.2" strokeLinecap="round" />

          {/* ================= THERMAL DELIVERY BOX WITH INTEGRATED JIYOO LOGO ================= */}
          <g id="delivery-bag" filter={`url(#${shadowFilterId})`}>
            {/* Main Insulated Box Body */}
            <rect
              x="19"
              y="10"
              width="14"
              height="13.5"
              rx="2.5"
              fill={`url(#${bagGradId})`}
              stroke="#D4AF37"
              strokeWidth="0.7"
            />

            {/* Top Carry Handle & Zipper Seam */}
            <path
              d="M23.5 10 C23.5 8.5 28.5 8.5 28.5 10"
              stroke="#D4AF37"
              strokeWidth="1.1"
              strokeLinecap="round"
              fill="none"
            />
            <line x1="20" y1="12" x2="32" y2="12" stroke="#043E2E" strokeWidth="0.8" />

            {/* Reflective Safety Trim Band Across Box */}
            <line x1="19.5" y1="21.5" x2="32.5" y2="21.5" stroke="#FDE047" strokeWidth="1" opacity="0.9" />

            {/* INTEGRATED AUTHENTIC JIYOO LOGO EMBLEM */}
            <rect
              x="20.5"
              y="11.5"
              width="11"
              height="9"
              rx="1.8"
              fill="#FFFFFF"
              stroke="#D4AF37"
              strokeWidth="0.6"
            />
            {/* The Actual JIYOO Brand Logo Asset */}
            <image
              href="/jiyoo.logo.jpeg"
              x="20.8"
              y="11.8"
              width="10.4"
              height="8.4"
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${bagClipId})`}
            />

            {/* Micro 3D Gloss Sheen over the Logo */}
            <rect
              x="20.5"
              y="11.5"
              width="11"
              height="4.5"
              rx="1.5"
              fill="#FFFFFF"
              fillOpacity="0.22"
              pointerEvents="none"
            />
          </g>
        </g>
      </svg>
    </span>
  );
}
