import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFlyingItems, FlyingItem } from "../../../contexts/CartContext";

interface CartCoordinates {
  x: number;
  y: number;
}

// In-memory cache of background-stripped transparent product cutouts (keyed by normalized URL)
const cutoutCache = new Map<string, string>();
const inFlightCutouts = new Map<string, Promise<string>>();

// Non-blocking background idle queue so initial page load & scrolling stay at 60fps
const idlePreloadQueue: string[] = [];
const queuedSet = new Set<string>();
let isProcessingIdleQueue = false;

function normalizeCutoutKey(imageUrl: string): string {
  if (!imageUrl || imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) {
    return imageUrl;
  }
  try {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const parsed = new URL(imageUrl, origin);
    if (parsed.origin === origin) {
      return parsed.pathname + parsed.search;
    }
    return parsed.href;
  } catch {
    return imageUrl;
  }
}

function scheduleIdleWork(cb: () => void) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as any).requestIdleCallback(cb, { timeout: 1200 });
  } else {
    setTimeout(cb, 48);
  }
}

function drainIdlePreloadQueue() {
  if (isProcessingIdleQueue || idlePreloadQueue.length === 0) return;
  isProcessingIdleQueue = true;
  scheduleIdleWork(() => {
    const nextUrl = idlePreloadQueue.shift();
    if (!nextUrl) {
      isProcessingIdleQueue = false;
      return;
    }
    const key = normalizeCutoutKey(nextUrl);
    queuedSet.delete(key);
    stripProductBackground(nextUrl).finally(() => {
      isProcessingIdleQueue = false;
      if (idlePreloadQueue.length > 0) {
        drainIdlePreloadQueue();
      }
    });
  });
}

/**
 * Enqueues a product image for non-blocking background cutout extraction during idle frames,
 * or prioritizes it immediately when `immediate = true` (e.g. on pointer hover / touchstart).
 */
export function preloadProductCutout(imageUrl: string, immediate = false): void {
  if (!imageUrl || imageUrl.endsWith(".mp4")) {
    return;
  }
  const key = normalizeCutoutKey(imageUrl);
  if (cutoutCache.has(key) || inFlightCutouts.has(key)) {
    return;
  }
  if (immediate) {
    void stripProductBackground(imageUrl);
    return;
  }
  if (!queuedSet.has(key) && idlePreloadQueue.length < 256) {
    queuedSet.add(key);
    idlePreloadQueue.push(imageUrl);
    drainIdlePreloadQueue();
  }
}

function isCorsSafeImageUrl(imageUrl: string): boolean {
  if (
    imageUrl.startsWith("/") ||
    imageUrl.startsWith("data:") ||
    imageUrl.startsWith("blob:")
  ) {
    return true;
  }
  try {
    const parsed = new URL(
      imageUrl,
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
    );
    if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
      return true;
    }
    return (
      parsed.hostname.endsWith("unsplash.com") ||
      parsed.hostname.endsWith("wikimedia.org")
    );
  } catch {
    return false;
  }
}

/**
 * Core synchronous pixel matting engine:
 * 1. Local-seed gradient flood-fill from all 4 edges removes white, cream, grey, cool-blue,
 *    warm-tan, and dark studio backdrops (including studio lighting gradients and contact shadows)
 *    while strictly preserving the central product subject.
 * 2. If the outer perimeter is a full-bleed tabletop/plated dish scene (where <76% of the border
 *    is uniform studio background), applies a clean circular dish/subject cutout mask in addition
 *    to removing any visited background regions, guaranteeing zero rectangular background corners.
 */
function extractCutoutFromLoadedImage(
  img: HTMLImageElement,
  cacheKey: string,
  fallbackUrl: string
): string {
  try {
    const maxDim = 160;
    const scale = Math.min(
      1,
      maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1)
    );
    const width = Math.max(1, Math.round((img.naturalWidth || 160) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || 160) * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return fallbackUrl;
    }

    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const totalPixels = width * height;

    // 1. Check if already a transparent PNG cutout
    let transparentBorderCount = 0;
    const totalBorderCount = 2 * width + 2 * Math.max(0, height - 2);

    const checkTransparent = (x: number, y: number) => {
      if (data[(y * width + x) * 4 + 3] < 25) {
        transparentBorderCount++;
      }
    };

    for (let x = 0; x < width; x++) {
      checkTransparent(x, 0);
      checkTransparent(x, height - 1);
    }
    for (let y = 1; y < height - 1; y++) {
      checkTransparent(0, y);
      checkTransparent(width - 1, y);
    }

    if (transparentBorderCount > totalBorderCount * 0.6) {
      cutoutCache.set(cacheKey, fallbackUrl);
      return fallbackUrl;
    }

    const cxCenter = width / 2;
    const cyCenter = height / 2;
    const maxRadius = Math.hypot(cxCenter, cyCenter);

    // 2. Local-seed gradient & studio flood-fill from all 4 outer edges inward
    const visited = new Uint8Array(totalPixels);
    const seedOf = new Int32Array(totalPixels);
    const queue = new Int32Array(totalPixels);
    let head = 0;
    let tail = 0;

    const isSmoothBorderSeed = (x: number, y: number): boolean => {
      const idx = y * width + x;
      const i = idx * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 25) return true;

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (lum > 200 && chroma < 38) return true;

      // Check inward & tangent smoothness so uniform grey/black/tan studio backdrops seed cleanly
      const nx = x === 0 ? 1 : x === width - 1 ? width - 2 : x;
      const ny = y === 0 ? 1 : y === height - 1 ? height - 2 : y;
      const ni = (ny * width + nx) * 4;
      const inwardStep = Math.hypot(
        r - data[ni],
        g - data[ni + 1],
        b - data[ni + 2]
      );

      const tx =
        x === 0 || x === width - 1 ? x : Math.min(width - 1, x + 1);
      const ty =
        y === 0 || y === height - 1 ? y : Math.min(height - 1, y + 1);
      const ti = (ty * width + tx) * 4;
      const tangentStep = Math.hypot(
        r - data[ti],
        g - data[ti + 1],
        b - data[ti + 2]
      );

      return inwardStep < 24 && tangentStep < 24;
    };

    const seedBorderPixel = (x: number, y: number) => {
      const idx = y * width + x;
      if (!visited[idx] && isSmoothBorderSeed(x, y)) {
        visited[idx] = 1;
        seedOf[idx] = idx;
        queue[tail++] = idx;
      }
    };

    for (let x = 0; x < width; x++) {
      seedBorderPixel(x, 0);
      seedBorderPixel(x, height - 1);
    }
    for (let y = 1; y < height - 1; y++) {
      seedBorderPixel(0, y);
      seedBorderPixel(width - 1, y);
    }

    const trySpread = (nx: number, ny: number, parentIdx: number) => {
      const idx = ny * width + nx;
      if (visited[idx]) return;
      const i = idx * 4;
      if (data[i + 3] < 25) {
        visited[idx] = 1;
        seedOf[idx] = seedOf[parentIdx];
        queue[tail++] = idx;
        return;
      }

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const dw = Math.hypot(255 - r, 255 - g, 255 - b);

      // Pure white / bright neutral studio background
      if ((dw < 38 || lum > 220) && chroma < 32) {
        visited[idx] = 1;
        seedOf[idx] = seedOf[parentIdx];
        queue[tail++] = idx;
        return;
      }
      if (r > 236 && g > 234 && b > 228 && chroma < 26) {
        visited[idx] = 1;
        seedOf[idx] = seedOf[parentIdx];
        queue[tail++] = idx;
        return;
      }

      const pi = parentIdx * 4;
      const stepDist = Math.hypot(
        r - data[pi],
        g - data[pi + 1],
        b - data[pi + 2]
      );
      const sIdx = seedOf[parentIdx];
      const si = sIdx * 4;
      const seedR = data[si];
      const seedG = data[si + 1];
      const seedB = data[si + 2];
      const seedDist = Math.hypot(r - seedR, g - seedG, b - seedB);
      const seedLum = 0.299 * seedR + 0.587 * seedG + 0.114 * seedB;

      const radialNorm = Math.hypot(nx - cxCenter, ny - cyCenter) / maxRadius;

      // Soft studio contact shadow on a light backdrop
      if (
        seedLum > 195 &&
        lum > 164 &&
        chroma < 28 &&
        stepDist <= 16 &&
        radialNorm > 0.36
      ) {
        visited[idx] = 1;
        seedOf[idx] = sIdx;
        queue[tail++] = idx;
        return;
      }

      // Smooth gradient studio backdrop (grey, black, cool-blue, warm-tan)
      const maxStep = radialNorm > 0.52 ? 18 : radialNorm > 0.36 ? 12 : 7;
      const maxSeed = radialNorm > 0.52 ? 54 : radialNorm > 0.36 ? 38 : 22;
      if (stepDist <= maxStep && seedDist <= maxSeed) {
        visited[idx] = 1;
        seedOf[idx] = sIdx;
        queue[tail++] = idx;
      }
    };

    while (head < tail) {
      const curr = queue[head++];
      const cx = curr % width;
      const cy = (curr - cx) / width;

      if (cx > 0) trySpread(cx - 1, cy, curr);
      if (cx < width - 1) trySpread(cx + 1, cy, curr);
      if (cy > 0) trySpread(cx, cy - 1, curr);
      if (cy < height - 1) trySpread(cx, cy + 1, curr);
    }

    // Check central subject preservation and outer border completeness
    let centerRemaining = 0;
    let centerTotal = 0;
    const x0 = Math.floor(width * 0.25);
    const x1 = Math.ceil(width * 0.75);
    const y0 = Math.floor(height * 0.25);
    const y1 = Math.ceil(height * 0.75);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        centerTotal++;
        if (!visited[y * width + x]) {
          centerRemaining++;
        }
      }
    }

    let borderVisited = 0;
    for (let x = 0; x < width; x++) {
      if (visited[x]) borderVisited++;
      if (visited[(height - 1) * width + x]) borderVisited++;
    }
    for (let y = 1; y < height - 1; y++) {
      if (visited[y * width]) borderVisited++;
      if (visited[y * width + width - 1]) borderVisited++;
    }
    const borderVisitedRatio = borderVisited / Math.max(1, totalBorderCount);

    // 3. Apply studio flood-fill knockout if central subject is intact
    if (centerRemaining >= centerTotal * 0.22 && tail > totalPixels * 0.06) {
      for (let idx = 0; idx < totalPixels; idx++) {
        if (visited[idx]) {
          data[idx * 4 + 3] = 0;
          continue;
        }

        const x = idx % width;
        const y = (idx - x) / width;
        let neighborSeedIdx = -1;
        if (x > 0 && visited[idx - 1] === 1) neighborSeedIdx = seedOf[idx - 1];
        else if (x < width - 1 && visited[idx + 1] === 1)
          neighborSeedIdx = seedOf[idx + 1];
        else if (y > 0 && visited[idx - width] === 1)
          neighborSeedIdx = seedOf[idx - width];
        else if (y < height - 1 && visited[idx + width] === 1)
          neighborSeedIdx = seedOf[idx + width];

        if (neighborSeedIdx >= 0) {
          const i = idx * 4;
          const si = neighborSeedIdx * 4;
          const distSeed = Math.hypot(
            data[i] - data[si],
            data[i + 1] - data[si + 1],
            data[i + 2] - data[si + 2]
          );
          if (distSeed < 64) {
            const featheredAlpha = Math.max(
              0,
              Math.min(255, Math.round(((distSeed - 12) / 52) * 255))
            );
            data[i + 3] = Math.min(data[i + 3], featheredAlpha);
          } else {
            data[i + 3] = Math.min(data[i + 3], 210);
          }
        }
      }
    }

    // 4. Guarantee 100% removal of rectangular corners/edges:
    // - If < 76% of the outer perimeter was studio background (e.g. plated dishes, bowls, or
    //   tabletop food photography), sculpt into a crisp circular dish cutout so no rectangular
    //   background corners or partial tabletop edges remain.
    // - Even on clean studio cutouts (>= 76%), softly mask the extreme 4 corners so no stray
    //   border shadow stub can survive.
    if (borderVisitedRatio < 0.76) {
      const dishRadius = Math.min(width, height) * 0.44;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          if (data[i + 3] === 0) continue;
          const normDist = Math.hypot(x - cxCenter, y - cyCenter) / dishRadius;
          if (normDist > 1.0) {
            data[i + 3] = 0;
          } else if (normDist > 0.88) {
            const fade = Math.max(0, Math.min(1, (1.0 - normDist) / 0.12));
            data[i + 3] = Math.round(data[i + 3] * fade);
          }
        }
      }
    } else {
      const rx = width * 0.49;
      const ry = height * 0.49;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          if (data[i + 3] === 0) continue;
          const normDist = Math.hypot((x - cxCenter) / rx, (y - cyCenter) / ry);
          if (normDist > 1.02) {
            data[i + 3] = 0;
          } else if (normDist > 0.94) {
            const fade = Math.max(0, Math.min(1, (1.02 - normDist) / 0.08));
            data[i + 3] = Math.round(data[i + 3] * fade);
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    const cutoutUrl = canvas.toDataURL("image/png");
    cutoutCache.set(cacheKey, cutoutUrl);
    return cutoutUrl;
  } catch {
    return fallbackUrl;
  }
}

/**
 * Attempts to synchronously return a cached cutout or extract one immediately
 * from an already-loaded `<img>` element in the DOM so the very first frame of
 * the flight animation is background-free with 0ms async delay.
 */
function getImmediateCutout(imageUrl: string): string | null {
  if (!imageUrl || imageUrl.endsWith(".mp4") || !isCorsSafeImageUrl(imageUrl)) {
    return imageUrl;
  }
  const key = normalizeCutoutKey(imageUrl);
  const cached = cutoutCache.get(key);
  if (cached) {
    return cached;
  }
  if (typeof document !== "undefined") {
    const imgs = document.images;
    for (let i = 0; i < imgs.length; i++) {
      const domImg = imgs[i];
      if (domImg.complete && domImg.naturalWidth > 0) {
        const domKey = normalizeCutoutKey(domImg.currentSrc || domImg.src);
        if (domKey === key) {
          return extractCutoutFromLoadedImage(domImg, key, imageUrl);
        }
      }
    }
  }
  return null;
}

function stripProductBackground(imageUrl: string): Promise<string> {
  if (!imageUrl || imageUrl.endsWith(".mp4") || !isCorsSafeImageUrl(imageUrl)) {
    return Promise.resolve(imageUrl);
  }
  const key = normalizeCutoutKey(imageUrl);
  const immediate = getImmediateCutout(imageUrl);
  if (immediate) {
    return Promise.resolve(immediate);
  }
  const existingPromise = inFlightCutouts.get(key);
  if (existingPromise) {
    return existingPromise;
  }

  const job = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    img.onload = () => {
      resolve(extractCutoutFromLoadedImage(img, key, imageUrl));
    };

    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  }).finally(() => {
    inFlightCutouts.delete(key);
  });

  inFlightCutouts.set(key, job);
  return job;
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

  // Snappy, well-proportioned parabolic arc so the flying product is clearly visible and brisk
  const arcLift = Math.max(85, Math.min(165, distance * 0.22));
  const control: CartCoordinates = {
    x: start.x + (end.x - start.x) * 0.38,
    y: Math.max(36, Math.min(start.y, end.y) - arcLift),
  };

  // Responsive Bezier steps: quick visible pop at liftoff followed by a brisk glide into the cart
  const uSteps = [0, 0.09, 0.26, 0.5, 0.74, 0.91, 1];
  const points = uSteps.map((u) => sampleQuadraticBezier(start, control, end, u));

  return {
    xKeyframes: points.map((p) => p.x),
    yKeyframes: points.map((p) => p.y),
  };
}

function FlyingProductCutout({
  item,
  cartPos,
  onComplete,
}: {
  item: FlyingItem;
  cartPos: CartCoordinates;
  onComplete: (id: string) => void;
}) {
  const [cutoutSrc, setCutoutSrc] = useState<string | null>(() =>
    getImmediateCutout(item.image)
  );

  useEffect(() => {
    if (cutoutSrc) return;
    let active = true;
    stripProductBackground(item.image).then((result) => {
      if (active) setCutoutSrc(result);
    });
    return () => {
      active = false;
    };
  }, [item.image, cutoutSrc]);

  const { xKeyframes, yKeyframes } = computeFlightTrajectory(item, cartPos);
  const displaySrc = cutoutSrc || item.image;

  return (
    <motion.div
      initial={{
        x: xKeyframes[0],
        y: yKeyframes[0],
        scale: 0.96,
        opacity: 1,
        rotate: -4,
      }}
      animate={{
        x: xKeyframes,
        y: yKeyframes,
        scale: [0.96, 1.28, 1.2, 1.08, 0.88, 0.55, 0.24],
        opacity: [1, 1, 1, 1, 1, 0.94, 0],
        rotate: [-4, -8, -2, 5, 8, 4, 0],
      }}
      exit={{ opacity: 0, scale: 0.2 }}
      transition={{
        duration: 0.72,
        times: [0, 0.14, 0.32, 0.54, 0.76, 0.91, 1],
        ease: [0.24, 0.86, 0.34, 1],
      }}
      onAnimationComplete={() => onComplete(item.id)}
      className="absolute top-0 left-0 -ml-16 -mt-16 sm:-ml-18 sm:-mt-18 w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center bg-transparent pointer-events-none select-none will-change-transform"
    >
      {displaySrc.endsWith(".mp4") ? (
        <video
          src={displaySrc}
          autoPlay
          loop
          muted
          playsInline
          webkit-playsinline="true"
          className="w-full h-full object-contain bg-transparent drop-shadow-[0_2px_4px_rgba(255,255,255,0.75)] drop-shadow-[0_18px_26px_rgba(28,25,23,0.45)]"
        />
      ) : (
        <img
          src={displaySrc}
          alt={item.name || "Product"}
          loading="eager"
          decoding="sync"
          className="w-full h-full object-contain bg-transparent drop-shadow-[0_2px_4px_rgba(255,255,255,0.75)] drop-shadow-[0_18px_26px_rgba(28,25,23,0.45)]"
          referrerPolicy="no-referrer"
        />
      )}
    </motion.div>
  );
}

export function FlyingItemsLayer() {
  const { flyingItems, removeFlyingItem } = useFlyingItems();
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
      className="fixed inset-0 pointer-events-none z-[100] overflow-hidden bg-transparent"
    >
      <AnimatePresence>
        {flyingItems.map((item) => (
          <FlyingProductCutout
            key={item.id}
            item={item}
            cartPos={cartPos}
            onComplete={handleFlightComplete}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
