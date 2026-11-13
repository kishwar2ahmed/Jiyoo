import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ShieldCheck,
  FileText,
  RefreshCcw,
  Lock,
  Scale,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Building2,
} from "lucide-react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useModalBackButton } from "../hooks/useModalBackButton";
import { FssaiLogo } from "./FssaiLogo";

export type LegalPolicyTab = "privacy" | "terms" | "refund";

interface LegalPolicyModalProps {
  isOpen: boolean;
  initialTab?: LegalPolicyTab;
  onClose: () => void;
}

export const LegalPolicyModal: React.FC<LegalPolicyModalProps> = ({
  isOpen,
  initialTab = "privacy",
  onClose,
}) => {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<LegalPolicyTab>(initialTab);
  useModalBackButton(isOpen, onClose);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const storeName = settings.storeName || "JIYOO Premium Products";
  const marketedBy = settings.aboutUs?.marketedBy || "Shams";

  const tabs: { id: LegalPolicyTab; label: string; subtitle: string; icon: React.FC<{ className?: string }> }[] = [
    {
      id: "privacy",
      label: "Privacy Policy",
      subtitle: "DPDP Act 2023 & Data Security",
      icon: ShieldCheck,
    },
    {
      id: "terms",
      label: "Terms of Service",
      subtitle: "Retail & Wholesale Governance",
      icon: FileText,
    },
    {
      id: "refund",
      label: "Refund & Cancellation",
      subtitle: "100% Freshness & Replacement",
      icon: RefreshCcw,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#1C1917]/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-policy-modal-title"
            className="relative w-full max-w-4xl bg-[#FAF9F5] border border-[#E7E3DA] rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col z-10"
          >
            {/* Header */}
            <div className="bg-white border-b border-[#E7E3DA] px-5 sm:px-8 py-5 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3.5">
                <img
                  src={settings.logoUrl || "/jiyoo.logo.jpeg"}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith("/jiyoo.logo.jpeg")) {
                      target.src = "/jiyoo.logo.jpeg";
                    }
                  }}
                  alt="JIYOO Logo"
                  className="h-10 w-10 object-contain rounded-xl border border-[#E7E3DA] bg-white p-0.5 shrink-0"
                />
                <div>
                  <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#8A5A36] font-semibold">
                    Official Legal &amp; Compliance Charter
                  </span>
                  <h2
                    id="legal-policy-modal-title"
                    className="text-xl sm:text-2xl font-serif font-bold text-[#1C1917]"
                  >
                    {storeName} — Policies &amp; Consumer Rights
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close legal policies"
                className="p-2 text-stone-500 hover:text-[#1C1917] hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Policy Switcher Bar */}
            <div className="bg-[#F4F1EA] border-b border-[#E7E3DA] px-4 sm:px-8 py-3 shrink-0 overflow-x-auto">
              <div className="flex items-center gap-2 sm:gap-3 min-w-max">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-left transition-colors duration-200 cursor-pointer border z-10 ${
                        isActive
                          ? "text-[#FAF9F5] border-[#1C1917]"
                          : "bg-white text-[#57534E] border-[#E7E3DA] hover:border-[#C5A880] hover:text-[#1C1917]"
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="legalPolicyTabPill"
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                          className="pointer-events-none absolute inset-0 rounded-xl bg-[#1C1917] shadow-sm -z-10"
                        />
                      )}
                      <Icon
                        className={`relative z-10 w-4 h-4 shrink-0 ${
                          isActive ? "text-[#C5A880]" : "text-[#8A5A36]"
                        }`}
                      />
                      <div className="relative z-10">
                        <div className="text-xs font-semibold leading-tight">
                          {tab.label}
                        </div>
                        <div
                          className={`text-[10px] leading-tight mt-0.5 ${
                            isActive ? "text-stone-300" : "text-stone-400"
                          }`}
                        >
                          {tab.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Scrollable Content */}
            <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6 text-[#1C1917]">
              {activeTab === "privacy" && (
                <motion.div
                  key="privacy-content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-5"
                >
                  <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-mono uppercase tracking-wider font-semibold text-emerald-800">
                          India DPDP Act 2023 · EU/UK GDPR · US CCPA/CPRA Privacy Notice
                        </span>
                      </div>
                      <span className="text-xs text-stone-500 font-mono">
                        Last Updated: November 2026
                      </span>
                    </div>
                    <p className="text-sm text-[#57534E] leading-relaxed">
                      <strong>{storeName}</strong> (marketed by <strong>{marketedBy}</strong>, FSSAI Reg. No.{" "}
                      <span className="font-mono font-semibold text-[#1C1917]">{settings.aboutUs?.fssaiNumber || "21226112000732"}</span>, MSME Udyam{" "}
                      <span className="font-mono font-semibold text-[#1C1917]">{settings.aboutUs?.udyamNumber || "UDYAM-KR-19-0005999"}</span>) respects your privacy. This plain-language policy explains what personal data we collect, why we collect it, who we share it with, how long we keep it, and how you can exercise your privacy rights at any time.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 space-y-2">
                      <h3 className="text-sm font-serif font-bold text-[#1C1917]">
                        1. What Personal Data We Collect
                      </h3>
                      <ul className="text-xs sm:text-sm text-[#57534E] space-y-1.5 leading-relaxed list-disc pl-4">
                        <li>
                          <strong>Account &amp; Contact Details:</strong> Full name, email address, mobile phone number, optional profile photo, and encrypted password credentials (`scrypt` / Firebase Auth) when you create an account or sign in with Google.
                        </li>
                        <li>
                          <strong>Delivery &amp; Location Details:</strong> Street address, building/flat number, landmark, 6-digit PIN code, and (only if you click &ldquo;Use Current GPS Location&rdquo; or &ldquo;Search&rdquo;) GPS coordinates for doorstep delivery.
                        </li>
                        <li>
                          <strong>Order &amp; Payment References:</strong> Items ordered, invoice totals, Razorpay order/payment IDs, or 12-digit UPI UTR numbers. <strong>We never collect or store raw debit/credit card numbers, CVVs, or UPI PINs.</strong>
                        </li>
                        <li>
                          <strong>User Content &amp; Preferences:</strong> Verified-purchase product reviews, saved wishlist items, and your cookie/notification consent choices.
                        </li>
                      </ul>
                    </div>

                    <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 space-y-2">
                      <h3 className="text-sm font-serif font-bold text-[#1C1917]">
                        2. Why We Collect It (Purposes &amp; Legal Basis)
                      </h3>
                      <ul className="text-xs sm:text-sm text-[#57534E] space-y-1.5 leading-relaxed list-disc pl-4">
                        <li>
                          <strong>Fulfilling Your Orders (Contract):</strong> Packing and delivering fresh fruits, vegetables, custom meat/seafood cuts, and wholesale crates to your address.
                        </li>
                        <li>
                          <strong>Payments, Refunds &amp; Tax Compliance (Legal Obligation):</strong> Verifying online payments, issuing GST/tax invoices, and processing instant replacements or refunds.
                        </li>
                        <li>
                          <strong>Transactional Order Updates (Contract):</strong> Sending order status receipts and dispatch tracking links via email, push notification, or WhatsApp.
                        </li>
                        <li>
                          <strong>Optional Promotional Offers (Consent Only):</strong> Sending seasonal harvest discounts only if you explicitly tick the optional marketing box at sign-up or in Notification Settings.
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 space-y-3">
                    <h3 className="text-sm font-serif font-bold text-[#1C1917]">
                      3. Who We Share Your Data With (Service Providers &amp; Third Parties)
                    </h3>
                    <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                      <strong>We never sell your personal data or share it with behavioral ad networks.</strong> We share only the minimum necessary data with the following infrastructure processors to run the store:
                    </p>
                    <ul className="text-xs text-[#57534E] space-y-1.5 leading-relaxed list-disc pl-4">
                      <li>
                        <strong>Google Cloud / Firebase (Google LLC):</strong> Hosts our primary database (Firestore), user authentication (Firebase Auth / Google Sign-In), and push notifications (FCM).
                      </li>
                      <li>
                        <strong>Razorpay Software Pvt. Ltd.:</strong> PCI-DSS Level 1 payment processor that handles online card, UPI, and net-banking checkout. Loaded only when you initiate online payment.
                      </li>
                      <li>
                        <strong>OpenStreetMap (Nominatim) &amp; Google Maps Embeds:</strong> Used only when you consent to load the interactive map or click &ldquo;Search&rdquo; / &ldquo;Use Current GPS Location&rdquo; in the Location Picker.
                      </li>
                      <li>
                        <strong>Google Gemini API (with Google Maps Grounding):</strong> When you click the optional <em>&ldquo;Verify Locality with Google Maps (AI Summary)&rdquo;</em> button, the searched locality name and coordinates (no name, phone, or email) are sent to Google Gemini to generate an AI-assisted landmark summary.
                      </li>
                      <li>
                        <strong>SMTP Email Provider &amp; Optional Supabase Backup:</strong> Delivers transactional order status emails and encrypted database backups (when configured).
                      </li>
                    </ul>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 space-y-2">
                      <h3 className="text-sm font-serif font-bold text-[#1C1917]">
                        4. How Long We Keep Your Data (Retention Schedule)
                      </h3>
                      <ul className="text-xs text-[#57534E] space-y-1.5 leading-relaxed list-disc pl-4">
                        <li>
                          <strong>Account Profile, Saved Addresses &amp; Reviews:</strong> Kept while your account is active; permanently deleted immediately when you click <strong>Delete My Account</strong>.
                        </li>
                        <li>
                          <strong>Order &amp; Tax Invoices:</strong> When you delete your account, your name, phone number, email, and street address are scrubbed immediately; anonymized invoice totals are retained for up to <strong>8 years</strong> as required under Indian GST &amp; Income Tax law.
                        </li>
                        <li>
                          <strong>Temporary Checkout Reservations &amp; Unverified WhatsApp Orders:</strong> Automatically purged within <strong>15–30 minutes</strong> of expiry.
                        </li>
                        <li>
                          <strong>Idempotency Keys &amp; Expired Admin Sessions:</strong> Automatically purged after <strong>7 days</strong> via scheduled reconciliation.
                        </li>
                      </ul>
                    </div>

                    <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 space-y-2">
                      <h3 className="text-sm font-serif font-bold text-[#1C1917]">
                        5. Your Privacy Rights &amp; How to Use Them
                      </h3>
                      <ul className="text-xs text-[#57534E] space-y-1.5 leading-relaxed list-disc pl-4">
                        <li>
                          <strong>Download Your Data (Portability):</strong> Go to <strong>Account Center &rarr; Privacy Center</strong> (or Edit Profile) and click <strong>Download My Data</strong> to get an instant JSON copy of your profile, addresses, orders, and reviews.
                        </li>
                        <li>
                          <strong>Delete Your Account (Right to Erasure):</strong> Click <strong>Delete My Account</strong> in Account Center to permanently erase your profile, addresses, reviews, and login credentials and anonymize past orders.
                        </li>
                        <li>
                          <strong>Withdraw Consent / US Opt-Out:</strong> Click <strong>Cookie &amp; Privacy Settings</strong> or <strong>Do Not Sell or Share My Info</strong> in the website footer at any time, or use the one-click <strong>Unsubscribe</strong> link in any email.
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 space-y-2">
                      <h3 className="text-sm font-serif font-bold text-[#1C1917]">
                        6. Children&rsquo;s Privacy (Under 18 / COPPA Under 13)
                      </h3>
                      <p className="text-xs text-[#57534E] leading-relaxed">
                        Our storefront is intended for adults aged <strong>18 and older</strong> (in compliance with India&rsquo;s DPDP Act, 2023) and we never knowingly collect personal data from children under 13 (US COPPA) or under 18 without verifiable parental consent. We do not run behavioral tracking or targeted ads on any user. If a parent or guardian believes a minor has created an account without consent, contact us at <span className="font-mono">shamsjiyoo@gmail.com</span> for immediate deletion.
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 space-y-2">
                      <h3 className="text-sm font-serif font-bold text-[#1C1917]">
                        7. Data Breach Response &amp; Notification Plan
                      </h3>
                      <p className="text-xs text-[#57534E] leading-relaxed">
                        In the event of a confirmed personal data breach, our designated Incident Response Lead &amp; Grievance Officer (<strong>{settings.aboutUs?.founderName || "Syed Shams"}</strong>) immediately revokes affected credentials, contains the incident, and notifies the <strong>Data Protection Board of India</strong> and affected users without undue delay (and relevant EU/UK supervisory authorities within <strong>72 hours</strong> under GDPR Art. 33).
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "terms" && (
                <motion.div
                  key="terms-content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-[#8A5A36]" />
                        <span className="text-xs font-mono uppercase tracking-wider font-semibold text-[#8A5A36]">
                          Consumer Protection (E-Commerce) Rules, 2020 &amp; FSSAI Regulated
                        </span>
                      </div>
                      <span className="text-xs text-stone-500 font-mono">
                        Jurisdiction: Bengaluru, Karnataka, India
                      </span>
                    </div>
                    <p className="text-sm text-[#57534E] leading-relaxed">
                      These Terms of Service govern your use of the <strong>{storeName}</strong> retail storefront and B2B Wholesale Trade Desk operated by <strong>{marketedBy}</strong>. By placing an order via Online Checkout, Cash on Delivery (COD), or WhatsApp Express, you confirm that you are at least 18 years old (or ordering under verified parental supervision) and agree to the terms below.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 space-y-2">
                      <h3 className="text-sm font-serif font-bold text-[#1C1917]">
                        1. Fresh Produce, Meat &amp; Seafood Weight &amp; Cut Specifications
                      </h3>
                      <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                        All fruits, vegetables, poultry, mutton, and seafood are sourced fresh every morning and cleaned with pure RO water. For custom meat and fish cuts (e.g., Curry Cut, Biryani Cut, Whole Cleaned, Steaks, Fillet), declared weights represent gross weight prior to custom dressing and trimming, or net packed weight as explicitly stated on the product card. Natural whole fruits (such as melons, papayas, or imported boxes) may have a minor natural variance of &plusmn;5%.
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 space-y-2">
                      <h3 className="text-sm font-serif font-bold text-[#1C1917]">
                        2. Retail Serviceability (Bangalore) &amp; Pan-India Wholesale Dispatch
                      </h3>
                      <ul className="text-xs sm:text-sm text-[#57534E] space-y-1.5 leading-relaxed list-disc pl-4">
                        <li>
                          <strong>Retail Express Delivery:</strong> Same-day express delivery (7:00 AM – 10:00 PM) is available across our designated serviceable Bangalore PIN codes (including 560005, 560006, 560024, 560032, 560045, 560046, 560064, 560077, 560084, 560092, 560094, 560112, 562149, and admin-enabled zones).
                        </li>
                        <li>
                          <strong>Wholesale &amp; Bulk Trade Lots:</strong> Sealed master cartons (such as South Africa Limpopo Citrus 15kg, New Zealand Crisp Pink Apples 18kg, Imported Blueberries, and Beauty Pear crates) are supplied at direct commercial lot rates with consolidated GST billing and cold-chain dispatch.
                        </li>
                      </ul>
                    </div>

                    <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 space-y-2">
                      <h3 className="text-sm font-serif font-bold text-[#1C1917]">
                        3. Pricing, Promotions &amp; Authentic Payment Channels
                      </h3>
                      <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                        All prices are listed in Indian Rupees (INR ₹) and are verified server-side at checkout. Promotional coupons are subject to minimum order values and per-user redemption limits. Customers may pay via Razorpay (UPI, Cards, NetBanking), Official Store UPI QR (verified via 12-digit UTR), Cash on Delivery (COD), or confirmed WhatsApp Trade Order. All purchases are one-time orders; we do not charge recurring subscriptions or auto-renewals.
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 space-y-2">
                      <h3 className="text-sm font-serif font-bold text-[#1C1917]">
                        4. User Reviews, Acceptable Use &amp; Copyright Takedown Process
                      </h3>
                      <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                        Verified customers may post honest product reviews and upload profile avatars (JPG, PNG, or WebP only). You must not upload unlawful, defamatory, or copyright-infringing content. Any user can flag a review using the <strong>Report</strong> button next to each review, or submit a copyright/content takedown notice with proof of ownership to <span className="font-mono">shamsjiyoo@gmail.com</span>. Validated takedown requests are acted upon within 36 hours in accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the DMCA.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "refund" && (
                <motion.div
                  key="refund-content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-mono uppercase tracking-wider font-semibold text-emerald-800">
                          100% No-Questions-Asked Doorstep Freshness Guarantee
                        </span>
                      </div>
                      <span className="text-xs text-stone-500 font-mono">
                        Instant Replacement or Full Refund
                      </span>
                    </div>
                    <p className="text-sm text-[#57534E] leading-relaxed">
                      Because we handle highly perishable farm produce, imported fruits, and fresh cold-chain meat &amp; seafood, <strong>{storeName}</strong> operates a transparent, customer-first replacement and refund policy.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-[#E7E3DA] p-4 space-y-1.5">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#8A5A36] font-semibold">
                        Window 01 · Doorstep
                      </div>
                      <h4 className="text-sm font-serif font-bold text-[#1C1917]">
                        Open-Box Inspection
                      </h4>
                      <p className="text-xs text-[#57534E] leading-relaxed">
                        Inspect your produce, fruits, or meat pack at the time of delivery. If any item does not meet your freshness expectation, return it immediately to the delivery executive for an instant deduction or replacement.
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-[#E7E3DA] p-4 space-y-1.5">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#8A5A36] font-semibold">
                        Window 02 · Retail Perishables
                      </div>
                      <h4 className="text-sm font-serif font-bold text-[#1C1917]">
                        Within 2 Hours of Delivery
                      </h4>
                      <p className="text-xs text-[#57534E] leading-relaxed">
                        For internal fruit quality issues, damaged packaging, or meat/seafood temperature concerns noticed after unpacking, share a photo on WhatsApp (+91 97393 91891) within 2 hours of delivery for a free replacement or 100% refund.
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-[#E7E3DA] p-4 space-y-1.5">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#8A5A36] font-semibold">
                        Window 03 · Wholesale Lots
                      </div>
                      <h4 className="text-sm font-serif font-bold text-[#1C1917]">
                        Within 6 Hours of Arrival
                      </h4>
                      <p className="text-xs text-[#57534E] leading-relaxed">
                        Commercial B2B buyers receiving sealed master cartons may report transit bruising or count discrepancy with unboxing proof within 6 hours of consignment receipt for credit note or pro-rata refund.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 space-y-4">
                    <div>
                      <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-1.5">
                        Order Cancellation Policy
                      </h3>
                      <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                        You may cancel any retail order directly from <strong>Account Center &rarr; My Orders</strong> at no charge while the order status is <em>Ordered (Pending)</em> or <em>Awaiting WhatsApp Confirmation</em>. Once custom meat cutting or cold-chain dispatch has commenced, cancellations require contacting Customer Support.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-100">
                      <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#8A5A36]" />
                        <span>Refund Processing Timelines</span>
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-3 text-xs text-[#57534E]">
                        <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E7E3DA]">
                          <strong className="block text-[#1C1917] mb-0.5">
                            Razorpay Online (UPI / Cards / NetBanking)
                          </strong>
                          Initiated immediately upon approval; credited back to your original payment source within <strong>3–5 business days</strong> as per RBI &amp; acquiring bank settlement cycles.
                        </div>
                        <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E7E3DA]">
                          <strong className="block text-[#1C1917] mb-0.5">
                            Direct UPI QR / Cash on Delivery (COD)
                          </strong>
                          Refunded within <strong>2–4 hours</strong> directly to your verified UPI ID / bank account via IMPS/UPI transfer upon confirmation with our support desk.
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Regulatory & Grievance Redressal Footer Card (Always visible at bottom of modal) */}
              <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#8A5A36]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                      Grievance Redressal &amp; Nodal Officer
                    </span>
                  </div>
                  <p className="text-xs text-[#57534E]">
                    <strong>{settings.aboutUs?.founderName || "Syed Shams"}</strong> ({marketedBy}) · Bengaluru, Karnataka, India
                  </p>
                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-mono text-[#1C1917]">
                    <a
                      href="tel:+919739391891"
                      className="inline-flex items-center gap-1.5 hover:text-[#8A5A36] transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#8A5A36]" />
                      <span>+91 97393 91891</span>
                    </a>
                    <a
                      href="mailto:shamsjiyoo@gmail.com?cc=jiyooshams@gmail.com"
                      className="inline-flex items-center gap-1.5 hover:text-[#8A5A36] transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#8A5A36]" />
                      <span>shamsjiyoo@gmail.com</span>
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-left sm:text-right">
                    <div className="flex items-center sm:justify-end gap-1.5">
                      <FssaiLogo className="h-4 w-auto" />
                      <span className="text-[10px] font-mono uppercase text-stone-500">
                        {settings.aboutUs?.fssaiNumber || "21226112000732"}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-stone-500 mt-0.5">
                      MSME: {settings.aboutUs?.udyamNumber || "UDYAM-KR-19-0005999"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-[#1C1917] text-[#FAF9F5] text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
