import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useReducedMotion } from 'motion/react';

export interface UseTypewriterOptions {
  /** Array of phrases to type and cycle through */
  phrases: readonly string[];
  /** Base typing speed in ms per character (default: 46ms) */
  typingSpeed?: number;
  /** Base deleting speed in ms per character (default: 24ms) */
  deletingSpeed?: number;
  /** How long to hold a completed phrase before deleting (default: 2600ms) */
  pauseDuration?: number;
  /** Initial delay before typing starts on first mount (default: 350ms) */
  startDelay?: number;
  /** Whether to loop through phrases continuously (default: true) */
  loop?: boolean;
  /** Pause the typewriter externally (e.g. when input is focused or offscreen) */
  paused?: boolean;
}

export interface UseTypewriterReturn {
  displayText: string;
  currentPhrase: string;
  longestPhrase: string;
  isTyping: boolean;
  isDeleting: boolean;
  isResting: boolean;
  phraseIndex: number;
}

/**
 * Production-grade humanized typewriter hook with:
 * - Natural keystroke cadence variance & punctuation micro-pauses
 * - Automatic pause when browser tab is backgrounded (`document.hidden`)
 * - Full WCAG `prefers-reduced-motion` compliance
 */
export function useTypewriter({
  phrases,
  typingSpeed = 46,
  deletingSpeed = 24,
  pauseDuration = 2600,
  startDelay = 350,
  loop = true,
  paused = false,
}: UseTypewriterOptions): UseTypewriterReturn {
  const prefersReducedMotion = useReducedMotion();
  const safePhrases = useMemo(
    () => (phrases.length > 0 ? phrases : ['']),
    [phrases]
  );

  const longestPhrase = useMemo(
    () =>
      safePhrases.reduce(
        (longest, candidate) =>
          candidate.length > longest.length ? candidate : longest,
        safePhrases[0] || ''
      ),
    [safePhrases]
  );

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(() => safePhrases[0]?.length ?? 0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);

  const currentPhrase = safePhrases[phraseIndex % safePhrases.length] || '';

  // Pause animation when browser tab is hidden to save CPU/battery
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Initial start delay so first paint is instant and LCP is never delayed
  useEffect(() => {
    if (prefersReducedMotion) return;
    const timer = setTimeout(() => {
      setHasStarted(true);
    }, startDelay);
    return () => clearTimeout(timer);
  }, [prefersReducedMotion, startDelay]);

  useEffect(() => {
    if (prefersReducedMotion || paused || isTabHidden || !hasStarted) {
      return;
    }

    const activeTarget = safePhrases[phraseIndex % safePhrases.length] || '';

    // Completed typing current phrase
    if (!isDeleting && charIndex >= activeTarget.length) {
      if (!loop && phraseIndex >= safePhrases.length - 1) {
        return;
      }
      const holdTimer = setTimeout(() => {
        setIsDeleting(true);
      }, pauseDuration);
      return () => clearTimeout(holdTimer);
    }

    // Completed deleting current phrase -> advance to next phrase
    if (isDeleting && charIndex <= 0) {
      const switchTimer = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % safePhrases.length);
      }, 140);
      return () => clearTimeout(switchTimer);
    }

    // Compute humanized next step delay
    let delay = isDeleting ? deletingSpeed : typingSpeed;

    if (!isDeleting) {
      const prevChar = activeTarget[charIndex - 1] || '';
      // Deterministic organic cadence variation based on character position
      const microVariance = ((charIndex * 17 + phraseIndex * 31) % 18) - 8;
      delay = Math.max(22, typingSpeed + microVariance);

      // Subtle editorial pause after punctuation or clause separators
      if (prevChar === ',' || prevChar === '&' || prevChar === '—') {
        delay += 130;
      } else if (prevChar === '.' || prevChar === '?' || prevChar === '!') {
        delay += 180;
      } else if (prevChar === ' ') {
        delay += 18;
      }
    }

    const stepTimer = setTimeout(() => {
      setCharIndex((prev) => prev + (isDeleting ? -1 : 1));
    }, delay);

    return () => clearTimeout(stepTimer);
  }, [
    prefersReducedMotion,
    paused,
    isTabHidden,
    hasStarted,
    charIndex,
    isDeleting,
    phraseIndex,
    safePhrases,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    loop,
  ]);

  if (prefersReducedMotion) {
    return {
      displayText: safePhrases[0] || '',
      currentPhrase: safePhrases[0] || '',
      longestPhrase,
      isTyping: false,
      isDeleting: false,
      isResting: true,
      phraseIndex: 0,
    };
  }

  const clampedIndex = Math.max(0, Math.min(charIndex, currentPhrase.length));
  const displayText = currentPhrase.slice(0, clampedIndex);
  const isResting = !isDeleting && clampedIndex === currentPhrase.length;
  const isTyping = !isResting && !isDeleting;

  return {
    displayText,
    currentPhrase,
    longestPhrase,
    isTyping,
    isDeleting,
    isResting,
    phraseIndex,
  };
}

export interface TypewriterTextProps extends UseTypewriterOptions {
  /** Class name applied to the outer inline-grid container */
  className?: string;
  /** Class name applied specifically to the visible text span */
  textClassName?: string;
  /** Class name applied to the editorial vertical caret */
  cursorClassName?: string;
  /** Whether to show the blinking editorial caret (default: true) */
  showCursor?: boolean;
  /** Reserve layout space of the longest phrase to guarantee 0 CLS (default: true) */
  reserveLongestSpace?: boolean;
  /** Accessible label override for screen readers */
  ariaLabel?: string;
}

/**
 * Zero-CLS, viewport-aware luxury TypewriterText component.
 * Uses an invisible ghost reservation layer in the same CSS Grid cell
 * so multi-line mobile/desktop text never causes layout shifts or height jumps.
 */
export const TypewriterText: React.FC<TypewriterTextProps> = ({
  phrases,
  typingSpeed = 46,
  deletingSpeed = 24,
  pauseDuration = 2600,
  startDelay = 350,
  loop = true,
  paused = false,
  className = '',
  textClassName = '',
  cursorClassName = 'bg-[#8A5A36]',
  showCursor = true,
  reserveLongestSpace = true,
  ariaLabel,
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [isInView, setIsInView] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  // Pause timers when scrolled out of viewport
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]) {
          setIsInView(entries[0].isIntersecting);
        }
      },
      { rootMargin: '120px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { displayText, currentPhrase, longestPhrase, isResting } = useTypewriter({
    phrases,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    startDelay,
    loop,
    paused: paused || !isInView,
  });

  const accessibleText = ariaLabel || phrases[0] || currentPhrase;

  return (
    <span
      ref={containerRef}
      aria-label={accessibleText}
      className={`inline-grid items-baseline text-left align-baseline ${className}`}
    >
      {/* Ghost sizing layer: locks exact width & multi-line height of longest phrase (Zero CLS) */}
      {reserveLongestSpace && (
        <span
          aria-hidden="true"
          className="[grid-area:1/1] invisible pointer-events-none select-none whitespace-normal"
        >
          {longestPhrase}
          {showCursor ? '\u00A0' : ''}
        </span>
      )}

      {/* Live animated text + editorial hairline caret */}
      <span
        aria-hidden="true"
        className="[grid-area:1/1] inline whitespace-normal"
      >
        <span className={textClassName}>{displayText}</span>
        {showCursor && !prefersReducedMotion && (
          <span
            className={`inline-block w-[1.5px] sm:w-[2px] h-[0.86em] ml-[3px] align-[-0.08em] rounded-full transition-opacity duration-150 ${cursorClassName} ${
              isResting ? 'animate-[jiyooCaretPulse_1.05s_ease-in-out_infinite]' : 'opacity-95'
            }`}
          />
        )}
      </span>
    </span>
  );
};
