import { useState } from "react";
import { motion } from "motion/react";
import { PremiumSocialBar } from "../features/core/components/SocialIcons";
import { DeveloperFooter } from "./DeveloperFooter";
import { InstallAppModal } from "../features/core/components/InstallAppModal";
import { Smartphone, ShieldCheck, ArrowRight } from "lucide-react";
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

  const handleGetApp = async () => {
    if (canPromptInstall()) {
      const accepted = await requestInstall();
      if (!accepted) setShowInstallInstructions(true);
    } else {
      setShowInstallInstructions(true);
    }
  };

  return (
    <footer
      id="about-us-section"
      className="bg-[#12100E] text-[#FAF9F5] pt-14 sm:pt-20 pb-12 sm:pb-16 relative overflow-hidden border-t border-[#26221E]"
    >
      {/* Ambient Architectural Lighting & Radial Gold Glow */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(197,168,128,0.07)_0%,transparent_80%)]" 
      />

      {/* Faint Architectural Brand Watermark */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[1400px] overflow-hidden select-none opacity-[0.022] flex justify-center z-0"
      >
        <span className="font-serif-luxury text-[14vw] font-black uppercase tracking-[0.22em] text-[#FAF9F5] whitespace-nowrap leading-none translate-y-1/3">
          {storeName}
        </span>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
        {/* Concierge & Direct Communication Channels */}
        <PremiumSocialBar />

        {/* Editorial Four-Column Architecture */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-14 pt-12 border-t border-[#26221E]"
        >
          {/* Brand Identity & Provenance (Span 5) */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3.5 mb-4">
                <img
                  src="/jiyoo.logo.jpeg"
                  alt={`${storeName} Logo`}
                  className="h-11 w-auto rounded-xl object-contain ring-1 ring-[#C5A880]/20 shadow-md"
                />
                <div>
                  <span className="font-serif-luxury text-2xl sm:text-3xl font-medium tracking-wider block text-[#FAF9F5] leading-tight">
                    {storeName}
                  </span>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#C5A880] block mt-0.5">
                    Purveyors of Fresh &amp; Exotic
                  </span>
                </div>
              </div>

              <p className="text-[#A8A29E] font-sans-clean font-light leading-relaxed text-sm max-w-md">
                Direct farm-sourced fruits, hydroponic vegetables, and custom-cut meats 
                prepared fresh for discerning homes, culinary chefs, and fine dining establishments.
              </p>

              {/* Official Regulatory Trust Plaque */}
              <div className="mt-5 p-3.5 rounded-xl bg-[#1A1715] border border-[#2B2622] max-w-md">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#FAF9F5] font-semibold">
                    Certified &amp; Registered Supply
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-[#8E867E]">
                  <div>
                    <span className="block text-[#78716C] text-[9px] uppercase tracking-wider">FSSAI Lic. No.</span>
                    <span className="text-[#D6D0C4] font-medium tabular-nums">21226112000732</span>
                  </div>
                  <div>
                    <span className="block text-[#78716C] text-[9px] uppercase tracking-wider">Udyam Reg. No.</span>
                    <span className="text-[#D6D0C4] font-medium tabular-nums">UDYAM-KR-19-0005999</span>
                  </div>
                </div>
              </div>
            </div>

            {!alreadyInstalled && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGetApp}
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-[#1F1B18] hover:bg-[#28231F] border border-[#332D27] hover:border-[#4D453D] text-[#FAF9F5] text-xs font-medium transition-all duration-200 cursor-pointer shadow-sm"
                  title={`Install the ${storeName} app`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#C5A880]" strokeWidth={2} />
                  <span>Install Web App</span>
                </button>
              </div>
            )}
          </div>

          {/* Department Directory (Span 3) */}
          <div className="lg:col-span-3">
            <h4 className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-[#C5A880] font-semibold mb-5 flex items-center gap-2">
              <span>Departments</span>
            </h4>
            <ul className="space-y-3">
              {[
                { id: "fruits", label: "Fresh Fruits" },
                { id: "vegetables", label: "Exotic Vegetables" },
                { id: "meat", label: "Meat & Seafood" },
                { id: "smoothies", label: "Signature Smoothies" },
                { id: "fast-foods", label: "Fast Foods" },
              ].map((dept) => (
                <li key={dept.id}>
                  <button
                    type="button"
                    onClick={() => {
                      document.dispatchEvent(new CustomEvent("open-retail"));
                      setTimeout(() => {
                        window.dispatchEvent(
                          new CustomEvent("select-category", { detail: dept.id })
                        );
                      }, 60);
                    }}
                    className="group text-sm font-sans-clean font-light text-[#A8A29E] hover:text-[#FAF9F5] transition-all duration-200 flex items-center gap-2 cursor-pointer text-left"
                  >
                    <span className="w-1.5 h-[1px] bg-[#443D36] group-hover:w-3 group-hover:bg-[#C5A880] transition-all duration-200" />
                    <span>{dept.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Wholesale & Company (Span 4) */}
          <div className="lg:col-span-4">
            <h4 className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-[#C5A880] font-semibold mb-5 flex items-center gap-2">
              <span>Wholesale &amp; Company</span>
            </h4>
            <ul className="space-y-3.5">
              <li>
                <button
                  type="button"
                  onClick={() =>
                    document.dispatchEvent(new CustomEvent("open-wholesale"))
                  }
                  className="group inline-flex items-center gap-2 text-sm font-medium text-[#C5A880] hover:text-[#FAF9F5] transition-colors cursor-pointer text-left"
                >
                  <span>Wholesale &amp; Bulk Supply</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    document.dispatchEvent(new CustomEvent("open-about"))
                  }
                  className="group text-sm font-sans-clean font-light text-[#A8A29E] hover:text-[#FAF9F5] transition-all duration-200 flex items-center gap-2 cursor-pointer text-left"
                >
                  <span className="w-1.5 h-[1px] bg-[#443D36] group-hover:w-3 group-hover:bg-[#C5A880] transition-all duration-200" />
                  <span>About {storeName}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    document.dispatchEvent(new CustomEvent("open-contact"))
                  }
                  className="group text-sm font-sans-clean font-light text-[#A8A29E] hover:text-[#FAF9F5] transition-all duration-200 flex items-center gap-2 cursor-pointer text-left"
                >
                  <span className="w-1.5 h-[1px] bg-[#443D36] group-hover:w-3 group-hover:bg-[#C5A880] transition-all duration-200" />
                  <span>Customer Help Desk</span>
                </button>
              </li>
              <li className="pt-2 border-t border-[#26221E] text-xs text-[#8E867E] font-mono tabular-nums">
                <span className="text-[#655E57] block text-[10px] uppercase tracking-wider mb-0.5">Operating Hours</span>
                7:00 AM – 10:00 PM IST (Daily)
              </li>
              <li className="text-xs text-[#8E867E]">
                Marketed by <span className="text-[#D6D0C4] font-medium">{settings.aboutUs?.marketedBy || "SHAM'S™"}</span>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Bottom Colophon Bar & Designer Attribution */}
        <div className="mt-14 sm:mt-16 pt-8 border-t border-[#26221E] relative">
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 py-3 text-center sm:text-left">
            <p className="text-xs text-[#78716C] font-sans-clean font-light">
              &copy; {new Date().getFullYear()} {storeName} Premium Products. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] text-[#78716C] font-mono">
              <span>Bengaluru, India</span>
              <span aria-hidden="true">·</span>
              <span>Direct Farm Logistics</span>
              <span aria-hidden="true">·</span>
              <span>Express Cold Chain</span>
            </div>
          </div>

          <DeveloperFooter />
        </div>
      </div>

      <InstallAppModal
        isOpen={showInstallInstructions}
        onClose={() => setShowInstallInstructions(false)}
        isIOS={isIOSDevice()}
      />
    </footer>
  );
}
