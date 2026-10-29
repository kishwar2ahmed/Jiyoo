import { useState, useRef } from "react";
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from "motion/react";
import { PremiumShieldMark } from "../features/core/components/PremiumShieldMark";
import { RealisticDeliveryScooter } from "../features/core/components/RealisticDeliveryScooter";
import {
  GooglePayIcon,
  PhonePeIcon,
  PaytmIcon,
  UpiOfficialIcon,
  VisaIcon,
  MastercardIcon,
  RuPayIcon,
} from "../features/core/components/UpiIcons";
import {
  WhatsAppIcon,
  InstagramIcon,
  PhoneCallIcon,
  EmailEnvelopeIcon,
} from "../features/core/components/SocialIcons";
import { DeveloperFooter } from "./DeveloperFooter";
import { InstallAppModal } from "../features/core/components/InstallAppModal";
import { FssaiLogo } from "../features/core/components/FssaiLogo";
import { ArchitecturalButterfly } from "../features/core/components/ArchitecturalButterfly";
import { ArrowUpRight, Clock, ShieldCheck, Heart } from "lucide-react";
import { useSettings } from "../contexts/SettingsContext";
import {
  canPromptInstall,
  requestInstall,
  isIOSDevice,
  isRunningStandalone,
} from "../utils/installPrompt";

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function Footer() {
  const { settings } = useSettings();
  const [alreadyInstalled] = useState(() => isRunningStandalone());
  const storeName = settings.storeName || "JIYOO";
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const footerRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "end end"],
  });

  const smoothScroll = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.5,
  });

  const cardY = useTransform(
    smoothScroll,
    [0.1, 0.9],
    prefersReducedMotion ? [0, 0] : [28, 0]
  );

  const imprintY = useTransform(
    smoothScroll,
    [0.35, 1],
    prefersReducedMotion ? [0, 0] : [24, 0]
  );

  const handleGetApp = async () => {
    if (canPromptInstall()) {
      const accepted = await requestInstall();
      if (!accepted) setShowInstallInstructions(true);
    } else {
      setShowInstallInstructions(true);
    }
  };

  const scrollToProducts = () => {
    const el = document.getElementById("products") || document.getElementById("storefront-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 400, behavior: "smooth" });
    }
  };

  return (
    <footer
      ref={footerRef}
      id="about-us-section"
      className="bg-[#F6F4F0] text-stone-900 pt-10 sm:pt-16 pb-12 sm:pb-20 relative overflow-hidden transition-colors"
    >
      {/* Subtle Ambient Vignette & Warm Depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(197,168,128,0.12)_0%,transparent_70%)]"
      />

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ========================================================================= */}
        {/* TOP CINEMATIC CURVED SHELL CTA (Graphy-Style Award-Winning Dark Hero Capsule) */}
        {/* ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
          className="relative overflow-hidden rounded-[2.25rem] sm:rounded-[3rem] bg-gradient-to-b from-[#12100E] via-[#0A0908] to-[#050404] text-white p-8 sm:p-14 lg:p-18 mb-10 sm:mb-14 shadow-[0_30px_70px_rgba(0,0,0,0.22)] border border-stone-800/60 text-center"
        >
          {/* Organic Ambient Radial Glow Vignette (Exact Graphy aesthetic) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-[radial-gradient(ellipse_75%_60%_at_50%_0%,rgba(255,255,255,0.22)_0%,rgba(212,175,55,0.1)_40%,transparent_75%)]"
          />

          {/* Celestial Rotating Background Accent */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-10 w-80 h-80 opacity-[0.035] select-none"
          >
            <motion.svg
              animate={prefersReducedMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
              viewBox="0 0 200 200"
              className="w-full h-full text-[#C5A880]"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="100" cy="100" r="95" strokeWidth="0.5" strokeDasharray="3 4" />
              <circle cx="100" cy="100" r="75" strokeWidth="0.75" />
              <circle cx="100" cy="100" r="50" strokeWidth="0.5" strokeDasharray="2 3" />
            </motion.svg>
          </div>

          <div className="relative z-10 max-w-3xl mx-auto">
            {/* Kicker */}
            <div className="mb-4 sm:mb-5">
              <span className="text-[11px] uppercase tracking-[0.24em] text-[#C5A880] font-medium font-sans-clean">
                Bengaluru's Fresh Catch Destination
              </span>
            </div>

            {/* Headline */}
            <h2 className="font-serif-luxury text-3xl sm:text-5xl lg:text-[52px] font-normal text-white leading-[1.12] tracking-tight text-balance">
              Ready to taste the{" "}
              <span className="italic bg-gradient-to-r from-[#F5E6C8] via-[#D4AF37] to-[#F5E6C8] bg-clip-text text-transparent">
                freshest catch?
              </span>
            </h2>

            {/* Subtitle */}
            <p className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg text-stone-300/80 font-sans-clean font-light leading-relaxed max-w-2xl mx-auto text-balance">
              Hand-selected from coastal docks at dawn, cleaned with purified water,
              and delivered in temperature-locked cold boxes across Bengaluru.
            </p>

            {/* Actions */}
            <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-5">
              <a
                href="https://wa.me/919739391891?text=Hi%20Jiyoo,%20I%20would%20like%20to%20place%20an%20order"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white text-stone-950 font-sans-clean font-medium text-sm sm:text-base hover:bg-stone-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_12px_30px_rgba(255,255,255,0.18)] cursor-pointer"
              >
                <WhatsAppIcon className="w-5 h-5" />
                <span>Order on WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={scrollToProducts}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white font-sans-clean font-medium text-sm sm:text-base border border-white/15 hover:border-white/30 backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer"
              >
                <span>Explore Today's Catch</span>
                <ArrowUpRight className="w-4 h-4 text-stone-300" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ========================================================================= */}
        {/* FLOATING ELEVATED FOOTER CARD (Award-Winning Graphy Structural Card) */}
        {/* ========================================================================= */}
        <motion.div
          style={{ y: cardY }}
          className="relative z-10 rounded-[2rem] sm:rounded-[2.5rem] bg-white text-stone-900 border border-stone-200/80 shadow-[0_24px_64px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.02)] p-7 sm:p-12 lg:p-14"
        >
          {/* Top Grid: Brand & Directory Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 pb-10 sm:pb-12 border-b border-stone-100">
            {/* Left Brand Identity & Trust Ledger (Span 5) */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                {/* Brand Wordmark & Logo */}
                <div className="flex items-center gap-3.5 mb-4">
                  <img
                    src="/jiyoo.logo.jpeg"
                    alt={`${storeName} Logo`}
                    className="h-11 w-11 rounded-xl object-contain border border-stone-200 shadow-sm"
                  />
                  <div>
                    <span className="font-serif-luxury text-2xl sm:text-3xl font-medium tracking-wider text-stone-950 block leading-none">
                      {storeName}
                    </span>
                    <span className="font-sans-clean text-[10px] uppercase tracking-[0.22em] text-[#B08D57] block mt-1 font-semibold">
                      Direct Farm &amp; Marine Harvest
                    </span>
                  </div>
                </div>

                {/* Brand Philosophy */}
                <p className="text-stone-600 font-sans-clean font-light leading-relaxed text-sm max-w-md">
                  Fresh fish, chicken, and mutton cleaned daily with pure RO water and
                  delivered cold and fresh to your home across Bengaluru.
                </p>

                {/* Minimalist Authentic Direct Communication Channels */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <a
                    href="https://wa.me/919739391891"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-xs font-sans-clean font-medium text-stone-800 transition-colors cursor-pointer group"
                    title="Chat on WhatsApp"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href="tel:+919739391891"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-xs font-sans-clean font-medium text-stone-800 transition-colors cursor-pointer group"
                    title="Direct Phone Line"
                  >
                    <PhoneCallIcon className="w-4 h-4" />
                    <span>Call Hotline</span>
                  </a>

                  <a
                    href="https://www.instagram.com/shamsjiyoo2026?exln=aG43cXdnZmgwZDRu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-xs font-sans-clean font-medium text-stone-800 transition-colors cursor-pointer group"
                    title="Instagram Customer Support"
                  >
                    <InstagramIcon className="w-4 h-4" />
                    <span>Instagram</span>
                  </a>

                  <a
                    href="mailto:shamsjiyoo@gmail.com?cc=jiyooshams@gmail.com"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-xs font-sans-clean font-medium text-stone-800 transition-colors cursor-pointer group"
                    title="Email Support (Primary: shamsjiyoo@gmail.com)"
                  >
                    <EmailEnvelopeIcon className="w-4 h-4" />
                    <span>Email</span>
                  </a>
                </div>

                {/* Government Trust Certification Ledger */}
                <div className="mt-8 pt-6 border-t border-stone-100 max-w-md">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-[#B08D57]" />
                    <span className="font-sans-clean text-[10px] uppercase tracking-[0.2em] text-[#B08D57] font-semibold">
                      Government Certified &amp; Licensed
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 py-3 px-4 rounded-xl bg-stone-50 border border-stone-200/60">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FssaiLogo className="h-4 w-auto" variant="onLight" />
                        <span className="font-sans-clean text-[11px] text-stone-500 font-light">
                          Food License
                        </span>
                      </div>
                      <span className="block font-sans-clean text-xs font-semibold text-stone-900 tabular-nums tracking-wide">
                        21226112000732
                      </span>
                    </div>
                    <div className="border-l border-stone-200/80 pl-4">
                      <span className="block font-sans-clean text-[11px] text-stone-500 font-light mb-1">
                        MSME Udyam
                      </span>
                      <span className="block font-sans-clean text-xs font-semibold text-stone-900 tabular-nums tracking-wide">
                        UDYAM-KR-19-0005999
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Install PWA Prompt Button */}
              {!alreadyInstalled && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleGetApp}
                    className="group inline-flex items-center gap-2 text-xs font-sans-clean font-medium text-[#8F6B38] hover:text-stone-950 transition-colors cursor-pointer"
                    title={`Install ${storeName} on your home screen`}
                  >
                    <span className="underline underline-offset-4 decoration-stone-300 group-hover:decoration-stone-950">
                      Install {storeName} App on Your Phone
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Right Directory Columns (Span 7, 3 Columns like Reference Image) */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-6">
              {/* Column 1: Fresh Catch */}
              <div>
                <h4 className="font-sans-clean text-xs font-semibold uppercase tracking-[0.18em] text-stone-950 mb-4 sm:mb-5">
                  Fresh Catch
                </h4>
                <ul className="space-y-2.5 text-xs sm:text-sm font-sans-clean text-stone-600">
                  <li>
                    <button
                      type="button"
                      onClick={scrollToProducts}
                      className="hover:text-stone-950 transition-colors cursor-pointer text-left"
                    >
                      Coastal Sea Fish &amp; Prawns
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={scrollToProducts}
                      className="hover:text-stone-950 transition-colors cursor-pointer text-left"
                    >
                      Freshwater River Fish
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={scrollToProducts}
                      className="hover:text-stone-950 transition-colors cursor-pointer text-left"
                    >
                      Farm-Fresh Tender Chicken
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={scrollToProducts}
                      className="hover:text-stone-950 transition-colors cursor-pointer text-left"
                    >
                      Artisanal Mutton &amp; Cuts
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => document.dispatchEvent(new CustomEvent("open-wholesale"))}
                      className="inline-flex items-center gap-1.5 text-[#8F6B38] font-medium hover:text-stone-950 transition-colors cursor-pointer text-left"
                    >
                      <span>Wholesale &amp; Bulk Supply</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </li>
                </ul>
              </div>

              {/* Column 2: Our Standards */}
              <div>
                <h4 className="font-sans-clean text-xs font-semibold uppercase tracking-[0.18em] text-stone-950 mb-4 sm:mb-5">
                  Our Standards
                </h4>
                <ul className="space-y-2.5 text-xs sm:text-sm font-sans-clean text-stone-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B08D57] shrink-0" />
                    <span>Coastal Morning Dock Catch</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B08D57] shrink-0" />
                    <span>RO-Purified Ice Washed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B08D57] shrink-0" />
                    <span>Custom Culinary Hand-Cuts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B08D57] shrink-0" />
                    <span>Temperature-Locked Packs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B08D57] shrink-0" />
                    <span>100% Guaranteed Freshness</span>
                  </li>
                </ul>
              </div>

              {/* Column 3: Trust & Company */}
              <div>
                <h4 className="font-sans-clean text-xs font-semibold uppercase tracking-[0.18em] text-stone-950 mb-4 sm:mb-5">
                  Company &amp; Trust
                </h4>
                <ul className="space-y-2.5 text-xs sm:text-sm font-sans-clean text-stone-600">
                  <li>
                    <button
                      type="button"
                      onClick={() => document.dispatchEvent(new CustomEvent("open-about"))}
                      className="hover:text-stone-950 transition-colors cursor-pointer text-left"
                    >
                      About {storeName}
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => document.dispatchEvent(new CustomEvent("open-contact"))}
                      className="hover:text-stone-950 transition-colors cursor-pointer text-left"
                    >
                      Customer Support
                    </button>
                  </li>
                  <li className="pt-2">
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-stone-900">
                        <Clock className="w-3.5 h-3.5 text-[#B08D57]" />
                        <span>Daily Delivery</span>
                      </div>
                      <p className="text-[11px] text-stone-500 leading-snug">
                        7:00 AM – 10:00 PM
                        <br />
                        Every Single Day
                      </p>
                    </div>
                  </li>
                  <li className="pt-1">
                    <p className="text-[11px] text-stone-500">
                      Marketed by{" "}
                      <span className="font-medium text-stone-900">
                        {settings.aboutUs?.marketedBy || "SHAM'S™"}
                      </span>
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Colophon Row */}
          <div className="pt-8">
            {/* Official Payment Trust Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-stone-100">
              <span className="text-[11px] font-sans-clean uppercase tracking-[0.18em] text-stone-500 font-medium">
                Verified Payment Acceptance
              </span>
              <div className="flex flex-wrap items-center gap-4 sm:gap-5 opacity-80 hover:opacity-100 transition-opacity">
                <GooglePayIcon className="h-4 w-auto" />
                <PhonePeIcon className="h-4 w-auto" />
                <PaytmIcon className="h-3 w-auto" />
                <UpiOfficialIcon className="h-3.5 w-auto" />
                <VisaIcon className="h-3 w-auto" />
                <MastercardIcon className="h-4 w-auto" />
                <RuPayIcon className="h-3 w-auto" />
              </div>
            </div>

            {/* Copyright & Legal Links */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans-clean text-stone-500 text-center sm:text-left">
              <p>
                &copy; {new Date().getFullYear()} {storeName} Fresh. All rights reserved.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
                <button
                  type="button"
                  onClick={() => document.dispatchEvent(new CustomEvent("open-about"))}
                  className="hover:text-stone-900 transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <button
                  type="button"
                  onClick={() => document.dispatchEvent(new CustomEvent("open-about"))}
                  className="hover:text-stone-900 transition-colors cursor-pointer"
                >
                  Terms of Service
                </button>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <button
                  type="button"
                  onClick={() => document.dispatchEvent(new CustomEvent("open-contact"))}
                  className="hover:text-stone-900 transition-colors cursor-pointer"
                >
                  Refund Policy
                </button>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span>FSSAI Quality Checked</span>
              </div>
            </div>

            {/* Restored Developer Presentation Attribution */}
            <DeveloperFooter />
          </div>
        </motion.div>

        {/* ========================================================================= */}
        {/* ARCHITECTURAL BRAND WATERMARK IMPRINT (Awwwards-Grade Kinetic Bottom Signature) */}
        {/* ========================================================================= */}
        <motion.div
          style={{ y: imprintY }}
          className="select-none pointer-events-none text-center overflow-visible pt-10 sm:pt-14 pb-8 sm:pb-12 -mb-4 sm:-mb-6 relative"
          aria-hidden="true"
        >
          {/* Letter-by-Letter Kinetic Architectural Typing Reveal: ONLY JIYOO */}
          <div className="flex items-center justify-center gap-1 sm:gap-3 overflow-visible relative">
            {["J", "I", "Y", "O", "O"].map((letter, i) => (
              <motion.span
                key={`${letter}-${i}`}
                initial={{
                  opacity: 0,
                  y: prefersReducedMotion ? 0 : 36,
                  filter: "blur(6px)",
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{
                  duration: 0.78,
                  delay: i * 0.12,
                  ease: EASE_OUT_EXPO,
                }}
                className={`font-serif-luxury font-bold text-[14vw] sm:text-[15vw] leading-none text-stone-300/40 uppercase inline-block select-none transform-gpu ${
                  letter === "O" && i === 4 ? "relative" : ""
                }`}
              >
                {letter}
                {letter === "O" && i === 4 && (
                  <ArchitecturalButterfly prefersReducedMotion={prefersReducedMotion} />
                )}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      <InstallAppModal
        isOpen={showInstallInstructions}
        onClose={() => setShowInstallInstructions(false)}
        isIOS={isIOSDevice()}
      />
    </footer>
  );
}
