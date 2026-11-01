import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFlyingItems, FlyingItem } from "../../../contexts/CartContext";

interface CartCoordinates {
  x: number;
  y: number;
}

// In-memory cache of background-stripped transparent product cutouts
const cutoutCache = new Map<string, string>();
const inFlightCutouts = new Map<string, Promise<string>>();

// Non-blocking background idle queue so initial page load & scrolling stay at 60fps
const idlePreloadQueue: string[] = [];
const queuedSet = new Set<string>();
let isProcessingIdleQueue = false;

function scheduleIdleWork(cb: () => void) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as any).requestIdleCallback(cb, { timeout: 1200 });
  } else {
    setTimeout(cb, 64);
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
    queuedSet.delete(nextUrl);
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
  if (
    !imageUrl ||
    imageUrl.endsWith(".mp4") ||
    cutoutCache.has(imageUrl) ||
    inFlightCutouts.has(imageUrl)
  ) {
    return;
  }
  if (immediate) {
    void stripProductBackground(imageUrl);
    return;
  }
  if (!queuedSet.has(imageUrl) && idlePreloadQueue.length < 48) {
    queuedSet.add(imageUrl);
    idlePreloadQueue.push(imageUrl);
    drainIdlePreloadQueue();
  }
}

/**
 * Removes solid white / cream / studio backgrounds from a product image
 * using edge-connected flood-fill matting while strictly protecting interior
 * product details and ensuring the central product remains 100% opaque and vivid.
 */
function stripProductBackground(imageUrl: string): Promise<string> {
  if (!imageUrl || imageUrl.endsWith(".mp4")) {
    return Promise.resolve(imageUrl);
  }
  const cached = cutoutCache.get(imageUrl);
  if (cached) {
    return Promise.resolve(cached);
  }
  const existingPromise = inFlightCutouts.get(imageUrl);
  if (existingPromise) {
    return existingPromise;
  }

  const job = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    img.onload = () => {
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
          resolve(imageUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const totalPixels = width * height;

        // 1. Inspect outer perimeter to check if already transparent or has a studio background
        let transparentBorderCount = 0;
        let totalBorderCount = 0;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let studioBorderCount = 0;

        const sampleBorderPixel = (x: number, y: number) => {
          const i = (y * width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          totalBorderCount++;
          if (a < 25) {
            transparentBorderCount++;
          } else {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            if (lum > 205 && maxC - minC < 34) {
              sumR += r;
              sumG += g;
              sumB += b;
              studioBorderCount++;
            }
          }
        };

        for (let x = 0; x < width; x++) {
          sampleBorderPixel(x, 0);
          sampleBorderPixel(x, height - 1);
        }
        for (let y = 1; y < height - 1; y++) {
          sampleBorderPixel(0, y);
          sampleBorderPixel(width - 1, y);
        }

        // If already a transparent PNG cutout, keep it untouched
        if (transparentBorderCount > totalBorderCount * 0.6) {
          cutoutCache.set(imageUrl, imageUrl);
          resolve(imageUrl);
          return;
        }

        const bgR = studioBorderCount > 0 ? sumR / studioBorderCount : 252;
        const bgG = studioBorderCount > 0 ? sumG / studioBorderCount : 251;
        const bgB = studioBorderCount > 0 ? sumB / studioBorderCount : 248;

        const isBackgroundLike = (pixelIdx: number): boolean => {
          const i = pixelIdx * 4;
          const a = data[i + 3];
          if (a < 20) return true;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const chroma = maxC - minC;

          const dr = r - bgR;
          const dg = g - bgG;
          const db = b - bgB;
          const distBg = Math.sqrt(dr * dr + dg * dg + db * db);
          const dw = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);

          if ((distBg < 32 || dw < 30) && chroma < 24) return true;
          if (r > 240 && g > 238 && b > 233 && chroma < 20) return true;
          return false;
        };

        // 2. Flood-fill from all 4 outer edges inward
        const visited = new Uint8Array(totalPixels);
        const queue = new Int32Array(totalPixels);
        let head = 0;
        let tail = 0;

        const enqueueIfBg = (x: number, y: number) => {
          const idx = y * width + x;
          if (visited[idx]) return;
          if (isBackgroundLike(idx)) {
            visited[idx] = 1;
            queue[tail++] = idx;
          }
        };

        for (let x = 0; x < width; x++) {
          enqueueIfBg(x, 0);
          enqueueIfBg(x, height - 1);
        }
        for (let y = 1; y < height - 1; y++) {
          enqueueIfBg(0, y);
          enqueueIfBg(width - 1, y);
        }

        while (head < tail) {
          const curr = queue[head++];
          const cx = curr % width;
          const cy = (curr - cx) / width;

          if (cx > 0) enqueueIfBg(cx - 1, cy);
          if (cx < width - 1) enqueueIfBg(cx + 1, cy);
          if (cy > 0) enqueueIfBg(cx, cy - 1);
          if (cy < height - 1) enqueueIfBg(cx, cy + 1);
        }

        // Verify that the central subject of the product was NOT erased
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

        if (centerRemaining >= centerTotal * 0.22 && tail > totalPixels * 0.08) {
          // 3. Knock out visited studio background pixels & softly feather 1px boundary
          for (let idx = 0; idx < totalPixels; idx++) {
            if (visited[idx]) {
              data[idx * 4 + 3] = 0;
              continue;
            }

            const x = idx % width;
            const y = (idx - x) / width;
            const touchesBg =
              (x > 0 && visited[idx - 1] === 1) ||
              (x < width - 1 && visited[idx + 1] === 1) ||
              (y > 0 && visited[idx - width] === 1) ||
              (y < height - 1 && visited[idx + width] === 1);

            if (touchesBg) {
              const i = idx * 4;
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const maxC = Math.max(r, g, b);
              const minC = Math.min(r, g, b);
              const distBg = Math.sqrt(
                (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2
              );
              if (maxC - minC < 30 && distBg < 54) {
                const featheredAlpha = Math.max(
                  0,
                  Math.min(255, Math.round(((distBg - 14) / 40) * 255))
                );
                data[i + 3] = Math.min(data[i + 3], featheredAlpha);
              }
            }
          }
        } else {
          // Fallback for full-bleed photos without a white background:
          // Sculpt into a soft organic floating silhouette by feathering the rectangular corners
          const cx = width / 2;
          const cy = height / 2;
          const rx = width * 0.46;
          const ry = height * 0.46;
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const normDist = Math.hypot((x - cx) / rx, (y - cy) / ry);
              if (normDist > 1.0) {
                const i = (y * width + x) * 4;
                data[i + 3] = 0;
              } else if (normDist > 0.86) {
                const i = (y * width + x) * 4;
                const fade = Math.max(0, Math.min(1, (1.0 - normDist) / 0.14));
                data[i + 3] = Math.round(data[i + 3] * fade);
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);

        if (typeof canvas.toBlob === "function") {
          canvas.toBlob((blob) => {
            if (blob) {
              const objUrl = URL.createObjectURL(blob);
              cutoutCache.set(imageUrl, objUrl);
              resolve(objUrl);
            } else {
              const dataUrl = canvas.toDataURL("image/png");
              cutoutCache.set(imageUrl, dataUrl);
              resolve(dataUrl);
            }
          }, "image/png");
        } else {
          const cutoutUrl = canvas.toDataURL("image/png");
          cutoutCache.set(imageUrl, cutoutUrl);
          resolve(cutoutUrl);
        }
      } catch {
        resolve(imageUrl);
      }
    };

    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  }).finally(() => {
    inFlightCutouts.delete(imageUrl);
  });

  inFlightCutouts.set(imageUrl, job);
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
    cutoutCache.get(item.image) || null
  );

  useEffect(() => {
    let active = true;
    stripProductBackground(item.image).then((result) => {
      if (active) setCutoutSrc(result);
    });
    return () => {
      active = false;
    };
  }, [item.image]);

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
