# Velvety Butterfly Balloon "Add" Button Architecture & Specular Physics

A bespoke, tactile luxury button designed for JIYOO's product cards. It replaces the flat "Add" action with a velvety cushioned balloon-pill button rendered in the signature architectural deep violet and celestial teal palette of the JIYOO Morpho butterfly, bordered with warm gold accents, interactive 3D specular tilt lighting on desktop, and spring squish physics on mobile.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following specifications reflect the preferences confirmed during Phase 1:

- **Confirmed Aesthetic Direction**: Velvety cushioned pill button with soft pillowy squash, tactile pneumatic depth, and warm gold accents (`#C5A880` / `#E5C99B`).
- **Confirmed Color Palette**: Architectural deep violet (`#1E1B4B` / `#312E81`) and celestial teal (`#0EA5E9` / `#0D9488`), derived from the signature butterfly motif on a midnight indigo foundation.
- **Confirmed Desktop Experience**: Specular gloss tilt reflection dynamically tracking mouse coordinates with a gentle buoyancy hover swell.
- **Confirmed Mobile Experience**: Instant spring squish compression (`scale(0.92, 0.88)`) with zero-latency tactile rebound, morphing seamlessly into the quantity stepper.
- **Strict Invariants**: Zero modifications to `Footer.tsx` or `ArchitecturalButterfly.tsx`. 100% preservation of all catalog products, prices, and media assets.

---

## 1. Overview & Core Concept

- **What It Does**: Upgrades the primary purchase trigger on every product card from a standard dark rectangular button into an irresistible, tactile velvety balloon pill.
- **Visual Feel**: Looks and feels like a soft, high-end cushioned jewel or silk balloon infused with the iridescent luminescence of a Morpho butterfly wing.
- **Brand Alignment**: Elevates JIYOO's artisanal luxury positioning by adding bespoke tactile feedback without feeling cartoonish or generic.

---

## 2. User Experience & Visual Design

### A. Velvety Cushioned Balloon Anatomy
1. **Pneumatic Pill Geometry**: Fully rounded capsule shape (`rounded-full`) with balanced padding (`h-9 sm:h-10 px-5 sm:px-6`).
2. **Deep Violet & Celestial Teal Iridescent Gradient**:
   - Base gradient: `linear-gradient(135deg, #1E1B4B 0%, #1E293B 25%, #0369A1 65%, #0D9488 100%)`.
   - Luminous sub-surface glow: Subtle radial gradient highlight anchored at the top-center simulating internal light refraction.
3. **Velvety Cushion Layering**:
   - **Upper Rim Specular**: `inset 0 1.5px 2px rgba(255, 255, 255, 0.45)` for the pillow crown catch-light.
   - **Lower Shadow Creep**: `inset 0 -2.5px 5px rgba(15, 23, 42, 0.5)` for depth and pillow volume.
   - **Ambient Butterfly Aura**: `0 8px 20px -4px rgba(14, 165, 233, 0.28), 0 2px 6px -1px rgba(0, 0, 0, 0.25)`.
   - **Warm Gold Accents**: Hairline border (`border border-[#C5A880]/40`) and warm champagne typography (`#FAF9F5` with subtle gold shimmer on hover).

### B. Desktop Hover & Specular Cursor Interaction
- **Dynamic Specular Light Reflection**:
  - The component tracks local `(x, y)` mouse coordinates relative to the button dimensions using high-performance pointer events.
  - A subtle specular radial highlight (`radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.45) 0%, transparent 65%)`) moves across the velvety surface in real time.
- **Micro 3D Tilt**:
  - The button applies a micro 3D rotation (`rotateX: (y - 0.5) * -8`, `rotateY: (x - 0.5) * 8`) with perspective (`perspective(600px)`), producing an authentic convex pill interaction.
- **Buoyant Hover Swell**:
  - On hover, the button smoothly swells by `scale: 1.04` with a gentle breathing ease (`cubic-bezier(0.16, 1, 0.3, 1)`).

### C. Mobile Tactile & Tap Experience
- **Touch Compression (Squish)**:
  - On touch start / active tap, the button squashes vertically and expands horizontally (`scaleX: 1.06`, `scaleY: 0.90`), delivering the tactile sensation of squeezing a soft balloon.
- **Spring Release & Morph Transition**:
  - Upon release, the button springs back (`damping: 18, stiffness: 350`) and morphs smoothly into the quantity stepper control `[- 1 +]`.
- **Cart Stepper Harmony**:
  - The quantity stepper matches the cushioned pill radius and gold hairline border, maintaining visual harmony with zero layout shifts.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Pure CSS & Framer Motion vs Heavy Canvas/WebGL
- **Chosen Approach**: GPU-composited CSS transforms, CSS custom properties, and Framer Motion spring physics.
- **Why**: Delivers 60fps performance across low-end mobile devices and high-refresh desktop displays with zero bundle overhead and zero layout re-flows.
- **Alternatives Considered**: Three.js WebGL bubble shader. Rejected due to battery consumption, mobile memory overhead, and hydration delays.

### Decision 2: Dedicated Modular Component (`VelvetyBalloonButton.tsx`)
- **Chosen Approach**: Encapsulate the balloon physics, specular pointer tracking, and tactile states into a modular component inside `src/features/product/components/VelvetyBalloonButton.tsx`.
- **Why**: Keeps `ProductCard.tsx` clean, prevents regression in card layout or product details modals, and enables clean reuse across quick-view and wholesale views.

---

## 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                    ProductCard Component                     │
└──────────────────────────────┬───────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   [currentQtyInCart > 0]               [currentQtyInCart === 0]
            │                                     │
            ▼                                     ▼
┌───────────────────────┐            ┌─────────────────────────┐
│ Cushioned Stepper     │            │ VelvetyBalloonButton    │
│ [- qty +]             │            │                         │
│ • Gold hairline rim   │            │ • Deep Violet & Teal    │
│ • Obsidian pill base  │            │ • Specular Pointer Map  │
│ • Tactile micro-taps  │            │ • 3D Convex Micro-Tilt  │
└───────────────────────┘            │ • Spring Squish (Touch) │
                                     └─────────────────────────┘
```

### Component & State Lifecycle:
1. **Pointer Move**: Calculates normalized `xNorm` and `yNorm` within `[0, 1]` on desktop. Updates CSS variables `--mouse-x` and `--mouse-y` for GPU specular lighting.
2. **Hover State**: Elevates z-index, springs `scale` to `1.04`, and activates the iridescent specular sheen.
3. **Tap / Click State**: Triggers `handleAddToCart`, sets momentary `isSquished = true`, triggers tactile bag drop and odometer badge update in the navigation bar.
4. **State Transition**: Instant morph into the cushioned quantity stepper with AnimatePresence.

---

## 5. Execution Steps

1. **Create `src/features/product/components/VelvetyBalloonButton.tsx`**:
   - Implement the velvety cushioned styling, butterfly gradient, specular pointer tracking, and spring squish physics.
2. **Integrate into `src/features/product/components/ProductCard.tsx`**:
   - Replace the legacy flat button with `VelvetyBalloonButton`.
   - Align the stepper pill styling to match the cushioned aesthetic.
3. **Verification & Audit**:
   - Verify desktop specular gloss tracking and smooth hover swell.
   - Verify mobile touch squish and instant cart addition.
   - Run `lint_applet` and `compile_applet` to guarantee 0 errors.
