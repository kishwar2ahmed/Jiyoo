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
                  className="space-y-6"
                >
                  <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-mono uppercase tracking-wider font-semibold text-emerald-800">
                          Digital Personal Data Protection Act (DPDP), 2023 Compliant
                        </span>
                      </div>
                      <span className="text-xs text-stone-500 font-mono">
                        Effective Date: January 1, 2025 · Last Updated: October 2026
                      </span>
                    </div>
                    <p className="text-sm text-[#57534E] leading-relaxed">
                      <strong>{storeName}</strong> (marketed by <strong>{marketedBy}</strong>, FSSAI Reg. No.{" "}
                      <span className="font-mono font-semibold text-[#1C1917]">{settings.aboutUs?.fssaiNumber || "21226112000732"}</span>, MSME Udyam{" "}
                      <span className="font-mono font-semibold text-[#1C1917]">{settings.aboutUs?.udyamNumber || "UDYAM-KR-19-0005999"}</span>) respects your privacy and is committed to protecting the personal data you share with us when ordering fresh fruits, vegetables, meat, seafood, and wholesale produce.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 space-y-2">
                      <h3 className="text-sm font-serif font-bold text-[#1C1917]">
                        1. Information We Collect
                      </h3>
                      <ul className="text-xs sm:text-sm text-[#57534E] space-y-1.5 leading-relaxed list-disc pl-4">
                        <li>
                          <strong>Identity &amp; Contact Data:</strong> Full name, mobile phone number, WhatsApp number, and email address (when signing in via Google, Apple, or Email).
                        </li>
                        <li>
                          <strong>Delivery &amp; Pin-Drop Coordinates:</strong> House/building number, street, Bangalore locality or pan-India wholesale destination, landmark, 6-digit PIN code, and optional GPS map coordinates solely for accurate cold-chain dispatch.
                        </li>
                        <li>
                          <strong>Transaction Metadata:</strong> Order history, itemized invoices, Razorpay payment IDs, or 12-digit UPI UTR reference numbers. We <strong>never</strong> store your raw debit/credit card numbers or UPI PINs on our servers.
                        </li>
                      </ul>
                    </div>

                    <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 space-y-2">
                      <h3 className="text-sm font-serif font-bold text-[#1C1917]">
                        2. How We Use Your Data
                      </h3>
                      <ul className="text-xs sm:text-sm text-[#57534E] space-y-1.5 leading-relaxed list-disc pl-4">
                        <li>
                          <strong>Order Fulfillment:</strong> Routing fresh morning harvest, custom meat/seafood cuts, and wholesale crates to your doorstep within the promised delivery window.
                        </li>
                        <li>
                          <strong>Payment Verification &amp; Refunds:</strong> Reconciling Razorpay webhooks, verifying UPI QR UTR references, and processing instant refunds to your original payment source.
                        </li>
                        <li>
                          <strong>Order Status Alerts:</strong> Sending transactional updates via WhatsApp, push notifications (FCM), or email regarding order confirmation, packing, and rider dispatch.
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-[#E7E3DA] p-5 space-y-4">
                    <div>
                      <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-1.5">
                        3. Payment Security &amp; Zero Third-Party Data Selling
                      </h3>
                      <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                        All online payments are processed through PCI-DSS Level 1 certified gateways (Razorpay Software Pvt. Ltd.) and NPCI-regulated UPI rails. We do not sell, rent, or trade customer personal data or phone numbers to third-party advertisers or data brokers under any circumstances.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-100">
                      <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-1.5">
                        4. Your Rights Under the DPDP Act 2023 (Access, Correction &amp; Erasure)
                      </h3>
                      <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                        You have the right to view, update, or request complete deletion of your account profile, saved delivery addresses, and order history at any time from your <strong>Account Center &rarr; Privacy Center</strong> or by contacting our Data Protection &amp; Grievance Officer below.
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
                      These Terms of Service govern your use of the <strong>{storeName}</strong> retail storefront and B2B Wholesale Trade Desk operated by <strong>{marketedBy}</strong>. By placing an order via Online Checkout, Cash on Delivery (COD), or WhatsApp Express, you agree to the terms below.
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
                        All prices are listed in Indian Rupees (INR ₹) and are verified server-side at checkout. Promotional coupons are subject to minimum order values and per-user redemption limits. Customers may pay via Razorpay (UPI, Cards, NetBanking), Official Store UPI QR (verified via 12-digit UTR), Cash on Delivery (COD), or confirmed WhatsApp Trade Order.
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
