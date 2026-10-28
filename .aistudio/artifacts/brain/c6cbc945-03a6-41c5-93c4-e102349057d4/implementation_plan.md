# Luxury Scroll Motion Architecture & Production Integrity Plan

Comprehensive engineering blueprint to introduce Apple-grade editorial scroll motions, subtle top micro-progress timeline tracking, staggered 3D elevation card reveals, and finalize authentic payment and order guarantees across the Jiyoo digital storefront.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The motion direction and choreography have been tailored directly to your confirmed selections:

- **Confirmed Motion Style**: Apple-style luxury editorial aesthetic featuring subtle section reveals, smooth easing curves (`cubic-bezier(0.16, 1, 0.3, 1)`), and organic scroll-linked parallax depths.
- **Confirmed Timeline Indicator**: Subtle top micro-progress bar (`h-[2px] bg-gradient-to-r from-emerald-500/80 to-teal-400`) coupled with quiet section transition indicators, maintaining viewport clarity.
- **Confirmed Product Card Reaction**: Staggered viewport entrance reveals with gentle elevation lifts and subtle GPU-accelerated 3D perspective tilts on scroll.
- **Confirmed Checkout & Reliability Rules**:
  - Direct user-gesture links for WhatsApp ordering to permanently eliminate browser iframe pop-up "Leave the app" warnings.
  - Strict mandatory field validation (Full Name, Phone Number, Delivery Street Address, 6-digit Indian PIN) before order creation.
  - Cryptographically unique Order IDs (`JY-YYYYMMDD-XXXXXXXXXXXX`) generated per order and persisted in Firestore.
  - Server-authoritative admin coupons only (validated directly against the Firestore `coupons` collection, rejecting client tampering).

---

### 1. Overview & Core Concept

- **What It Does**: Transforms Jiyoo into a high-touch, tactile luxury e-commerce experience. As the customer navigates the storefront, sections glide into place with organic physical weight; the top navigation responds gracefully; product collections reveal with staggered spatial depth; and the entire ordering pipeline operates on strict, verified zero-fake standards.
- **Target Audience & Tone**: Discerning buyers seeking premium artisanal and organic poultry and seafood, who value modern architectural aesthetics, responsiveness, and trustworthy checkout.
- **Key Value**: Replaces abrupt browser scrolling and fragmented UI states with a cohesive, cinematic motion language without sacrificing 60fps compositor performance or accessibility.

---

### 2. User Experience & Visual Design

#### A. Motion Architecture & Section Choreography
- **Hero & Architectural Brand Imprint**:
  - The hero typography and architectural brand imprint employ gentle differential parallax (foreground text moves at $1.0\times$, backdrop brand elements shift at $0.85\times$).
  - The architectural butterfly motion smoothly anchors into the emblem with natural flight dynamics.
- **Editorial Section Reveals**:
  - Each major content block (Featured Cuts, Artisanal Standards, Bangalore Delivery Hubs, Testimonials) activates on scroll using `framer-motion`'s `useInView` and GPU-only properties (`transform: translateY(...)`, `opacity`).
  - Strict latency budget: entrance animations complete within 400ms using easing `[0.16, 1, 0.3, 1]`.
- **Staggered Product Cards with 3D Tilt**:
  - As catalog items enter the viewport, cards stagger by 60ms intervals.
  - Cards feature a micro-tilt effect ($\pm 3^\circ$ perspective transform calculated from pointer or scroll velocity) that settles into a pristine elevation hover state.
- **Top Micro-Progress Timeline**:
  - A discreet 2px ambient scroll tracker pinned to the top of the viewport provides real-time position awareness without visual clutter.

#### B. Accessibility & Motion Discipline
- Full `prefers-reduced-motion: reduce` support automatically disables parallax and transforms, preserving smooth opacity fades for accessibility compliance.
- No layout thrashing: only composited properties (`transform`, `opacity`, `filter`) are animated.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Native CSS / Framer Motion vs Heavy External Libraries (Locomotive/GSAP)**
  - *Chosen Approach*: Leverage existing high-performance `framer-motion` spring physics combined with native CSS hardware-accelerated transforms.
  - *Why*: Eliminates bundle bloat, avoids hijack scrolling bugs on mobile touch devices, and guarantees smooth 60fps scrolling on both desktop and mobile.
- **Decision 2: Elimination of "Leave the App" Warning on WhatsApp Checkout**
  - *Chosen Approach*: Transition the user immediately to the dedicated confirmation screen (`whatsapp_confirm`) where the customer clicks the authentic green action button `<a href={url} target="_blank" rel="noopener noreferrer">`.
  - *Why*: Browsers and sandboxed iframes trigger security alerts when `window.open` is invoked inside an asynchronous callback (`await fetch()`). A direct link click is recognized as an explicit user gesture and never prompts security warnings.
- **Decision 3: Server-Authoritative Database Inventory & Real Coupons**
  - *Chosen Approach*: The backend syncs the authoritative product catalog to Firestore on boot and computes all prices, stock reservations, and coupon validation directly against Firestore collections.
  - *Why*: Prevents client-side price tampering, eliminates empty-database checkout errors, and guarantees that only admin-published coupons are accepted.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          STOREFRONT FRONTEND                           │
│                                                                        │
│  ┌───────────────────────┐  ┌──────────────────────────────────────┐  │
│  │ Ambient Scroll Engine │  │     Editorial Section Observers      │  │
│  │ (ScrollProgress &     │  │ (Framer Motion useInView + Staggered  │  │
│  │  Top Micro-Bar)       │  │  3D Perspective Lift Cards)          │  │
│  └───────────┬───────────┘  └──────────────────┬───────────────────┘  │
│              │                                 │                      │
│              ▼                                 ▼                      │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                   Client Checkout & Cart Modal                  │  │
│  │  - Mandatory Form Gating (Name, Phone, Address, PIN)            │  │
│  │  - Direct User-Gesture WhatsApp Action (Zero Pop-Up Warnings)   │  │
│  │  - Real Admin Coupon Code Verification Input                    │  │
│  └─────────────────────────────────┬───────────────────────────────┘  │
└────────────────────────────────────┼──────────────────────────────────┘
                                     │ Secure REST Calls
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS BACKEND RUNTIME                         │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                   Payment & Order Orchestrator                  │  │
│  │  - Auth Verification & CSRF Origin Protection                   │  │
│  │  - Authoritative Price & Inventory Reservation (15-min TTL)     │  │
│  │  - Constant-Time HMAC SHA256 Signature Verification             │  │
│  │  - Unique Cryptographic Order ID (JY-YYYYMMDD-XXXXXXXXXXXX)     │  │
│  └──────────────────┬──────────────────────────────┬───────────────┘  │
│                     │                              │                  │
│                     ▼                              ▼                  │
│  ┌────────────────────────────────────┐ ┌──────────────────────────┐  │
│  │   Gemini 3.8 Flash Maps Grounding  │ │   Automatic Catalog Sync │  │
│  │  (Real delivery areas & review     │ │  (Seeding products into  │  │
│  │   snippets via Google Maps tool)   │ │   Firestore on startup)  │  │
│  └────────────────────────────────────┘ └──────────┬───────────────┘  │
└────────────────────────────────────────────────────┼──────────────────┘
                                                     │
                                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       FIRESTORE CLOUD DATABASE                         │
│    Collections: products | orders | coupons | users | deliveryPincodes │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 5. Step-by-Step Execution Plan

1. **Scroll Motion Component Creation (`src/features/core/components/ScrollProgress.tsx`)**:
   - Implement the discreet top progress micro-bar with smooth easing and gradient styling.
   - Implement reusable viewport reveal wrappers (`ScrollReveal`, `ScrollStaggerGroup`, `ScrollCardTilt`) with `prefers-reduced-motion` fallbacks.
2. **Apply Editorial Scroll Choreography across Pages**:
   - In `App.tsx` and main storefront sections (`ProductGrid.tsx`, `Hero.tsx`, `Categories.tsx`, `About.tsx`):
     - Wrap section headers and text blocks in Apple-style soft upward reveals with subtle scale/opacity transitions.
     - Apply staggered entrance and subtle 3D hover/scroll tilt to product cards in the catalog.
3. **CartModal Checkout & WhatsApp Fixes**:
   - In `src/features/cart/components/CartModal.tsx`:
     - Remove `window.open(url, "_blank")` to eradicate the browser pop-up prompt.
     - Rename all references of "Privilege Code" to "Coupon Code".
     - Require full delivery details for WhatsApp orders; if triggered from cart, guide user into checkout form with clear validation.
4. **Google Maps Grounding in Delivery Modal**:
   - Connect `LocationPickerModal.tsx` to `/api/maps/grounding` with Gemini 3.8 Flash to display verified locality context and clickable Google Maps links.
5. **System Verification & Regression Suites**:
   - Execute `node scripts/parse-check.mjs`, `node scripts/validate-jiyoo.mjs`, `node scripts/security-regression.mjs`, and `compile_applet`.
