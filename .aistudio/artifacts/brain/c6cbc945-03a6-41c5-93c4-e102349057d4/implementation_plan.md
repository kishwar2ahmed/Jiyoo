# Architectural Dual-Shutter Wholesale Curtain Transition Plan

## 1. Visual & Architectural Design
- **Warm Ivory Architectural Shutters**: Two full-width, 50% dynamic viewport height (`50dvh`) shutters (`Top Shutter` and `Bottom Shutter`) finished in warm ivory (`#FAF9F5` / `#F3EFE6`) with subtle architectural grain and hairline borders.
- **Signature Butterfly-Blue Center Seam**: A crisp horizontal split line at the exact center (`top: 50%`) styled with the signature JIYOO Morpho Butterfly Blue gradient (`#00D2FF` → `#0EA5E9` → `#0284C7`) and subtle ambient luminescence that draws across the screen and splits cleanly as the curtains glide apart.
- **Zero AI-Generated Clutter**: Pure bespoke editorial typography (`Cormorant Garamond` / `Cinzel` serif display paired with `Plus Jakarta Sans`) and clean geometric lines—no generic icons, sparkles, badges, or decorative status dots.

## 2. Collision-Free Dual-Shutter Typography Engineering
- **Root Cause Resolution**: Previously, placing independent text blocks inside the `50vh` Top Shutter and `50vh` Bottom Shutter without strict seam clearance caused `JIYOO PREMIUM`, the butterfly-blue horizontal line, and `WHOLESALE STORE` to overlap or clip on short screens, laptops, and mobile viewports.
- **Top Shutter (`0` to `50dvh`)**:
  - Uses `flex flex-col items-center justify-end overflow-hidden` with a guaranteed safe bottom clearance (`pb-5 sm:pb-7 md:pb-9`) strictly above the butterfly-blue seam.
  - Displays the refined `JIYOO PREMIUM` editorial lockup using viewport-clamped sizing (`clamp(0.75rem, 1.8vw, 1rem)`) and wide luxury tracking so it never touches the center line.
- **Bottom Shutter (`50dvh` to `100dvh`)**:
  - Uses `flex flex-col items-center justify-start overflow-hidden` with a guaranteed safe top clearance (`pt-5 sm:pt-7 md:pt-9`) strictly below the butterfly-blue seam.
  - Displays `WHOLESALE STORE` in luxury serif display typography with responsive fluid sizing (`clamp(1.35rem, 3.5vw, 2.5rem)`) and balanced line height, preventing any vertical or horizontal clipping across mobile, laptop, and desktop screens.

## 3. Choreographed Motion Sequence (On Wholesale Tap Only)
- **Trigger**: Activates exclusively when the customer taps the **Wholesale** switch in the header or mobile navigation to enter the Wholesale Store.
- **Phase 1 — Seam Charge & Lockup Hold (`0ms – 420ms`)**:
  - The Wholesale page mounts underneath while the Warm Ivory Dual Shutters hold closed with `JIYOO PREMIUM` (Top Shutter) and `WHOLESALE STORE` (Bottom Shutter) clearly separated by the glowing butterfly-blue horizontal seam.
- **Phase 2 — Architectural Split Glide (`420ms – 1150ms`)**:
  - The center butterfly-blue seam gracefully fades as the Top Shutter glides smoothly upward (`translateY(-100%)`) and the Bottom Shutter glides smoothly downward (`translateY(100%)`) using a custom GPU-accelerated exponential easing curve (`cubic-bezier(0.22, 1, 0.36, 1)`), seamlessly revealing the Wholesale Store beneath.

## 4. Key Files to Create & Update
- **`src/features/wholesale/components/WholesaleCurtainTransition.tsx`** *(New)*: Dedicated, self-contained dual-shutter architectural curtain component with `50dvh` top/bottom shutters, butterfly-blue center seam, and collision-proof viewport-clamped typography.
- **`src/App.tsx`**: Wire `openWholesalePage` to trigger the `WholesaleCurtainTransition` overlay while mounting `WholesalePage` underneath for a seamless reveal, keeping `openRetailPage` instant as requested.
