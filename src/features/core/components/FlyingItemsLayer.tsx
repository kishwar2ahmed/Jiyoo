import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";
import { useCart, FlyingItem } from "../../../contexts/CartContext";

interface CartCoordinates {
  x: number;
  y: number;
}

function sampleQuadraticBezier(
  p0: CartCoordinates,
  p1: CartCoordinates,
  p2: CartCoordinates,
  t: number
): CartCoordinates {
  const oneMinusT = 1 - t;
  return {
    x:
      oneMinusT * oneMinusT * p0.x +
      2 * oneMinusT * t * p1.x +
      t * t * p2.x,
    y:
      oneMinusT * oneMinusT * p0.y +
      2 * oneMinusT * t * p1.y +
      t * t * p2.y,
  };
}

function computeFlightTrajectory(item: FlyingItem, cartPos: CartCoordinates) {
  const start = { x: item.startX, y: item.startY };
  const end = { x: cartPos.x, y: cartPos.y };
  const distance = Math.hypot(end.x - start.x, end.y - start.y);

  // Create an elevated parabolic control point so the product arcs gracefully into the cart
  const arcLift = Math.max(95, Math.min(195, distance * 0.25));
  const control: CartCoordinates = {
    x: start.x + (end.x - start.x) * 0.36,
    y: Math.max(36, Math.min(start.y, end.y) - arcLift),
  };

  // Sample 7 points along the curve; step 1 is a brief showcase lift right above the card
  const uSteps = [0, 0.05, 0.22, 0.48, 0.74, 0.93, 1];
  const points = uSteps.map((u) => sampleQuadraticBezier(start, control, end, u));

  return {
    start,
    control,
    end,
    xKeyframes: points.map((p) => p.x),
    yKeyframes: points.map((p) => p.y),
    svgPath: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
  };
}

export function FlyingItemsLayer() {
  const { flyingItems, removeFlyingItem } = useCart();
  const [cartPos, setCartPos] = useState<CartCoordinates>(() => ({
    x: typeof window !== "undefined" ? window.innerWidth - 44 : 320,
    y: 36,
  }));

  const updateCartPos = useCallback(() => {
    const candidates = [
      document.getElementById("cart-icon-button"),
      document.getElementById("cart-icon-button-mobile"),
    ];
    for (const cartIcon of candidates) {
      if (cartIcon) {
        const rect = cartIcon.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setCartPos({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
          return;
        }
      }
    }
  }, []);

  useEffect(() => {
    updateCartPos();
    window.addEventListener("resize", updateCartPos, { passive: true });
    window.addEventListener("scroll", updateCartPos, { passive: true });
    return () => {
      window.removeEventListener("resize", updateCartPos);
      window.removeEventListener("scroll", updateCartPos);
    };
  }, [updateCartPos]);

  // Re-measure cart icon position immediately whenever a new flying item launches
  useEffect(() => {
    if (flyingItems.length > 0) {
      updateCartPos();
    }
  }, [flyingItems.length, updateCartPos]);

  const handleFlightComplete = (id: string) => {
    removeFlyingItem(id);
    window.dispatchEvent(new CustomEvent("jiyoo-cart-landed"));
  };

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
    >
      {/* Golden Parabolic Flight Trails */}
      <svg className="absolute inset-0 w-full h-full overflow-visible">
        <defs>
          <linearGradient id="jiyoo-flight-arc" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C5A880" stopOpacity="0.2" />
            <stop offset="55%" stopColor="#C5A880" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <AnimatePresence>
          {flyingItems.map((item) => {
            const { svgPath } = computeFlightTrajectory(item, cartPos);
            return (
              <motion.path
                key={`trail-${item.id}`}
                d={svgPath}
                fill="none"
                stroke="url(#jiyoo-flight-arc)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="6 6"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: [0, 0.4, 0.88, 1],
                  opacity: [0, 0.9, 0.75, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.62,
                  times: [0, 0.2, 0.78, 1],
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            );
          })}
        </AnimatePresence>
      </svg>

      {/* Launch Ripple & Parabolic Flying Product Cards */}
      <AnimatePresence>
        {flyingItems.map((item) => {
          const { start, xKeyframes, yKeyframes } = computeFlightTrajectory(
            item,
            cartPos
          );

          return (
            <div key={item.id}>
              {/* Origin Lift-Off Halo */}
              <motion.div
                initial={{
                  x: start.x,
                  y: start.y,
                  scale: 0.45,
                  opacity: 0.85,
                }}
                animate={{
                  x: start.x,
                  y: start.y,
                  scale: 1.65,
                  opacity: 0,
                }}
                transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-0 left-0 -ml-12 -mt-12 w-24 h-24 rounded-full border-2 border-[#C5A880] bg-[#C5A880]/15"
              />

              {/* Flying Product Showcase Miniature */}
              <motion.div
                initial={{
                  x: xKeyframes[0],
                  y: yKeyframes[0],
                  scale: 0.65,
                  opacity: 0,
                  rotate: -6,
                }}
                animate={{
                  x: xKeyframes,
                  y: yKeyframes,
                  scale: [0.65, 1.16, 1.1, 0.98, 0.8, 0.48, 0.22],
                  opacity: [0, 1, 1, 1, 1, 0.96, 0],
                  rotate: [-6, -2, 3, 5, 2, 0, 0],
                }}
                exit={{ opacity: 0, scale: 0.2 }}
                transition={{
                  duration: 0.62,
                  times: [0, 0.12, 0.28, 0.5, 0.72, 0.89, 1],
                  ease: [0.22, 1, 0.36, 1],
                }}
                onAnimationComplete={() => handleFlightComplete(item.id)}
                className="absolute top-0 left-0 -ml-12 -mt-12 sm:-ml-14 sm:-mt-14 w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center will-change-transform"
              >
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-2 border-[#C5A880] ring-4 ring-[#1C1917]/10 shadow-[0_24px_48px_-8px_rgba(28,25,23,0.42)] p-1.5 sm:p-2 flex items-center justify-center overflow-hidden">
                  {item.image.endsWith(".mp4") ? (
                    <video
                      src={item.image}
                      autoPlay
                      loop
                      muted
                      playsInline
                      webkit-playsinline="true"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <img
                      src={item.image}
                      alt={item.name || "Flying product"}
                      loading="eager"
                      decoding="sync"
                      className="w-full h-full object-contain rounded-xl"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes("/jiyoo.logo.jpeg")) {
                          target.src = "/jiyoo.logo.jpeg";
                        }
                      }}
                    />
                  )}

                  {/* Corner Emerald Verification Badge */}
                  <div className="absolute top-1 right-1 w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-emerald-700 text-white shadow-md flex items-center justify-center border border-white">
                    <Check className="w-3 h-3 stroke-[2.75]" />
                  </div>
                </div>

                {/* Product Name / Price Pill Tag during Flight */}
                {(item.name || item.price) && (
                  <div className="-mt-2 relative z-10 px-2.5 py-0.5 rounded-full bg-[#1C1917] text-[#FAF9F5] border border-[#C5A880]/70 shadow-lg flex items-center gap-1.5 max-w-[136px] sm:max-w-[156px]">
                    {item.name && (
                      <span className="text-[9px] sm:text-[10px] font-semibold truncate">
                        {item.name}
                      </span>
                    )}
                    {item.price && (
                      <span className="text-[9px] sm:text-[10px] font-bold text-[#E5C99B] shrink-0">
                        {item.price}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

