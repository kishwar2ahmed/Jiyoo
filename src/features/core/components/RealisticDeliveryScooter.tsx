import React, { useEffect, useId } from "react";

export interface RealisticDeliveryScooterProps {
  className?: string;
  showSmoke?: boolean;
  animated?: boolean;
}

let scooterStylesInjected = false;
function ensureScooterStylesInjected() {
  if (scooterStylesInjected || typeof document === "undefined") return;
  scooterStylesInjected = true;
  const style = document.createElement("style");
  style.id = "jiyoo-luxury-scooter-styles";
  style.textContent = `
    @keyframes jiyoo-scooter-chassis-glide {
      0%, 100% { transform: translate3d(0px, 0px, 0) rotate(0deg); }
      50% { transform: translate3d(0.8px, -1.8px, 0) rotate(-0.8deg); }
    }
    @keyframes jiyoo-scooter-wheel-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes jiyoo-scooter-stream-1 {
      0%, 100% { transform: translateX(0px) scaleX(0.85); opacity: 0.35; }
      50% { transform: translateX(-5px) scaleX(1.15); opacity: 0.95; }
    }
    @keyframes jiyoo-scooter-stream-2 {
      0%, 100% { transform: translateX(0px) scaleX(1.1); opacity: 0.85; }
      50% { transform: translateX(-7px) scaleX(0.8); opacity: 0.3; }
    }
    @keyframes jiyoo-scooter-beam-pulse {
      0%, 100% { opacity: 0.55; transform: scaleX(0.96); }
      50% { opacity: 0.9; transform: scaleX(1.06); }
    }
    @keyframes jiyoo-scooter-road-flow {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: -16; }
    }
    @media (prefers-reduced-motion: reduce) {
      .jiyoo-scooter-anim {
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Bespoke Luxury Concierge Delivery Scooter Icon
 * Handcrafted SVG geometry in JIYOO's signature Obsidian, Warm Ivory, Champagne Gold,
 * and Deep Emerald palette with smooth 60fps suspension, rotating alloy spokes,
 * and fine golden slipstream trails.
 */
export const RealisticDeliveryScooter = React.memo(function RealisticDeliveryScooter({
  className = "w-8 h-6 shrink-0",
  animated = true,
}: RealisticDeliveryScooterProps) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, "");

  useEffect(() => {
    ensureScooterStylesInjected();
  }, []);

  const bodyGrad = `js-body-${uid}`;
  const goldGrad = `js-gold-${uid}`;
  const trunkGrad = `js-trunk-${uid}`;
  const emeraldGrad = `js-emerald-${uid}`;
  const tireGrad = `js-tire-${uid}`;
  const beamGrad = `js-beam-${uid}`;
  const seatGrad = `js-seat-${uid}`;

  return (
    <span
      className={`inline-flex items-center justify-center align-middle relative select-none transition-transform duration-300 group-hover:scale-105 ${className}`}
      aria-label="Express Delivery"
      title="Express Fresh Delivery"
    >
      <svg
        viewBox="0 0 120 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Lustrous Obsidian & Espresso Enamel Body */}
          <linearGradient id={bodyGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38332E" />
            <stop offset="45%" stopColor="#1C1917" />
            <stop offset="100%" stopColor="#0C0A09" />
          </linearGradient>

          {/* Metallic Champagne Gold Trim & Alloy Rims */}
          <linearGradient id={goldGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F7E8C8" />
            <stop offset="40%" stopColor="#D4AF37" />
            <stop offset="75%" stopColor="#9A6F28" />
            <stop offset="100%" stopColor="#E6C987" />
          </linearGradient>

          {/* Warm Ivory & Alabaster Insulated Gourmet Delivery Trunk */}
          <linearGradient id={trunkGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFDF9" />
            <stop offset="60%" stopColor="#F5EFE2" />
            <stop offset="100%" stopColor="#E4D7C0" />
          </linearGradient>

          {/* Deep Emerald Freshness Accent */}
          <linearGradient id={emeraldGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* Rich Espresso Leather Saddle */}
          <linearGradient id={seatGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9A6338" />
            <stop offset="55%" stopColor="#6E4220" />
            <stop offset="100%" stopColor="#432610" />
          </linearGradient>

          {/* Deep Vulcanized Rubber Tire */}
          <radialGradient id={tireGrad} cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#1C1917" />
            <stop offset="100%" stopColor="#090807" />
          </radialGradient>

          {/* Soft Warm Golden Headlamp Beam */}
          <linearGradient id={beamGrad} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#D4AF37" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ground Shadow & Scrolling Golden Road Line */}
        <ellipse cx="64" cy="79.5" rx="42" ry="3.2" fill="#1C1917" fillOpacity="0.16" />
        <line
          x1="14"
          y1="79.5"
          x2="108"
          y2="79.5"
          stroke={`url(#${goldGrad})`}
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeDasharray="5 3"
          className="jiyoo-scooter-anim"
          style={
            animated
              ? { animation: "jiyoo-scooter-road-flow 0.65s linear infinite" }
              : undefined
          }
          opacity="0.7"
        />

        {/* Delicate Aerodynamic Slipstream Hairlines */}
        <g aria-hidden="true">
          <line
            x1="4"
            y1="32"
            x2="21"
            y2="32"
            stroke={`url(#${goldGrad})`}
            strokeWidth="2.2"
            strokeLinecap="round"
            className="jiyoo-scooter-anim"
            style={
              animated
                ? { animation: "jiyoo-scooter-stream-1 1.4s ease-in-out infinite" }
                : undefined
            }
          />
          <line
            x1="2"
            y1="43"
            x2="17"
            y2="43"
            stroke={`url(#${emeraldGrad})`}
            strokeWidth="2"
            strokeLinecap="round"
            className="jiyoo-scooter-anim"
            style={
              animated
                ? { animation: "jiyoo-scooter-stream-2 1.25s ease-in-out infinite 0.2s" }
                : undefined
            }
          />
          <line
            x1="7"
            y1="54"
            x2="20"
            y2="54"
            stroke={`url(#${goldGrad})`}
            strokeWidth="1.8"
            strokeLinecap="round"
            className="jiyoo-scooter-anim"
            style={
              animated
                ? { animation: "jiyoo-scooter-stream-1 1.55s ease-in-out infinite 0.4s" }
                : undefined
            }
          />
        </g>

        {/* =============================================================== */}
        {/* REAR & FRONT ROTATING WHEELS (Anchored to Ground Plane)         */}
        {/* =============================================================== */}
        {/* Rear Wheel (cx=39, cy=66.5) */}
        <g>
          <circle cx="39" cy="66.5" r="11.5" fill={`url(#${tireGrad})`} />
          <circle cx="39" cy="66.5" r="8.2" stroke="#F5EFE2" strokeWidth="1.2" opacity="0.9" />
          <circle cx="39" cy="66.5" r="6.4" fill="#1C1917" stroke={`url(#${goldGrad})`} strokeWidth="1.4" />
          <g
            className="jiyoo-scooter-anim"
            style={
              animated
                ? {
                    transformOrigin: "39px 66.5px",
                    animation: "jiyoo-scooter-wheel-spin 0.9s linear infinite",
                  }
                : undefined
            }
          >
            <line x1="39" y1="60.5" x2="39" y2="72.5" stroke={`url(#${goldGrad})`} strokeWidth="1.2" />
            <line x1="33.8" y1="63.5" x2="44.2" y2="69.5" stroke={`url(#${goldGrad})`} strokeWidth="1.2" />
            <line x1="33.8" y1="69.5" x2="44.2" y2="63.5" stroke={`url(#${goldGrad})`} strokeWidth="1.2" />
            <circle cx="39" cy="66.5" r="2.3" fill={`url(#${goldGrad})`} />
          </g>
        </g>

        {/* Front Wheel (cx=88, cy=66.5) */}
        <g>
          <circle cx="88" cy="66.5" r="11.5" fill={`url(#${tireGrad})`} />
          <circle cx="88" cy="66.5" r="8.2" stroke="#F5EFE2" strokeWidth="1.2" opacity="0.9" />
          <circle cx="88" cy="66.5" r="6.4" fill="#1C1917" stroke={`url(#${goldGrad})`} strokeWidth="1.4" />
          <g
            className="jiyoo-scooter-anim"
            style={
              animated
                ? {
                    transformOrigin: "88px 66.5px",
                    animation: "jiyoo-scooter-wheel-spin 0.9s linear infinite",
                  }
                : undefined
            }
          >
            <line x1="88" y1="60.5" x2="88" y2="72.5" stroke={`url(#${goldGrad})`} strokeWidth="1.2" />
            <line x1="82.8" y1="63.5" x2="93.2" y2="69.5" stroke={`url(#${goldGrad})`} strokeWidth="1.2" />
            <line x1="82.8" y1="69.5" x2="93.2" y2="63.5" stroke={`url(#${goldGrad})`} strokeWidth="1.2" />
            <circle cx="88" cy="66.5" r="2.3" fill={`url(#${goldGrad})`} />
          </g>
        </g>

        {/* =============================================================== */}
        {/* SUSPENSION-ANIMATED SCOOTER CHASSIS & GOURMET CONCIERGE TRUNK   */}
        {/* =============================================================== */}
        <g
          className="jiyoo-scooter-anim"
          style={
            animated
              ? {
                  transformOrigin: "64px 56px",
                  animation: "jiyoo-scooter-chassis-glide 1.8s ease-in-out infinite",
                }
              : undefined
          }
        >
          {/* Soft Headlamp Light Cone */}
          <polygon
            points="93,27 119,19 119,41 93,33"
            fill={`url(#${beamGrad})`}
            className="jiyoo-scooter-anim"
            style={
              animated
                ? {
                    transformOrigin: "93px 30px",
                    animation: "jiyoo-scooter-beam-pulse 1.6s ease-in-out infinite",
                  }
                : undefined
            }
          />

          {/* Gold Rear Luggage Rack Support */}
          <path
            d="M24 44 L44 44 L41 50"
            stroke={`url(#${goldGrad})`}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Insulated Gourmet Concierge Trunk (Rear Box) */}
          <g>
            <rect
              x="21"
              y="18"
              width="25"
              height="24"
              rx="4.5"
              fill={`url(#${trunkGrad})`}
              stroke={`url(#${goldGrad})`}
              strokeWidth="1.6"
            />
            {/* Lid Seam & Gold Clasp */}
            <line
              x1="21.5"
              y1="25.5"
              x2="45.5"
              y2="25.5"
              stroke="#C5A880"
              strokeWidth="1.1"
            />
            <rect
              x="31.5"
              y="23.5"
              width="4"
              height="4"
              rx="1"
              fill={`url(#${goldGrad})`}
            />
            {/* Emerald Fresh Leaf Emblem on Trunk */}
            <circle
              cx="33.5"
              cy="34"
              r="4.6"
              fill={`url(#${emeraldGrad})`}
            />
            <path
              d="M31.6 34.1 L33 35.5 L35.8 32.6"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Main Italian-Style Curved Scooter Body (Obsidian Enamel) */}
          <path
            d="M25 56 C25 46 34 42 48 42 L56 42 L58 58 L71 58 C74 58 76 55 77.5 49 L82.5 29 C83.2 26.2 85.8 25 88.2 26 C90.2 26.8 91 29.2 90 32.5 L83.5 55 C81.5 61.5 76.5 64.5 69.5 64.5 L49 64.5 C46 64.5 44 62 41 59.5 L27 59.5 C25.5 59.5 25 58 25 56 Z"
            fill={`url(#${bodyGrad})`}
            stroke={`url(#${goldGrad})`}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />

          {/* Signature Champagne Gold Side Sweeping Trim Line */}
          <path
            d="M29 53 C34 48.5 43 48 53 49.5"
            stroke={`url(#${goldGrad})`}
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Front Wheel Sculpted Fender & Fork */}
          <line
            x1="83.5"
            y1="47"
            x2="88"
            y2="66.5"
            stroke={`url(#${goldGrad})`}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M75.5 59 C79 51 94 51 98.5 59.5 C93.5 58.2 81.5 58.2 75.5 59 Z"
            fill={`url(#${bodyGrad})`}
            stroke={`url(#${goldGrad})`}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />

          {/* Espresso Leather Contoured Saddle Seat */}
          <path
            d="M42 42 C42 37.8 45.5 36.2 52 36.2 L59.5 36.2 C62 36.2 63.5 38 63 40.5 C62.6 42.2 60.5 43 57.5 43 L43.5 43 C42.4 43 42 42.6 42 42 Z"
            fill={`url(#${seatGrad})`}
            stroke="#C5A880"
            strokeWidth="1"
          />

          {/* Handlebar Neck, Grips & Beveled Gold Headlamp */}
          <path
            d="M78.5 25.5 L85.5 25.5"
            stroke={`url(#${goldGrad})`}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle
            cx="77.5"
            cy="25.5"
            r="2"
            fill="#1C1917"
            stroke={`url(#${goldGrad})`}
            strokeWidth="1.1"
          />
          {/* Beveled Headlamp Cowl */}
          <path
            d="M87.5 24.5 L92.5 24.5 C94 24.5 95 26 95 29 C95 32 94 33.5 92.5 33.5 L87.5 33.5 Z"
            fill={`url(#${bodyGrad})`}
            stroke={`url(#${goldGrad})`}
            strokeWidth="1.3"
          />
          <ellipse
            cx="94.8"
            cy="29"
            rx="1.6"
            ry="3.6"
            fill="#FEF3C7"
          />
        </g>
      </svg>
    </span>
  );
});

export const ExpressDeliveryTruckIcon = RealisticDeliveryScooter;
