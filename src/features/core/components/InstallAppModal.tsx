import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Share,
  PlusSquare,
  MoreVertical,
  Monitor,
  Smartphone,
  Download,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useModalBackButton } from "../hooks/useModalBackButton";
import {
  canPromptInstall,
  requestInstall,
  isIOSDevice,
  isAndroidDevice,
  isRunningStandalone,
} from "../../../utils/installPrompt";

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS?: boolean;
}

type PlatformTab = "android" | "ios" | "desktop";

function detectDefaultTab(isIOSProp?: boolean): PlatformTab {
  if (isIOSProp || isIOSDevice()) return "ios";
  if (isAndroidDevice()) return "android";
  if (typeof window !== "undefined" && window.innerWidth < 768) return "android";
  return "desktop";
}

export function InstallAppModal({ isOpen, onClose, isIOS }: InstallAppModalProps) {
  useModalBackButton(isOpen, onClose);

  const [activeTab, setActiveTab] = useState<PlatformTab>(() => detectDefaultTab(isIOS));
  const [nativeReady, setNativeReady] = useState<boolean>(() => canPromptInstall());
  const [installedNow, setInstalledNow] = useState<boolean>(() => isRunningStandalone());
  const [isEmbeddedFrame] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab(detectDefaultTab(isIOS));
      setNativeReady(canPromptInstall());
      setInstalledNow(isRunningStandalone());
    }
  }, [isOpen, isIOS]);

  const handleDirectNativeInstall = async () => {
    const accepted = await requestInstall();
    setNativeReady(canPromptInstall());
    if (accepted) {
      setInstalledNow(true);
      setTimeout(() => onClose(), 1100);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="jiyoo-install-modal-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#141210]/65 backdrop-blur-xs"
          />

          {/* Sheet / Dialog Surface */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 28 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full sm:max-w-[460px] bg-[#FAF9F5] text-[#1C1917] rounded-t-[26px] sm:rounded-[24px] border border-[#E2DDD2] shadow-[0_28px_70px_-12px_rgba(20,18,16,0.38)] overflow-hidden max-h-[92dvh] flex flex-col"
          >
            {/* Top Architectural Hairline Accent */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#C5A880] to-transparent opacity-80 shrink-0" />

            {/* Header */}
            <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-[#EAE5DA] flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#FBF8EF] border border-[#E2DDD2] shadow-2xs flex items-center justify-center p-1.5 shrink-0">
                  <img
                    src="/logo.jpg"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.endsWith("/jiyoo.logo.jpeg")) {
                        target.src = "/jiyoo.logo.jpeg";
                      }
                    }}
                    alt="JIYOO"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <div className="min-w-0">
                  <span className="block font-sans text-[10px] uppercase tracking-[0.2em] text-[#8F6B38] font-semibold">
                    JIYOO Application
                  </span>
                  <h2
                    id="jiyoo-install-modal-title"
                    className="font-serif-luxury text-xl sm:text-2xl font-semibold text-[#1C1917] leading-tight mt-0.5"
                  >
                    Install JIYOO on Your Device
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close install dialog"
                className="p-2 -mr-1 -mt-1 text-[#78716C] hover:text-[#1C1917] hover:bg-[#EFECE4] rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 sm:px-7 py-5 overflow-y-auto space-y-5">
              {installedNow ? (
                <div className="p-4 rounded-xl bg-[#F2EFE8] border border-[#DDD6C7] flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#2E5A36] shrink-0" />
                  <div className="text-xs sm:text-sm text-[#1C1917]">
                    <p className="font-semibold">JIYOO is installed on your device.</p>
                    <p className="text-[#57534E] mt-0.5">
                      You can launch JIYOO directly from your Home Screen, Dock, or Desktop.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Direct 1-Click Native Prompt Button when Chromium has deferredPrompt ready */}
                  {nativeReady && (
                    <div className="p-4 rounded-xl bg-[#1C1917] text-[#FAF9F5] border border-[#C5A880]/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="block text-[10px] uppercase tracking-[0.18em] text-[#C5A880] font-semibold">
                          Direct Installation Ready
                        </span>
                        <p className="text-xs sm:text-sm text-[#E7E3DA] mt-0.5">
                          Install the standalone JIYOO app in one click.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDirectNativeInstall}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#FAF9F5] hover:bg-white text-[#1C1917] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" strokeWidth={2.2} />
                        <span>Install Now</span>
                      </button>
                    </div>
                  )}

                  {/* Platform Switcher: Android | iPhone & iPad | Desktop (Mac & PC) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#78716C]">
                        Select Your Device
                      </span>
                      <span className="text-[11px] text-[#8F6B38] font-medium">
                        No App Store download required
                      </span>
                    </div>

                    <div
                      role="tablist"
                      aria-label="Device platform"
                      className="grid grid-cols-3 p-1 rounded-xl bg-[#EFECE4] border border-[#E2DDD2]"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "android"}
                        onClick={() => setActiveTab("android")}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activeTab === "android"
                            ? "bg-[#1C1917] text-[#FAF9F5] shadow-2xs"
                            : "text-[#57534E] hover:text-[#1C1917]"
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                        <span>Android</span>
                      </button>

                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "ios"}
                        onClick={() => setActiveTab("ios")}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activeTab === "ios"
                            ? "bg-[#1C1917] text-[#FAF9F5] shadow-2xs"
                            : "text-[#57534E] hover:text-[#1C1917]"
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                        <span>iPhone / iPad</span>
                      </button>

                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "desktop"}
                        onClick={() => setActiveTab("desktop")}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activeTab === "desktop"
                            ? "bg-[#1C1917] text-[#FAF9F5] shadow-2xs"
                            : "text-[#57534E] hover:text-[#1C1917]"
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                        <span>Desktop</span>
                      </button>
                    </div>
                  </div>

                  {/* Step-by-Step Instructions Ledger */}
                  {activeTab === "android" && (
                    <div className="space-y-2.5" role="tabpanel">
                      <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white border border-[#E7E3DA]">
                        <span className="font-mono text-xs font-bold text-[#8F6B38] pt-0.5 shrink-0">
                          01
                        </span>
                        <div className="text-xs sm:text-[13px] text-[#292524] leading-relaxed">
                          Tap the browser menu icon{" "}
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 rounded bg-[#F4F1EA] border border-[#DCD6CA] text-[#1C1917] align-middle">
                            <MoreVertical className="w-3.5 h-3.5" strokeWidth={2} />
                          </span>{" "}
                          in the top-right corner of Chrome.
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white border border-[#E7E3DA]">
                        <span className="font-mono text-xs font-bold text-[#8F6B38] pt-0.5 shrink-0">
                          02
                        </span>
                        <div className="text-xs sm:text-[13px] text-[#292524] leading-relaxed">
                          Select{" "}
                          <strong className="font-semibold text-[#1C1917]">
                            Install app
                          </strong>{" "}
                          or{" "}
                          <strong className="font-semibold text-[#1C1917]">
                            Add to Home screen
                          </strong>
                          .
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white border border-[#E7E3DA]">
                        <span className="font-mono text-xs font-bold text-[#8F6B38] pt-0.5 shrink-0">
                          03
                        </span>
                        <div className="text-xs sm:text-[13px] text-[#292524] leading-relaxed">
                          Tap{" "}
                          <strong className="font-semibold text-[#1C1917]">Install</strong>{" "}
                          to add the JIYOO app to your phone’s home screen.
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "ios" && (
                    <div className="space-y-2.5" role="tabpanel">
                      <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white border border-[#E7E3DA]">
                        <span className="font-mono text-xs font-bold text-[#8F6B38] pt-0.5 shrink-0">
                          01
                        </span>
                        <div className="text-xs sm:text-[13px] text-[#292524] leading-relaxed">
                          In Safari, tap the{" "}
                          <strong className="font-semibold text-[#1C1917]">Share</strong>{" "}
                          icon{" "}
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 rounded bg-[#F4F1EA] border border-[#DCD6CA] text-[#1C1917] align-middle">
                            <Share className="w-3.5 h-3.5" strokeWidth={2} />
                          </span>{" "}
                          on the bottom or top toolbar.
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white border border-[#E7E3DA]">
                        <span className="font-mono text-xs font-bold text-[#8F6B38] pt-0.5 shrink-0">
                          02
                        </span>
                        <div className="text-xs sm:text-[13px] text-[#292524] leading-relaxed">
                          Scroll down the share sheet and tap{" "}
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-[#F4F1EA] border border-[#DCD6CA] font-semibold text-[#1C1917] align-middle">
                            <span>Add to Home Screen</span>
                            <PlusSquare className="w-3.5 h-3.5" strokeWidth={2} />
                          </span>
                          .
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white border border-[#E7E3DA]">
                        <span className="font-mono text-xs font-bold text-[#8F6B38] pt-0.5 shrink-0">
                          03
                        </span>
                        <div className="text-xs sm:text-[13px] text-[#292524] leading-relaxed">
                          Tap{" "}
                          <strong className="font-semibold text-[#1C1917]">Add</strong> in
                          the top-right corner to place JIYOO on your Home Screen.
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "desktop" && (
                    <div className="space-y-2.5" role="tabpanel">
                      <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white border border-[#E7E3DA]">
                        <span className="font-mono text-xs font-bold text-[#8F6B38] pt-0.5 shrink-0">
                          01
                        </span>
                        <div className="text-xs sm:text-[13px] text-[#292524] leading-relaxed">
                          <strong className="font-semibold text-[#1C1917]">
                            Chrome, Edge &amp; Brave (Windows / Mac):
                          </strong>{" "}
                          Click the{" "}
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-[#F4F1EA] border border-[#DCD6CA] font-semibold text-[#1C1917] align-middle">
                            <Monitor className="w-3 h-3" strokeWidth={2} />
                            <span>Install JIYOO</span>
                          </span>{" "}
                          icon on the right side of your address bar.
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white border border-[#E7E3DA]">
                        <span className="font-mono text-xs font-bold text-[#8F6B38] pt-0.5 shrink-0">
                          02
                        </span>
                        <div className="text-xs sm:text-[13px] text-[#292524] leading-relaxed">
                          <strong className="font-semibold text-[#1C1917]">
                            From Browser Menu:
                          </strong>{" "}
                          Or click{" "}
                          <span className="inline-flex items-center justify-center px-1 py-0.5 mx-0.5 rounded bg-[#F4F1EA] border border-[#DCD6CA] text-[#1C1917] align-middle">
                            <MoreVertical className="w-3 h-3" strokeWidth={2} />
                          </span>{" "}
                          →{" "}
                          <strong className="font-semibold text-[#1C1917]">
                            Cast, save, and share
                          </strong>{" "}
                          →{" "}
                          <strong className="font-semibold text-[#1C1917]">
                            Install page as app
                          </strong>
                          .
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white border border-[#E7E3DA]">
                        <span className="font-mono text-xs font-bold text-[#8F6B38] pt-0.5 shrink-0">
                          03
                        </span>
                        <div className="text-xs sm:text-[13px] text-[#292524] leading-relaxed">
                          <strong className="font-semibold text-[#1C1917]">
                            Safari on Mac:
                          </strong>{" "}
                          Click <strong className="font-semibold text-[#1C1917]">File</strong>{" "}
                          in the top menu bar →{" "}
                          <strong className="font-semibold text-[#1C1917]">
                            Add to Dock…
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* If viewing inside an embedded preview iframe, provide a direct standalone tab link so browser enables install */}
                  {isEmbeddedFrame && !nativeReady && typeof window !== "undefined" && (
                    <div className="p-3.5 rounded-xl bg-[#F4F1EA] border border-[#DFD9CC] flex items-center justify-between gap-3">
                      <p className="text-[11px] sm:text-xs text-[#57534E] leading-snug">
                        Browsers disable direct app installation inside preview frames. Open in
                        a full tab to install directly:
                      </p>
                      <a
                        href={window.location.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C1917] text-[#FAF9F5] text-[11px] font-semibold whitespace-nowrap hover:bg-black transition-colors shrink-0"
                      >
                        <span>Open Tab</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Action */}
            <div className="px-5 sm:px-7 py-4 bg-[#F4F1EA]/70 border-t border-[#EAE5DA] flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-[#78716C]">
                Works on Android, iPhone, iPad, Mac &amp; Windows
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-lg bg-[#1C1917] hover:bg-black text-[#FAF9F5] text-xs font-semibold tracking-wide transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
