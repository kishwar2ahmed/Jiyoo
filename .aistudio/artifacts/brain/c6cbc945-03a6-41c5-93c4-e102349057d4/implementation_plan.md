# JIYOO Secure Guest WhatsApp Checkout, Structured Address Validation & Resilient Catalog Architecture

This upgrade delivers a frictionless yet server-verified Guest WhatsApp Checkout flow with structured Indian delivery address validation, strict authentication enforcement for Online and COD payments, and a zero-data-loss product catalog state machine that ensures products never vanish during network interruptions, authentication transitions, or database errors.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and product choices have been confirmed from your answers and govern this implementation:

- **Confirmed Decision 1 — Checkout Authentication & Verification Policy**: Customers can select products and complete **Order via WhatsApp** as guests without signing in or completing OTP verification, provided they fill in all mandatory structured delivery fields. **Online Payments (Razorpay / UPI / Net Banking)** and standalone **Cash on Delivery (COD)** strictly require user login on both frontend and backend.
- **Confirmed Decision 2 — Detailed Structured Checkout Form**: The checkout drawer collects granular address fields (**Full Name**, **Mobile Number**, **WhatsApp Number**, **House / Flat No.**, **Building & Street**, **Area / Locality**, **City**, **State**, **6-Digit PIN Code**, **Landmark**, **Address Type [Home / Work / Other]**, and **Delivery Instructions**) with inline field validation and delivery-zone eligibility checks.
- **Confirmed Decision 3 — Resilient Product Catalog & Offline Sync Banner**: When Firestore is temporarily unreachable, rate-limited, or transitioning auth states, the storefront preserves the last verified public product catalog in local storage with a sync timestamp and displays a subtle non-intrusive sync status notice instead of ever clearing the catalog or showing an empty state.
- **Confirmed Decision 4 — Sign-In Modal & History Popstate Guard**: Closing the Sign-In modal or completing Google popup login will cleanly dismiss the overlay without firing the browser history "Leave the app?" confirmation prompt.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. Enables guest and logged-in shoppers to place verified WhatsApp orders after completing mandatory structured delivery details, generating a tamper-evident order reference (`AWAITING_WHATSAPP_CONFIRMATION`) and opening an official `https://wa.me/` prefilled message.
  2. Protects all non-WhatsApp payment methods (Razorpay, UPI, Net Banking, and standalone COD) behind mandatory Firebase Authentication and server-side price, coupon, and inventory validation.
  3. Protects the storefront catalog with an explicit 7-state synchronization lifecycle (`LOADING`, `SUCCESS_WITH_PRODUCTS`, `SUCCESS_EMPTY`, `FETCH_ERROR`, `PERMISSION_ERROR`, `CONFIGURATION_ERROR`, `OFFLINE`), bounded exponential backoff retries, and safe public cache recovery so products never disappear.
  4. Upgrades the Admin Panel Orders view with status filters (`AWAITING_WHATSAPP_CONFIRMATION`, `RECEIVED`, `CONFIRMED`, `CANCELLED`), structured address inspection, and protected administrative transitions.
- **Target Audience / Persona**: Retail customers in JIYOO's 13 serviceable Bangalore localities, Pan-India wholesale buyers, and JIYOO store administrators.
- **Key Value**: Eliminates incomplete WhatsApp inquiries, prevents price manipulation and duplicate order submissions, stops false "Leave the app?" prompts after sign-in, and guarantees 100% catalog visual continuity.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  - **Guest WhatsApp Checkout Flow**:
    1. Customer adds items to the cart (or clicks WhatsApp on a product card/modal) and selects **Order via WhatsApp**.
    2. Without requiring login, the drawer transitions to the **Delivery Details** step with a clear guest badge (*"Guest WhatsApp Checkout — No login required"*).
    3. Customer enters Full Name, Mobile Number (auto-synced to WhatsApp Number unless customized), House/Flat No., Building/Street, Area/Locality (with quick-select for the 13 active Bangalore retail areas), City, State, 6-Digit PIN Code, optional Landmark, and Address Type (`Home`, `Work`, `Other`).
    4. Backend validates product IDs, quantities, live prices, coupon discounts, and PIN code serviceability, then records the order with status `AWAITING_WHATSAPP_CONFIRMATION` and returns a unique Order ID and HMAC verification token.
    5. The app opens `https://wa.me/<JIYOO_BUSINESS_NUMBER>?text=...` with the URL-encoded summary while preserving the cart and showing a retry/re-open link so the customer can manually send the message.
  - **Authenticated Online & COD Flow**:
    1. Clicking **Checkout (Online / COD)** or **Place Order (COD / Pay Online)** checks authentication first; unauthenticated users are prompted with the Sign-In modal.
    2. Upon Google popup or email sign-in, the modal closes smoothly without triggering the "Leave the app?" confirmation dialog.
  - **Catalog Continuity & Sync Banner**:
    1. Products load immediately from the verified public cache or authoritative catalog while Firestore syncs in the background.
    2. If a permission, network, or configuration error occurs, the existing catalog remains visible and a quiet editorial notice bar indicates the last sync time with a one-click **Retry Sync** button.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Apple-inspired luxury editorial grocery & artisanal marketplace (`#FAF9F5` warm alabaster paper canvas, `#1C1917` deep stone ink, `#059669` botanical emerald accents).
  - *Color Palette & Mood*: 60% warm neutral paper (`#FAF9F5` / `#F8F6F0`), 30% crisp white structural cards with `1px solid` stone borders (`border-stone-200/80`), 10% high-intent emerald (`#059669`) for WhatsApp actions and deep charcoal (`#1C1917`) for primary checkout CTAs.
  - *Typography & Hierarchy*: Editorial serif display headings paired with clean geometric sans body prose and `tabular-nums` monospace for prices, weights, PIN codes, and order references.
  - *Component Styling & Layout*: Single-elevation cards, responsive 2-column field grids for compact address entry on mobile and desktop, unboxed metadata with middle-dot (`·`) separators, and zero decorative clutter.
- **Interactive Feedback & Motion**:
  - GPU-accelerated transitions (`transform`, `opacity`) settling within 200ms, inline field validation messages on blur/submit, idempotency locks on submit buttons to prevent double-clicks, and smooth modal dismissal.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Exclusive Guest Exception for WhatsApp Checkout**
  - *Chosen Approach*: Allow unauthenticated requests strictly on the `/api/whatsapp/prepare-order` endpoint while enforcing strict authentication (`requireAuth`) on `/api/orders/create`, `/api/razorpay/order`, and `/api/razorpay/verify`.
  - *Why*: Removes login friction for customers who prefer ordering over WhatsApp while ensuring mandatory address collection and server-side price calculation.
  - *Alternatives Considered*: Client-only WhatsApp link generation without backend validation (rejected because prices could be manipulated and no order reference would be logged for admin review).
- **Decision 2: Explicit 7-State Catalog Machine with Last-Known-Good Cache**
  - *Chosen Approach*: Track catalog state explicitly (`LOADING`, `SUCCESS_WITH_PRODUCTS`, `SUCCESS_EMPTY`, `FETCH_ERROR`, `PERMISSION_ERROR`, `CONFIGURATION_ERROR`, `OFFLINE`) and never overwrite a non-empty product list when an error or auth change occurs.
  - *Why*: Guarantees that transient network drops, expired auth tokens, or Firestore rule evaluations never turn the storefront into a blank screen.
  - *Alternatives Considered*: Clearing state on snapshot error (rejected because it causes products to vanish).
- **Decision 3: Honest WhatsApp Order Status Lifecycle**
  - *Chosen Approach*: Newly generated WhatsApp orders start in `AWAITING_WHATSAPP_CONFIRMATION` (unpaid) and never auto-transition to `RECEIVED` or `CONFIRMED` merely because the browser opened the `wa.me` link.
  - *Why*: Opening WhatsApp does not prove the user pressed send inside WhatsApp. Administrators explicitly transition orders to `RECEIVED`, `CONFIRMED`, or `CANCELLED` after verifying the message.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           JIYOO CLIENT APPLICATION                           │
│                                                                              │
│  ┌───────────────────────────────┐      ┌─────────────────────────────────┐  │
│  │   Resilient Catalog Manager   │      │    Cart & Checkout Controller   │  │
│  │  • 7-State Sync State Machine │      │  • Structured Address Form      │  │
│  │  • Public Local Cache + TTL   │      │  • Guest WhatsApp Flow          │  │
│  │  • Exponential Backoff Retry  │      │  • Auth-Gated COD & Razorpay    │  │
│  │  • Subtle Sync Status Banner  │      │  • Stable Idempotency Keys      │  │
│  └───────────────┬───────────────┘      └────────┬───────────────┬────────┘  │
└──────────────────┼───────────────────────────────┼───────────────┼───────────┘
                   │                               │               │
                   ▼                               ▼               ▼
┌──────────────────────────────────┐  ┌────────────────────┐  ┌────────────────┐
│   FIRESTORE & PUBLIC CATALOG     │  │  WHATSAPP GATEWAY  │  │ SECURE PAYMENT │
│  • Live Snapshot Listener        │  │  POST /api/whatsapp│  │ POST /api/     │
│  • Schema Validation Guard       │  │       /prepare-order│  │  orders/create │
│  • Safe Image Fallback Resolver  │  │  • Guest Allowed   │  │  razorpay/*    │
│  • Admin CRUD Persistence        │  │  • Rate Limited    │  │ • requireAuth  │
└──────────────────────────────────┘  │  • Price & PIN Check│  │ • Paise Math   │
                                      │  • HMAC Order Ref  │  │ • Webhook Sync │
                                      └─────────┬──────────┘  └────────┬───────┘
                                                │                      │
                                                ▼                      ▼
                                      ┌────────────────────────────────────────┐
                                      │     AUTHORITATIVE FIRESTORE ORDERS     │
                                      │  • Status: AWAITING_WHATSAPP_CONFIRM   │
                                      │    → RECEIVED → CONFIRMED / CANCELLED  │
                                      │  • Admin Panel Filter & Status Control │
                                      └────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Structured Shipping Address**: `name`, `phone`, `whatsappPhone`, `houseNo`, `street`, `area`, `city`, `state`, `pincode`, `landmark`, `addressType` (`Home` | `Work` | `Other`), `deliveryInstructions`, plus composite `address` string for backward compatibility with existing views and receipts.
  - **Order Lifecycle States**:
    - `AWAITING_WHATSAPP_CONFIRMATION` (also mapped cleanly alongside legacy `whatsapp_pending` in admin filters)
    - `RECEIVED`
    - `CONFIRMED`
    - `CANCELLED`
  - **Catalog Sync States**:
    - `LOADING` | `SUCCESS_WITH_PRODUCTS` | `SUCCESS_EMPTY` | `FETCH_ERROR` | `PERMISSION_ERROR` | `CONFIGURATION_ERROR` | `OFFLINE`
    - Includes `lastSyncedAt` timestamp, `isUsingCachedCatalog` boolean flag, and `retrySync()` handler.
- **Interactive Component & State Mapping**:
  - **Product Quick-WhatsApp & Cart WhatsApp CTA**: Clicking "Order via WhatsApp" from a product card, product detail modal, or cart opens the checkout address form if mandatory structured address fields are not yet filled, ensuring no WhatsApp redirect ever happens with missing customer/address details.
  - **Idempotent Submission & Retry**: Generates a deterministic client idempotency key per cart + address snapshot so repeated clicks or network retries reuse the same order reference (`orderId`) instead of creating duplicate guest orders.
  - **Admin Order Management & Bulk-Delete Protection**: Admin Orders tab filters guest WhatsApp orders vs. authenticated COD/Online orders and lets admins transition status (`AWAITING_WHATSAPP_CONFIRMATION` → `RECEIVED` → `CONFIRMED` / `CANCELLED`). Admin product management validates payloads before writes and prevents accidental catalog erasure.
