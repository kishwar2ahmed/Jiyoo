import React, { useEffect } from "react";

export interface RealisticDeliveryScooterProps {
  className?: string;
  showSmoke?: boolean;
  animated?: boolean;
}

let truckStylesInjected = false;
function ensureTruckStylesInjected() {
  if (truckStylesInjected || typeof document === "undefined") return;
  truckStylesInjected = true;
  const style = document.createElement("style");
  style.id = "jiyoo-express-truck-styles";
  style.textContent = `
    @keyframes jiyoo-truck-surge {
      0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
      35% { transform: translate(1.8px, -3.2px) rotate(-1.1deg); }
      70% { transform: translate(-0.8px, 1px) rotate(0.45deg); }
    }
    @keyframes jiyoo-parcel-left-float {
      0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
      50% { transform: translate(-3.5px, -7px) rotate(-5.5deg); }
    }
    @keyframes jiyoo-parcel-top-float {
      0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
      45% { transform: translate(2.5px, -7.5px) rotate(4.5deg); }
    }
    @keyframes jiyoo-pin-hover {
      0%, 100% { transform: translate(0px, 0px) rotate(0deg) scale(1); }
      50% { transform: translate(1.5px, -8px) rotate(4.5deg) scale(1.05); }
    }
    @keyframes jiyoo-speed-pulse-1 {
      0%, 100% { transform: translateX(0px) scaleX(1); }
      50% { transform: translateX(-6px) scaleX(1.12); }
    }
    @keyframes jiyoo-speed-pulse-2 {
      0%, 100% { transform: translateX(0px) scaleX(1); }
      45% { transform: translateX(-9px) scaleX(1.16); }
    }
    @keyframes jiyoo-speed-pulse-3 {
      0%, 100% { transform: translateX(0px) scaleX(1); }
      55% { transform: translateX(-5px) scaleX(1.1); }
    }
    @keyframes jiyoo-cloud-drift-a {
      0%, 100% { transform: translate(0px, 0px); }
      50% { transform: translate(-5px, -2.5px); }
    }
    @keyframes jiyoo-cloud-drift-b {
      0%, 100% { transform: translate(0px, 0px); }
      50% { transform: translate(4px, -3px); }
    }
    @keyframes jiyoo-wheel-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .jiyoo-truck-anim {
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

const cargoFrontGrad = "jt-cargo-front";
const cargoTopGrad = "jt-cargo-top";
const cabBodyGrad = "jt-cab-body";
const cabRoofGrad = "jt-cab-roof";
const speedBarGrad = "jt-speed-bar";
const speedBevelGrad = "jt-speed-bevel";
const tireFrontGrad = "jt-tire-front";
const tireBackGrad = "jt-tire-back";
const rimWellGrad = "jt-rim-well";
const hubCapGrad = "jt-hub-cap";
const windshieldGrad = "jt-windshield";
const sideWindowGrad = "jt-side-win";
const parcelLitGrad = "jt-parcel-lit";
const parcelMidGrad = "jt-parcel-mid";
const parcelDarkGrad = "jt-parcel-dark";
const tapeGrad = "jt-parcel-tape";
const pinFrontGrad = "jt-pin-front";
const pinSideGrad = "jt-pin-side";
const cloudGrad = "jt-cloud-grad";
const headlampGrad = "jt-headlamp";

/**
 * RealisticDeliveryScooter (3D Express Delivery Truck with Floating Parcels & Location Pin)
 * GPU-accelerated with shared global keyframes and zero-filter vector geometry for 60fps scrolling.
 */
export const RealisticDeliveryScooter = React.memo(function RealisticDeliveryScooter({
  className = "w-8 h-6 shrink-0",
  showSmoke = true,
  animated = true,
}: RealisticDeliveryScooterProps) {
  useEffect(() => {
    ensureTruckStylesInjected();
  }, []);

  return (
    <span
      className={`inline-flex items-center justify-center align-middle relative select-none transition-transform duration-300 group-hover:scale-110 ${className}`}
      aria-label="Express Delivery Truck"
      title="Express Fresh Delivery"
    >
      <svg
        viewBox="0 0 240 205"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* 3D Orange Cargo Box Main Face */}
          <linearGradient id={cargoFrontGrad} x1="15%" y1="5%" x2="85%" y2="95%">
            <stop offset="0%" stopColor="#FF9E3D" />
            <stop offset="45%" stopColor="#FF7A12" />
            <stop offset="85%" stopColor="#EB5A06" />
            <stop offset="100%" stopColor="#D44602" />
          </linearGradient>

          {/* 3D Orange Cargo Top / Right Highlight Bevel */}
          <linearGradient id={cargoTopGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD09B" />
            <stop offset="40%" stopColor="#FFAB52" />
            <stop offset="100%" stopColor="#FF7E18" />
          </linearGradient>

          {/* 3D Orange Cab Body */}
          <linearGradient id={cabBodyGrad} x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#FFAA4C" />
            <stop offset="45%" stopColor="#FF8019" />
            <stop offset="85%" stopColor="#ED5C07" />
            <stop offset="100%" stopColor="#CE4402" />
          </linearGradient>

          {/* 3D Cab Roof Cap Highlight */}
          <linearGradient id={cabRoofGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFC988" />
            <stop offset="55%" stopColor="#FF9838" />
            <stop offset="100%" stopColor="#F26A0C" />
          </linearGradient>

          {/* 3D Yellow Speed Bars */}
          <linearGradient id={speedBarGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF07C" />
            <stop offset="50%" stopColor="#FFD93D" />
            <stop offset="100%" stopColor="#F5B700" />
          </linearGradient>
          <linearGradient id={speedBevelGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59F00" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* 3D Chocolate-Brown Tires */}
          <radialGradient id={tireFrontGrad} cx="38%" cy="34%" r="65%">
            <stop offset="0%" stopColor="#693C2A" />
            <stop offset="40%" stopColor="#462518" />
            <stop offset="78%" stopColor="#2C150C" />
            <stop offset="100%" stopColor="#1B0B05" />
          </radialGradient>

          <radialGradient id={tireBackGrad} cx="45%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#3B1E13" />
            <stop offset="70%" stopColor="#241008" />
            <stop offset="100%" stopColor="#140804" />
          </radialGradient>

          {/* Recessed Wheel Rim Well */}
          <linearGradient id={rimWellGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#231008" />
            <stop offset="65%" stopColor="#3B1F14" />
            <stop offset="100%" stopColor="#593222" />
          </linearGradient>

          {/* Center 3D Hubcap */}
          <radialGradient id={hubCapGrad} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#7C4935" />
            <stop offset="50%" stopColor="#4A281B" />
            <stop offset="100%" stopColor="#26120A" />
          </radialGradient>

          {/* Cab Angled Grey 3D Windshield */}
          <linearGradient id={windshieldGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#CBD5E1" />
            <stop offset="55%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#64748B" />
          </linearGradient>

          {/* Cab Glossy Black Side Window */}
          <linearGradient id={sideWindowGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E2024" />
            <stop offset="45%" stopColor="#090A0C" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>

          {/* 3D Floating Parcel Gradients */}
          <linearGradient id={parcelLitGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFCA80" />
            <stop offset="55%" stopColor="#FFA94D" />
            <stop offset="100%" stopColor="#F7882F" />
          </linearGradient>
          <linearGradient id={parcelMidGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF9736" />
            <stop offset="60%" stopColor="#F26B13" />
            <stop offset="100%" stopColor="#D95308" />
          </linearGradient>
          <linearGradient id={parcelDarkGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FA8C42" />
            <stop offset="100%" stopColor="#C84B09" />
          </linearGradient>
          <linearGradient id={tapeGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF9E6" />
            <stop offset="100%" stopColor="#F3D69B" />
          </linearGradient>

          {/* 3D Mint-Turquoise GPS Location Pin */}
          <linearGradient id={pinFrontGrad} x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#A8F9EC" />
            <stop offset="45%" stopColor="#72EFDD" />
            <stop offset="100%" stopColor="#48CAE4" />
          </linearGradient>
          <linearGradient id={pinSideGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#74B4A7" />
            <stop offset="100%" stopColor="#4D8076" />
          </linearGradient>

          {/* 3D Soft Puffy Clouds with Blush-Lavender Underside */}
          <linearGradient id={cloudGrad} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="58%" stopColor="#FDF8FF" />
            <stop offset="85%" stopColor="#F5D8FE" />
            <stop offset="100%" stopColor="#E9C2F8" />
          </linearGradient>

          {/* Warm Cream-Yellow 3D Headlight */}
          <linearGradient id={headlampGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="55%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>

        {/* Ground depth shadow ellipse (Zero-cost vector replacement for SVG filter) */}
        <ellipse cx="132" cy="186" rx="76" ry="7" fill="#431407" fillOpacity="0.14" />

        {/* =================================================================== */}
        {/* 1. SOFT 3D PUFFY CLOUDS (Atmospheric Depth Layer)                   */}
        {/* =================================================================== */}
        {showSmoke && (
          <g aria-hidden="true">
            {/* Top-Left Cloud */}
            <g
              className="jiyoo-truck-anim"
              style={
                animated
                  ? { animation: "jiyoo-cloud-drift-a 3.2s ease-in-out infinite" }
                  : undefined
              }
            >
              <path
                d="M60 44 C56 44 53 41 53 37.5 C53 34.2 55.8 31.5 59.2 31.5 C60.8 27.8 64.5 25.2 68.8 25.2 C73.8 25.2 77.8 28.8 78.6 33.5 C81.5 34.2 83.6 36.8 83.6 39.8 C83.6 43.4 80.5 46 76.6 46 L60 44 Z"
                fill={`url(#${cloudGrad})`}
              />
            </g>

            {/* Center Cloud */}
            <g
              className="jiyoo-truck-anim"
              style={
                animated
                  ? { animation: "jiyoo-cloud-drift-b 3.6s ease-in-out infinite 0.4s" }
                  : undefined
              }
            >
              <path
                d="M126 72 C122.5 72 120 69.5 120 66.4 C120 63.6 122.2 61.4 125 61.2 C126.5 57.8 129.8 55.5 133.8 55.5 C138.2 55.5 141.8 58.6 142.5 62.8 C145 63.4 146.8 65.5 146.8 68.2 C146.8 71.2 144.2 73.4 140.8 73.4 L126 72 Z"
                fill={`url(#${cloudGrad})`}
              />
            </g>

            {/* Lower-Left Cloud */}
            <g
              className="jiyoo-truck-anim"
              style={
                animated
                  ? { animation: "jiyoo-cloud-drift-a 2.9s ease-in-out infinite 0.8s" }
                  : undefined
              }
            >
              <path
                d="M12 104 C9 104 6.5 101.8 6.5 99 C6.5 96.4 8.6 94.3 11.2 94.2 C12.6 91 15.8 89 19.4 89 C23.5 89 26.8 91.8 27.5 95.6 C29.8 96.2 31.4 98.1 31.4 100.5 C31.4 103.2 29 105.2 26 105.2 L12 104 Z"
                fill={`url(#${cloudGrad})`}
              />
            </g>
          </g>
        )}

        {/* =================================================================== */}
        {/* 2. FLOATING 3D PARCEL #1 (LEFT ISOMETRIC BOX, TILTED -32 DEG)       */}
        {/* =================================================================== */}
        <g
          className="jiyoo-truck-anim"
          style={
            animated
              ? {
                  transformOrigin: "38px 68px",
                  animation: "jiyoo-parcel-left-float 2.4s ease-in-out infinite",
                }
              : undefined
          }
        >
          <g transform="translate(12, 42)">
            <polygon
              points="4,28 24,5 38,13 18,36"
              fill={`url(#${parcelMidGrad})`}
            />
            <polygon
              points="24,5 48,18 28,42 4,28"
              fill={`url(#${parcelLitGrad})`}
            />
            <polygon
              points="4,28 28,42 18,47 0,34"
              fill={`url(#${parcelDarkGrad})`}
            />
            <polygon
              points="9,22 15,15 26,22 20,29"
              fill={`url(#${tapeGrad})`}
            />
            <polygon
              points="9,22 5,26 10,29 14,25"
              fill="#E5C483"
            />
            <g transform="translate(33, 16) rotate(29)">
              <rect x="0" y="0" width="11" height="8" rx="1.2" fill="#FFFFFF" />
              <line x1="2" y1="1.6" x2="2" y2="6.4" stroke="#1C1917" strokeWidth="0.9" />
              <line x1="3.6" y1="1.6" x2="3.6" y2="6.4" stroke="#1C1917" strokeWidth="0.5" />
              <line x1="5" y1="1.6" x2="5" y2="6.4" stroke="#1C1917" strokeWidth="1" />
              <line x1="6.8" y1="1.6" x2="6.8" y2="6.4" stroke="#1C1917" strokeWidth="0.6" />
              <line x1="8.2" y1="1.6" x2="8.2" y2="6.4" stroke="#1C1917" strokeWidth="0.9" />
              <line x1="9.5" y1="1.6" x2="9.5" y2="6.4" stroke="#1C1917" strokeWidth="0.5" />
            </g>
            <g transform="translate(11, 34) rotate(29)" opacity="0.82">
              <rect x="0" y="0" width="11" height="4.2" rx="0.6" stroke="#291509" strokeWidth="0.5" fill="none" />
              <line x1="2.2" y1="0.8" x2="2.2" y2="3.4" stroke="#291509" strokeWidth="0.7" />
              <circle cx="5.5" cy="2.1" r="1" fill="#291509" />
              <line x1="8.8" y1="0.8" x2="8.8" y2="3.4" stroke="#291509" strokeWidth="0.7" />
            </g>
          </g>
        </g>

        {/* =================================================================== */}
        {/* 3. FLOATING 3D PARCEL #2 (TOP-CENTER ISOMETRIC BOX)                 */}
        {/* =================================================================== */}
        <g
          className="jiyoo-truck-anim"
          style={
            animated
              ? {
                  transformOrigin: "108px 36px",
                  animation: "jiyoo-parcel-top-float 2.65s ease-in-out infinite 0.3s",
                }
              : undefined
          }
        >
          <g transform="translate(86, 14)">
            <polygon
              points="2,14 18,4 24,31 8,39"
              fill={`url(#${parcelMidGrad})`}
            />
            <polygon
              points="18,4 37,6 41,32 24,31"
              fill={`url(#${parcelLitGrad})`}
            />
            <polygon
              points="8,39 24,31 41,32 25,41"
              fill={`url(#${parcelDarkGrad})`}
            />
            <polygon
              points="25,4.8 30.5,5.3 32,13 26.5,12.5"
              fill={`url(#${tapeGrad})`}
            />
            <g transform="translate(30, 20) rotate(-6)">
              <rect x="0" y="0" width="10" height="6.8" rx="1" fill="#FFFFFF" />
              <line x1="1.8" y1="1.5" x2="1.8" y2="5.3" stroke="#1C1917" strokeWidth="0.8" />
              <line x1="3.2" y1="1.5" x2="3.2" y2="5.3" stroke="#1C1917" strokeWidth="0.5" />
              <line x1="4.6" y1="1.5" x2="4.6" y2="5.3" stroke="#1C1917" strokeWidth="0.9" />
              <line x1="6.2" y1="1.5" x2="6.2" y2="5.3" stroke="#1C1917" strokeWidth="0.5" />
              <line x1="7.8" y1="1.5" x2="7.8" y2="5.3" stroke="#1C1917" strokeWidth="0.8" />
            </g>
            <g transform="translate(6.5, 29.5) rotate(-27)">
              <rect x="0" y="0" width="14" height="5.5" rx="0.8" stroke="#1F1209" strokeWidth="0.6" fill="none" />
              <line x1="4.6" y1="0" x2="4.6" y2="5.5" stroke="#1F1209" strokeWidth="0.5" />
              <line x1="9.3" y1="0" x2="9.3" y2="5.5" stroke="#1F1209" strokeWidth="0.5" />
              <path d="M1.6 4.2 L1.6 1.5 M3 4.2 L3 1.5" stroke="#1F1209" strokeWidth="0.7" strokeLinecap="round" />
              <path d="M5.6 3 C5.6 1.6 8.4 1.6 8.4 3 Z M7 3 L7 4.4" stroke="#1F1209" strokeWidth="0.6" fill="#1F1209" />
              <path d="M10.6 1.4 L12.6 1.4 L12.2 3 C12 3.5 11.2 3.5 11 3 Z M11.6 3.3 L11.6 4.5" stroke="#1F1209" strokeWidth="0.6" fill="#1F1209" />
            </g>
          </g>
        </g>

        {/* =================================================================== */}
        {/* 4. FLOATING 3D MINT-TURQUOISE LOCATION PIN (UPPER RIGHT)            */}
        {/* =================================================================== */}
        <g
          className="jiyoo-truck-anim"
          style={
            animated
              ? {
                  transformOrigin: "198px 74px",
                  animation: "jiyoo-pin-hover 2.3s ease-in-out infinite 0.15s",
                }
              : undefined
          }
        >
          <g transform="translate(182, 46) rotate(14, 18, 24)">
            <path
              d="M15 2 C5.2 2 -1 10 -1 19.5 C-1 30.5 11.5 43.5 14.2 46.2 C15.2 47.2 17 47 18 45.8 L21 43 C14 36 4.5 27.5 4.5 19 C4.5 10 10.5 3.5 18 2.2 Z"
              fill={`url(#${pinSideGrad})`}
            />
            <path
              d="M19 2 C28.4 2 35.5 9.2 35.5 18.5 C35.5 29.2 22.8 42.2 19.8 45.2 C18.8 46.2 17.2 46.2 16.2 45.2 C13.2 42.2 3.5 29.2 3.5 18.5 C3.5 9.2 10.2 2 19 2 Z"
              fill={`url(#${pinFrontGrad})`}
            />
            <ellipse cx="19.5" cy="18.5" rx="4.4" ry="5.2" fill="#4D8076" />
            <ellipse cx="20.4" cy="18.5" rx="3.1" ry="4.1" fill="#E2FBF7" fillOpacity="0.88" />
          </g>
        </g>

        {/* =================================================================== */}
        {/* 5. MAIN 3D EXPRESS DELIVERY TRUCK + SPEED STREAKS                   */}
        {/* =================================================================== */}
        <g
          className="jiyoo-truck-anim"
          style={
            animated
              ? {
                  transformOrigin: "132px 136px",
                  animation: "jiyoo-truck-surge 1.35s ease-in-out infinite",
                }
              : undefined
          }
        >
          <g transform="rotate(-7.5, 130, 135)">
            {/* Far Rear Wheel */}
            <circle cx="91" cy="166" r="17.5" fill={`url(#${tireBackGrad})`} />
            <circle cx="91" cy="166" r="9" fill="#180A05" />
            {/* Far Front Wheel */}
            <circle cx="198" cy="164" r="16.5" fill={`url(#${tireBackGrad})`} />
            <circle cx="198" cy="164" r="8.5" fill="#180A05" />

            {/* --- REAR CARGO BOX --- */}
            <g>
              <rect
                x="114"
                y="84"
                width="18"
                height="66"
                rx="6"
                fill={`url(#${cargoTopGrad})`}
              />
              <rect
                x="46"
                y="84"
                width="77"
                height="67"
                rx="7"
                fill={`url(#${cargoFrontGrad})`}
              />
              <path
                d="M52 85.5 L118 85.5"
                stroke="#FFD8A8"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.75"
              />
              <rect
                x="47"
                y="148"
                width="77"
                height="6.5"
                rx="3"
                fill={`url(#${cargoTopGrad})`}
              />
              <line
                x1="49"
                y1="148"
                x2="122"
                y2="148"
                stroke="#B83B00"
                strokeWidth="1.6"
              />
              <path
                d="M52 154.5 L124 154.5 L124 169 L96 169 C95 155 62 155 61 169 L52 169 Z"
                fill={`url(#${cargoFrontGrad})`}
              />
              <path
                d="M57 169 C57 151.5 99 151.5 99 169"
                stroke={`url(#${cargoTopGrad})`}
                strokeWidth="4.8"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* --- 3 FLOATING 3D YELLOW SPEED BARS --- */}
            <g
              className="jiyoo-truck-anim"
              style={
                animated
                  ? { animation: "jiyoo-speed-pulse-1 0.72s ease-in-out infinite" }
                  : undefined
              }
            >
              <rect
                x="26"
                y="102.5"
                width="43"
                height="11.5"
                rx="5.5"
                fill={`url(#${speedBevelGrad})`}
              />
              <rect
                x="27.5"
                y="101"
                width="43"
                height="11"
                rx="5.5"
                fill={`url(#${speedBarGrad})`}
              />
            </g>

            <g
              className="jiyoo-truck-anim"
              style={
                animated
                  ? { animation: "jiyoo-speed-pulse-2 0.68s ease-in-out infinite 0.14s" }
                  : undefined
              }
            >
              <rect
                x="18"
                y="118.5"
                width="59"
                height="11.5"
                rx="5.5"
                fill={`url(#${speedBevelGrad})`}
              />
              <rect
                x="19.5"
                y="117"
                width="59"
                height="11"
                rx="5.5"
                fill={`url(#${speedBarGrad})`}
              />
            </g>

            <g
              className="jiyoo-truck-anim"
              style={
                animated
                  ? { animation: "jiyoo-speed-pulse-3 0.76s ease-in-out infinite 0.28s" }
                  : undefined
              }
            >
              <rect
                x="26"
                y="134.5"
                width="40"
                height="11.5"
                rx="5.5"
                fill={`url(#${speedBevelGrad})`}
              />
              <rect
                x="27.5"
                y="133"
                width="40"
                height="11"
                rx="5.5"
                fill={`url(#${speedBarGrad})`}
              />
            </g>

            {/* --- FRONT AERODYNAMIC CAB --- */}
            <g>
              <rect x="122.5" y="96" width="4" height="72" rx="2" fill="#8C2A00" opacity="0.7" />
              <rect
                x="125"
                y="95"
                width="58"
                height="11"
                rx="5"
                fill={`url(#${cabRoofGrad})`}
              />
              <line
                x1="127"
                y1="105.5"
                x2="182"
                y2="105.5"
                stroke="#C2410C"
                strokeWidth="1.4"
              />
              <path
                d="M124 105 L178 105 C182 105 184.5 107.5 186 112 L192 136 L213 137 C219 137.5 223 141 224 147 L224 166 C224 168.5 221.5 170 218 170 L124 170 Z"
                fill={`url(#${cabBodyGrad})`}
              />
              <path
                d="M190 136.5 L212 136.5 C218 136.5 222.5 139.5 223.5 144.5 L192 144.5 Z"
                fill={`url(#${cabRoofGrad})`}
              />
              <g opacity="0.75">
                <line x1="210" y1="142" x2="217" y2="142" stroke="#7C2D12" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="211" y1="145" x2="218" y2="145" stroke="#7C2D12" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="212" y1="148" x2="219" y2="148" stroke="#7C2D12" strokeWidth="1.6" strokeLinecap="round" />
              </g>
              <line
                x1="125"
                y1="150"
                x2="222"
                y2="150"
                stroke="#C2410C"
                strokeWidth="1.5"
              />
              <line
                x1="126"
                y1="151.5"
                x2="221"
                y2="151.5"
                stroke="#FFBA70"
                strokeWidth="1.2"
                opacity="0.7"
              />
              <rect
                x="138"
                y="112"
                width="32"
                height="21"
                rx="3.5"
                fill="#C2410C"
              />
              <rect
                x="139.5"
                y="113.2"
                width="29.5"
                height="18.6"
                rx="2.8"
                fill={`url(#${sideWindowGrad})`}
              />
              <polygon
                points="143,114.5 151,114.5 145,130.5 140.5,130.5"
                fill="#FFFFFF"
                fillOpacity="0.12"
              />
              <polygon
                points="177,112 181,111 188,133 183.5,135"
                fill="#111827"
              />
              <polygon
                points="180.5,111 191,110 198,132 187.5,133.5"
                fill={`url(#${windshieldGrad})`}
              />
              <path
                d="M183.5 134.5 L197.5 132.5"
                stroke={`url(#${cabRoofGrad})`}
                strokeWidth="3"
                strokeLinecap="round"
              />
              <rect
                x="220"
                y="150"
                width="7.5"
                height="13.5"
                rx="2.2"
                fill={`url(#${headlampGrad})`}
              />
              <rect
                x="212"
                y="151.5"
                width="6.5"
                height="14"
                rx="2.2"
                fill="#F59E0B"
              />
              <rect
                x="213.5"
                y="151.5"
                width="6.5"
                height="14"
                rx="2.2"
                fill={`url(#${headlampGrad})`}
              />
              <path
                d="M161 169 C161 151.5 203 151.5 203 169"
                stroke={`url(#${cabRoofGrad})`}
                strokeWidth="4.8"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* --- FOREGROUND 3D WHEELS --- */}
            <g>
              <circle cx="78" cy="171" r="18.5" fill={`url(#${tireFrontGrad})`} />
              <circle cx="78" cy="171" r="10.2" fill={`url(#${rimWellGrad})`} />
              <g
                className="jiyoo-truck-anim"
                style={
                  animated
                    ? {
                        transformOrigin: "78px 171px",
                        animation: "jiyoo-wheel-spin 0.85s linear infinite",
                      }
                    : undefined
                }
              >
                <circle
                  cx="78"
                  cy="171"
                  r="9.2"
                  stroke="#7C4A36"
                  strokeWidth="1.2"
                  strokeDasharray="8 6"
                  fill="none"
                  opacity="0.75"
                />
                <circle cx="78" cy="171" r="5.5" fill={`url(#${hubCapGrad})`} />
                <circle cx="76.5" cy="169.5" r="1.4" fill="#A66E56" opacity="0.75" />
              </g>
            </g>

            <g>
              <circle cx="182" cy="169" r="18.5" fill={`url(#${tireFrontGrad})`} />
              <circle cx="182" cy="169" r="10.2" fill={`url(#${rimWellGrad})`} />
              <g
                className="jiyoo-truck-anim"
                style={
                  animated
                    ? {
                        transformOrigin: "182px 169px",
                        animation: "jiyoo-wheel-spin 0.85s linear infinite",
                      }
                    : undefined
                }
              >
                <circle
                  cx="182"
                  cy="169"
                  r="9.2"
                  stroke="#7C4A36"
                  strokeWidth="1.2"
                  strokeDasharray="8 6"
                  fill="none"
                  opacity="0.75"
                />
                <circle cx="182" cy="169" r="5.5" fill={`url(#${hubCapGrad})`} />
                <circle cx="180.5" cy="167.5" r="1.4" fill="#A66E56" opacity="0.75" />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </span>
  );
});

export const ExpressDeliveryTruckIcon = RealisticDeliveryScooter;
