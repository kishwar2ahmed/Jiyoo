import { useState } from "react";
import {
  PremiumSocialBar,
  SOCIAL_LINKS,
} from "../features/core/components/SocialIcons";
import { DeveloperFooter } from "./DeveloperFooter";
import { InstallAppModal } from "../features/core/components/InstallAppModal";
import { Sparkles, Smartphone } from "lucide-react";
import { useSettings } from "../contexts/SettingsContext";
import {
  canPromptInstall,
  requestInstall,
  isIOSDevice,
  isRunningStandalone,
} from "../utils/installPrompt";

export function Footer() {
  const { settings } = useSettings();
  const [alreadyInstalled] = useState(() => isRunningStandalone());
  const storeName = settings.storeName || "JIYOO";
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);

  const handleGetApp = async () => {
    if (canPromptInstall()) {
      const accepted = await requestInstall();
      // If the user dismissed the native prompt rather than accepting it,
      // fall back to manual instructions instead of doing nothing.
      if (!accepted) setShowInstallInstructions(true);
    } else {
      setShowInstallInstructions(true);
    }
  };

  return (
    <footer className="bg-[#1C1917] text-[#FAF9F5] pt-16 pb-16 relative overflow-hidden">
      {/* Background ambient gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.05)_0%,transparent_80%)] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Premium Live Social & Customer Care Bar */}
        <PremiumSocialBar />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-24 pt-10 border-t border-[#292524]">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/jiyoo.logo.jpeg"
                alt={`${settings.storeName || "JIYOO"} Logo`}
                className="h-10 w-auto rounded-xl object-contain"
              />
              <span className="font-serif-luxury text-3xl font-semibold tracking-widest block text-[#FAF9F5]">
                {settings.storeName || "JIYOO"}
              </span>
            </div>
            <p className="text-brand-gray-400 font-light max-w-sm leading-relaxed text-sm">
              The world's finest ingredients, curated for the uncompromising
              palate. Delivered with precision and elegance.
            </p>

            {/* Quick About Badge & Social Badges Row */}
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                onClick={() =>
                  document.dispatchEvent(new CustomEvent("open-about"))
                }
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold hover:bg-white/20 hover:scale-105 transition-all shadow-xs cursor-pointer"
                title={`About ${storeName}`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>About {storeName}</span>
              </button>

              {!alreadyInstalled && (
                <button
                  onClick={handleGetApp}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold hover:bg-white/20 hover:scale-105 transition-all shadow-xs cursor-pointer"
                  title={`Install the ${storeName} app`}
                >
                  <Smartphone className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>Get Our App</span>
                </button>
              )}

              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all duration-300 hover:scale-110 shadow-lg"
                  aria-label={link.label}
                  title={`${link.label}: ${link.handle}`}
                >
                  {link.icon({ className: "w-4 h-4" })}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mb-6">
              {"Explore " + storeName}
            </h4>
            <ul className="space-y-3.5">
              <li>
                <button
                  onClick={() =>
                    document.dispatchEvent(new CustomEvent("open-about"))
                  }
                  className="text-sm font-medium text-brand-gray-200 hover:text-emerald-400 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>About Us</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("select-category", { detail: "fruits" }),
                    )
                  }
                  className="text-sm font-light text-brand-gray-400 hover:text-emerald-400 transition-colors block pl-3.5 cursor-pointer text-left"
                >
                  Premium Fruits
                </button>
              </li>
              <li>
                <button
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("select-category", {
                        detail: "vegetables",
                      }),
                    )
                  }
                  className="text-sm font-light text-brand-gray-400 hover:text-emerald-400 transition-colors block pl-3.5 cursor-pointer text-left"
                >
                  Exotic Vegetables
                </button>
              </li>
              <li>
                <button
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("select-category", { detail: "meat" }),
                    )
                  }
                  className="text-sm font-light text-brand-gray-400 hover:text-emerald-400 transition-colors block pl-3.5 cursor-pointer text-left"
                >
                  Quality Meats
                </button>
              </li>
              <li>
                <button
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("select-category", {
                        detail: "smoothies",
                      }),
                    )
                  }
                  className="text-sm font-light text-brand-gray-400 hover:text-emerald-400 transition-colors block pl-3.5 cursor-pointer text-left"
                >
                  Signature Smoothies
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mb-6">
              Customer Care
            </h4>
            <ul className="space-y-3.5">
              <li>
                <button
                  onClick={() =>
                    document.dispatchEvent(new CustomEvent("open-contact"))
                  }
                  className="group text-xs font-light text-brand-gray-300 hover:text-white transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-lg bg-white/5 group-hover:bg-emerald-500/20 text-brand-gray-400 group-hover:text-emerald-400 flex items-center justify-center transition-colors">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <span className="truncate">
                    Help & Support
                  </span>
                </button>
              </li>
              {SOCIAL_LINKS.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    className="group text-xs font-light text-brand-gray-300 hover:text-white transition-colors flex items-center gap-2.5"
                  >
                    <span className="w-6 h-6 rounded-lg bg-white/5 group-hover:bg-emerald-500/20 text-brand-gray-400 group-hover:text-emerald-400 flex items-center justify-center transition-colors">
                      {link.icon({ className: "w-3.5 h-3.5" })}
                    </span>
                    <span className="truncate">
                      {link.label}:{" "}
                      <strong className="font-mono text-white/90 group-hover:text-emerald-300">
                        {link.handle}
                      </strong>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Architectural Developer Section replacing the old glowing badge & social row */}
        <div className="mt-20 pt-8 border-t border-brand-gray-800 relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-6">
            <p className="text-xs text-brand-gray-500 font-light">
              &copy; {new Date().getFullYear()} {storeName} Premium Products. All
              rights reserved.
            </p>
          </div>

          {/* Legal & Regulatory Compliance — FSSAI and Udyam (MSME) registration */}
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-8 gap-y-2 mb-12 py-4 border-y border-white/5">
            <span className="text-[11px] text-brand-gray-500 font-light tracking-wide">
              FSSAI Lic. No.{" "}
              <strong className="font-mono text-brand-gray-300 font-medium">
                21226112000732
              </strong>
            </span>
            <span className="hidden sm:inline text-brand-gray-700">|</span>
            <span className="text-[11px] text-brand-gray-500 font-light tracking-wide">
              Udyam Reg. No.{" "}
              <strong className="font-mono text-brand-gray-300 font-medium">
                UDYAM-KR-19-0005999
              </strong>
            </span>
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
