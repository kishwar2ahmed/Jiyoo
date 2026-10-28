import { useState, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";

interface ArchitecturalButterflyProps {
  prefersReducedMotion?: boolean | null;
}

const BUTTERFLY_ASSET = "/assets/aistudio/IMG_5361fb71-6e50-4961-bfc5-2b6612d44949_d01b4bb7.png";

export function ArchitecturalButterfly({
  prefersReducedMotion: propPrefersReduced,
}: ArchitecturalButterflyProps) {
  const hookPrefersReduced = useReducedMotion();
  const prefersReduced = Boolean(propPrefersReduced ?? hookPrefersReduced);

  // States
  const [hasLanded, setHasLanded] = useState(prefersReduced);
  const [isHovered, setIsHovered] = useState(false);
  const [flightIteration, setFlightIteration] = useState(0);
  const [isFlying, setIsFlying] = useState(false);

  // Initial grand flight across the full brand imprint on view/mount
  useEffect(() => {
    if (prefersReduced) {
      setHasLanded(true);
      return;
    }

    const startTimer = setTimeout(() => {
      setIsFlying(true);
      setHasLanded(false);
    }, 450);

    const landTimer = setTimeout(() => {
      setIsFlying(false);
      setHasLanded(true);
    }, 9450); // 450ms start delay + 9000ms full flight

    return () => {
      clearTimeout(startTimer);
      clearTimeout(landTimer);
    };
  }, [prefersReduced]);

  // Handle re-flight when user interacts (click or Enter/Space)
  const handleTakeoff = useCallback(() => {
    if (isFlying || prefersReduced) return;
    setFlightIteration((prev) => prev + 1);
    setIsFlying(true);
    setHasLanded(false);

    setTimeout(() => {
      setIsFlying(false);
      setHasLanded(true);
    }, 4500);
  }, [isFlying, prefersReduced]);

  // Reduced motion mode: directly resting on the letter 'O'
  if (prefersReduced) {
    return (
      <div
        className="absolute -top-[14%] right-[8%] sm:right-[12%] z-30 pointer-events-auto select-none"
        aria-label="Blue morpho butterfly resting peacefully on JIYOO"
      >
        <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 transform-gpu">
          <img
            src={BUTTERFLY_ASSET}
            alt="JIYOO Blue Butterfly"
            className="w-full h-full object-contain filter drop-shadow-[0_4px_14px_rgba(14,165,233,0.45)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] rotate-6"
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute -top-[14%] right-[8%] sm:right-[12%] z-30 pointer-events-auto select-none focus:outline-none"
      tabIndex={0}
      role="button"
      aria-label="Interactive blue butterfly exploring the JIYOO brand imprint. Click to flutter."
      onClick={handleTakeoff}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleTakeoff();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Flight Trajectory Wrapper (Panoramic X, Y, Banking Rotation, Altitude Scaling) */}
      <motion.div
        key={flightIteration}
        initial={
          flightIteration === 0
            ? {
                x: "-50vw",
                y: "12vw",
                rotate: -20,
                scale: 0.75,
                opacity: 0,
              }
            : {
                x: "0vw",
                y: "0vw",
                rotate: 6,
                scale: 1,
                opacity: 1,
              }
        }
        animate={
          flightIteration === 0
            ? {
                // EXPANSIVE PANORAMIC FLIGHT ALL OVER THE BRAND IMPRINT (J -> I -> Y -> O -> O):
                // 1. Lift off from lower base of J
                // 2. Climb up J's stem into the sky above
                // 3. Swoop down into Y
                // 4. Climb high above the first O
                // 5. Sweep around the right flank of final O
                // 6. Dive beneath the final O
                // 7. Sweep back westward beneath all letters (O, Y, I, J) along the waterline
                // 8. Climb high in an updraft above J and I
                // 9. Soar back eastward across the upper crests of Y and O
                // 10. Circle and decelerate over the final O
                // 11. Softly land on the crest of the O
                x: [
                  "-50vw", // 1. Start near base of J
                  "-46vw", // 2. Climb up along J
                  "-28vw", // 3. Swoop through Y
                  "-14vw", // 4. High arch over first O
                  "6vw",   // 5. Sweep around right side of final O
                  "4vw",   // 6. Dive down beneath final O
                  "-22vw", // 7. Sweep back west underneath O's and Y
                  "-44vw", // 8. Glide under I and J
                  "-48vw", // 9. Climb high above J in spiral
                  "-20vw", // 10. Soar back east across upper crest of Y & O
                  "-6vw",  // 11. Decelerating bank toward final O
                  "1.5vw", // 12. Hover delicately above the O
                  "0vw",   // 13. Settle softly on the crest of the O
                ],
                y: [
                  "12vw",   // 1. Low near J base
                  "-8vw",   // 2. High ascent over J
                  "4vw",    // 3. Valley dip into Y
                  "-12vw",  // 4. Crest over first O
                  "-4vw",   // 5. Right flank
                  "13vw",   // 6. Beneath the final O
                  "15vw",   // 7. Low sweep under wordmark
                  "10vw",   // 8. Low near J
                  "-11vw",  // 9. Soar high into upper skies
                  "-12vw",  // 10. High flight across wordmark top
                  "-6vw",   // 11. Decelerating approach
                  "-2.5vw", // 12. Gentle hover
                  "0vw",    // 13. Touchdown on O
                ],
                rotate: [
                  -20, // Bank into climb
                  22,  // Level out at peak
                  14,  // Gliding down into Y
                  -26, // Banking up over first O
                  32,  // Circling right
                  18,  // Diving down
                  -16, // Level westward glide
                  -24, // Banking into steep climb
                  20,  // Leveling out at high altitude
                  10,  // Eastward soaring glide
                  -14, // Approach bank
                  10,  // Decelerating hover
                  6,   // Resting angle on O
                ],
                scale: [
                  0.75, // Distant lift-off
                  0.96, // Approaching
                  1.08, // Close glide
                  1.16, // Loop peak
                  1.02, // Turning
                  0.88, // Low dive
                  0.94, // Waterline sweep
                  0.88, // Pulling up
                  1.12, // High soaring altitude
                  1.14, // Overhead pass
                  1.02, // Descent
                  0.96, // Hover
                  1.0,  // Landed size
                ],
                opacity: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
              }
            : {
                // Interactive flight loop all over the imprint on tap / click
                x: [
                  "0vw",
                  "4vw",
                  "-8vw",
                  "-26vw",
                  "-40vw",
                  "-28vw",
                  "-12vw",
                  "2vw",
                  "0vw",
                ],
                y: [
                  "0vw",
                  "-8vw",
                  "-14vw",
                  "-6vw",
                  "6vw",
                  "12vw",
                  "-4vw",
                  "-2vw",
                  "0vw",
                ],
                rotate: [6, -22, -34, 18, -16, 26, -18, 10, 6],
                scale: [1, 1.15, 1.18, 1.05, 0.9, 0.95, 1.08, 0.96, 1],
                opacity: 1,
              }
        }
        transition={
          flightIteration === 0
            ? {
                duration: 9.0,
                ease: [0.25, 0.1, 0.25, 1],
                times: [
                  0,
                  0.08,
                  0.18,
                  0.28,
                  0.38,
                  0.46,
                  0.56,
                  0.65,
                  0.73,
                  0.81,
                  0.88,
                  0.94,
                  1,
                ],
              }
            : {
                duration: 4.5,
                ease: [0.22, 1, 0.36, 1],
                times: [0, 0.12, 0.26, 0.42, 0.58, 0.72, 0.86, 0.94, 1],
              }
        }
        className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 transform-gpu cursor-pointer"
        style={{ transformOrigin: "center center" }}
      >
        {/* Soft sapphire atmospheric luminescence aura */}
        <div
          className={`absolute -inset-2 rounded-full bg-sky-400/30 blur-md pointer-events-none transition-opacity duration-700 transform-gpu ${
            isFlying ? "opacity-95" : isHovered ? "opacity-80" : "opacity-40"
          }`}
        />

        {/* 3D Wing Fluttering Physics Container */}
        <motion.div
          animate={
            isFlying
              ? {
                  // Rapid, natural wing flapping during active flight
                  scaleX: [1, 0.28, 1, 0.24, 1, 0.3, 1],
                  scaleY: [1, 1.06, 1, 1.08, 1, 1.05, 1],
                }
              : hasLanded
              ? {
                  // Gentle organic resting breathing rhythm once sitting peacefully on the 'O'
                  scaleX: isHovered
                    ? [1, 0.55, 1, 0.6, 1]
                    : [1, 1, 0.72, 1, 0.86, 1, 1],
                  scaleY: [1, 1, 1.03, 1, 1.02, 1, 1],
                }
              : { scaleX: 1, scaleY: 1 }
          }
          transition={
            isFlying
              ? {
                  duration: 0.22,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : {
                  duration: isHovered ? 0.8 : 4.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  times: isHovered
                    ? [0, 0.25, 0.5, 0.75, 1]
                    : [0, 0.45, 0.6, 0.75, 0.85, 0.92, 1],
                }
          }
          className="relative w-full h-full transform-gpu"
          style={{ transformOrigin: "center center", transformStyle: "preserve-3d" }}
        >
          <img
            src={BUTTERFLY_ASSET}
            alt="JIYOO Blue Butterfly"
            className="w-full h-full object-contain filter drop-shadow-[0_6px_16px_rgba(14,165,233,0.5)] drop-shadow-[0_2px_5px_rgba(0,0,0,0.35)] select-none pointer-events-none"
            loading="lazy"
            draggable={false}
          />
        </motion.div>

        {/* Ephemeral luminous stardust particle trailing behind the butterfly */}
        {isFlying && (
          <motion.div
            initial={{ opacity: 0.85, scale: 0.9 }}
            animate={{ opacity: 0, scale: 0.2, y: 14 }}
            transition={{ duration: 0.55, repeat: Infinity, ease: "easeOut" }}
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-sky-300 blur-[1px] pointer-events-none"
          />
        )}
      </motion.div>
    </div>
  );
}
