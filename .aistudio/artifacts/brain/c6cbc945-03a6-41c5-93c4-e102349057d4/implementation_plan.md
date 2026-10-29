# Implementation Plan: Featured Banner Integration & Luminous Highlighting

## Overview
Integrate the high-resolution "Special Diwali Sale" banner into the JIYOO hero banner slideshow. As confirmed via the planning clarifications:
1. **Frequency:** The featured banner will alternate/repeat every 2 to 3 slides across the carousel sequence.
2. **Visual Highlighting:** Rendered with a luminous amber border, subtle ambient glow, and a luxury festive accent badge.
3. **Typography & Framing:** Minimalist title only with clean brand focus so the banner's artwork and embedded typographic crest remain pristine and unobstructed.
4. **Admin Control:** Fully manageable within the Admin Panel (toggleable, editable, customizable order and presets).

---

## Proposed Changes

### 1. Asset Placement & Optimization
- **File:** `public/banners/diwali_special_sale.png`
- Deploy the 2.2MB source asset (`file_000000002410821198a81a83a16d503f-1.png`) into `public/banners/diwali_special_sale.png`.
- Ensure clean loading, caching, and fallback handling.

### 2. Type Definition Updates
- **File:** `src/types/index.ts`
- Extend `BannerSlide` with:
  ```typescript
  isFeatured?: boolean;
  highlightTone?: 'amber' | 'emerald' | 'none';
  ```

### 3. Banner Presets & Sequence Configuration
- **File:** `src/constants/banners.ts`
- Add `preset-diwali-special` to `PRESET_BANNER_IMAGES` with preset title *"Festive Special"* and subtitle *"Curated Festive Harvest & Daily Essentials"*.
- In `DEFAULT_HERO_BANNERS`, interleave the featured festive banner so it repeats cyclically every 2 to 3 category slides:
  - Slide 1: Indian Farm-Fresh Fruits
  - Slide 2: **Diwali Special Sale (Featured Highlight)**
  - Slide 3: Imported & Exotic Fruits
  - Slide 4: Indian & Thai Vegetables
  - Slide 5: **Diwali Special Sale (Featured Highlight)**
  - Slide 6: Artisanal Fresh Meat Cuts
  - Slide 7: Fish & Coastal Seafood
  - Slide 8: **Diwali Special Sale (Featured Highlight)**
  - Slide 9: Everyday Fresh Prep & Cold-Pressed Smoothies
  - Slide 10: Pantry & Daily Essentials
- Provide a utility to dynamically ensure the recurring sequence is maintained if the admin edits banners or toggles repeat mode.

### 4. Hero Slideshow Highlighting & Polish
- **File:** `src/features/storefront/components/HeroSlideshow.tsx`
- **Luminous Amber Border & Glow:**
  - When `currentSlide.isFeatured` is active, apply dynamic frame styling:
    - Glowing amber border: `ring-2 ring-amber-400/90 shadow-[0_0_35px_-5px_rgba(245,158,11,0.45)]`
    - Gentle ambient breathing pulse on the border/accent
  - Accent badge: Amber glassmorphic badge with golden sparkle/flame icon and `"DIWALI SPECIAL"` or `"FESTIVE SPOTLIGHT"`.
  - Minimalist layout: Keep caption text minimal and clean at bottom-left/bottom-right so it never masks the Diwali artwork.
  - Golden progress bar indicator and distinctive active amber pip in the carousel dots track.
  - Maintain mobile responsiveness: keep compact aspect ratio so products below stay immediately visible above the fold.

### 5. Admin Panel Integration
- **File:** `src/features/admin/components/BannersTab.tsx`
- Add preset option for the Diwali Special Sale banner in the preset selector with 1-click apply.
- Add a toggle switch in the banner editor: *"Mark as Featured Highlight (Luminous Amber Glow)"*.
- Add an option to enable *"Repeat Featured Banner Every 2-3 Slides"* with live carousel preview.

---

## Verification Plan
1. **Compilation & Linting:**
   - Run `lint_applet` and `compile_applet` to verify zero TypeScript errors or broken imports.
2. **Visual & Behavioral Verification:**
   - Verify slide deck transitions every 4.5s with touch swipe and hover pause.
   - Verify the featured banner appears every 2-3 slides with the luminous amber border and glowing accent badge.
   - Verify mobile viewport: ensure products below the hero remain comfortably visible without excessive vertical scrolling.
   - Check Admin Banners tab: verify banner can be reordered, edited, or toggled on/off.
