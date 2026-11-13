import React, { useState, useEffect } from 'react';
import { Shield, Cookie, MapPin, BarChart3, Ban, X, Check } from 'lucide-react';

export interface PrivacyConsentPreferences {
  version: number;
  decided: boolean;
  essential: true;
  mapsAndLocation: boolean;
  analytics: boolean;
  marketing: boolean;
  doNotSellOrShare: boolean;
  updatedAt: string;
}

export const PRIVACY_CONSENT_STORAGE_KEY = 'jiyoo_privacy_consent_v1';

const DEFAULT_UNDECIDED_PREFS: PrivacyConsentPreferences = {
  version: 1,
  decided: false,
  essential: true,
  mapsAndLocation: false,
  analytics: false,
  marketing: false,
  doNotSellOrShare: true,
  updatedAt: '',
};

export function getPrivacyConsentPreferences(): PrivacyConsentPreferences {
  if (typeof window === 'undefined') return DEFAULT_UNDECIDED_PREFS;
  try {
    const raw = localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY);
    if (!raw) return DEFAULT_UNDECIDED_PREFS;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_UNDECIDED_PREFS;
    return {
      version: 1,
      decided: Boolean(parsed.decided),
      essential: true,
      mapsAndLocation: Boolean(parsed.mapsAndLocation),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      doNotSellOrShare: parsed.doNotSellOrShare !== undefined ? Boolean(parsed.doNotSellOrShare) : true,
      updatedAt: String(parsed.updatedAt || ''),
    };
  } catch {
    return DEFAULT_UNDECIDED_PREFS;
  }
}

export function savePrivacyConsentPreferences(
  prefs: Omit<PrivacyConsentPreferences, 'version' | 'essential' | 'updatedAt' | 'decided'>
): PrivacyConsentPreferences {
  const next: PrivacyConsentPreferences = {
    version: 1,
    decided: true,
    essential: true,
    mapsAndLocation: Boolean(prefs.mapsAndLocation),
    analytics: Boolean(prefs.analytics),
    marketing: Boolean(prefs.marketing),
    doNotSellOrShare: Boolean(prefs.doNotSellOrShare),
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('jiyoo-privacy-consent-updated', { detail: next }));
    } catch {
      // ignore storage errors
    }
  }
  return next;
}

export function hasMapsAndLocationConsent(): boolean {
  return getPrivacyConsentPreferences().mapsAndLocation === true;
}

export function CookieConsentBanner() {
  const [prefs, setPrefs] = useState<PrivacyConsentPreferences>(() => getPrivacyConsentPreferences());
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState<boolean>(false);

  useEffect(() => {
    const current = getPrivacyConsentPreferences();
    setPrefs(current);
    if (!current.decided) {
      setShowBanner(true);
    }

    const handleOpenSettings = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const latest = getPrivacyConsentPreferences();
      if (detail?.doNotSell) {
        setPrefs({ ...latest, doNotSellOrShare: true, marketing: false, analytics: false });
      } else {
        setPrefs(latest);
      }
      setShowCustomizeModal(true);
    };

    const handleConsentUpdated = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as PrivacyConsentPreferences | undefined;
      if (detail) {
        setPrefs(detail);
      } else {
        setPrefs(getPrivacyConsentPreferences());
      }
    };

    window.addEventListener('open-cookie-settings', handleOpenSettings);
    document.addEventListener('open-cookie-settings', handleOpenSettings);
    window.addEventListener('jiyoo-privacy-consent-updated', handleConsentUpdated);

    return () => {
      window.removeEventListener('open-cookie-settings', handleOpenSettings);
      document.removeEventListener('open-cookie-settings', handleOpenSettings);
      window.removeEventListener('jiyoo-privacy-consent-updated', handleConsentUpdated);
    };
  }, []);

  const handleAcceptAll = () => {
    const saved = savePrivacyConsentPreferences({
      mapsAndLocation: true,
      analytics: true,
      marketing: false,
      doNotSellOrShare: true,
    });
    setPrefs(saved);
    setShowBanner(false);
    setShowCustomizeModal(false);
  };

  const handleRejectNonEssential = () => {
    const saved = savePrivacyConsentPreferences({
      mapsAndLocation: false,
      analytics: false,
      marketing: false,
      doNotSellOrShare: true,
    });
    setPrefs(saved);
    setShowBanner(false);
    setShowCustomizeModal(false);
  };

  const handleSaveCustom = () => {
    const saved = savePrivacyConsentPreferences({
      mapsAndLocation: prefs.mapsAndLocation,
      analytics: prefs.analytics,
      marketing: prefs.marketing,
      doNotSellOrShare: prefs.doNotSellOrShare,
    });
    setPrefs(saved);
    setShowBanner(false);
    setShowCustomizeModal(false);
  };

  if (!showBanner && !showCustomizeModal) return null;

  return (
    <>
      {/* Bottom Consent Banner */}
      {showBanner && !showCustomizeModal && (
        <aside
          role="region"
          aria-label="Cookie and Privacy Consent"
          className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 pointer-events-none"
        >
          <div className="max-w-5xl mx-auto bg-white/98 backdrop-blur-md border border-stone-200/90 rounded-2xl shadow-2xl p-4 sm:p-5 pointer-events-auto">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Cookie className="w-4 h-4 text-emerald-700 shrink-0" />
                  <h2 className="text-xs sm:text-sm font-bold text-stone-900">
                    Your Privacy &amp; Cookie Choices (DPDP Act · GDPR · US CCPA)
                  </h2>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  We use strictly necessary storage to keep your cart, session, and security tokens working. Optional third-party embeds (such as interactive Google Maps &amp; OpenStreetMap address lookup) and analytics are{' '}
                  <strong className="font-semibold text-stone-900">blocked by default</strong> until you choose to enable them. We never sell or share your personal data with ad networks.{' '}
                  <button
                    type="button"
                    onClick={() =>
                      document.dispatchEvent(
                        new CustomEvent('open-legal-policy', { detail: { tab: 'privacy' } })
                      )
                    }
                    className="underline font-semibold text-stone-900 hover:text-emerald-700 cursor-pointer"
                  >
                    Read Privacy Policy
                  </button>
                </p>
              </div>

              {/* Equal-prominence Reject & Accept buttons + Customize */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCustomizeModal(true)}
                  className="px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Customize
                </button>
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="px-4 py-2.5 rounded-xl border border-stone-900 bg-white hover:bg-stone-100 text-stone-900 text-xs font-bold transition-colors cursor-pointer"
                >
                  Reject Non-Essential
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-2.5 rounded-xl border border-stone-900 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Granular Privacy & Cookie Preferences Modal */}
      {showCustomizeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-prefs-title"
        >
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h3 id="cookie-prefs-title" className="text-sm font-bold text-stone-900">
                    Privacy, Cookie &amp; US Opt-Out Preferences
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Withdraw or update your consent at any time with one click.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                aria-label="Close privacy preferences"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-stone-600">
              {/* Strictly Necessary */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    Strictly Necessary (Cart, Auth &amp; Security)
                  </div>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Required for shopping cart persistence, account sign-in, CSRF/rate-limit security, and Razorpay checkout when you place an order.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold text-[10px] uppercase tracking-wider shrink-0">
                  Always Active
                </span>
              </div>

              {/* Third-party Maps & Location */}
              <div className="p-3.5 rounded-xl bg-white border border-stone-200 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-700" />
                    Interactive Maps &amp; Address Geocoding
                  </div>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Allows loading interactive Google Maps embeds and OpenStreetMap (Nominatim) reverse-geocoding when you open the Location Picker.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs.mapsAndLocation}
                  aria-label="Toggle Interactive Maps and Address Geocoding"
                  onClick={() =>
                    setPrefs((p) => ({ ...p, mapsAndLocation: !p.mapsAndLocation }))
                  }
                  className={`w-10 h-6 rounded-full relative transition-colors shrink-0 cursor-pointer ${
                    prefs.mapsAndLocation ? 'bg-emerald-600' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                      prefs.mapsAndLocation ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Analytics */}
              <div className="p-3.5 rounded-xl bg-white border border-stone-200 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-stone-700" />
                    Performance &amp; Diagnostics
                  </div>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Helps us measure page load reliability. We never use keystroke recording, session replay, or behavioral ad pixels.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs.analytics}
                  aria-label="Toggle Performance and Diagnostics"
                  onClick={() => setPrefs((p) => ({ ...p, analytics: !p.analytics }))}
                  className={`w-10 h-6 rounded-full relative transition-colors shrink-0 cursor-pointer ${
                    prefs.analytics ? 'bg-emerald-600' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                      prefs.analytics ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* US CCPA / CPRA Do Not Sell or Share */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5 text-amber-800" />
                    US Privacy: Do Not Sell or Share My Personal Information
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    JIYOO does not sell personal information or share it for cross-context behavioral advertising under CCPA/CPRA. Keep this enabled to enforce strict opt-out headers across your browser session.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs.doNotSellOrShare}
                  aria-label="Do Not Sell or Share My Personal Information"
                  onClick={() =>
                    setPrefs((p) => ({ ...p, doNotSellOrShare: !p.doNotSellOrShare }))
                  }
                  className={`w-10 h-6 rounded-full relative transition-colors shrink-0 cursor-pointer ${
                    prefs.doNotSellOrShare ? 'bg-emerald-600' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                      prefs.doNotSellOrShare ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="px-5 py-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="px-3.5 py-2 rounded-xl border border-stone-900 bg-white hover:bg-stone-100 text-stone-900 text-xs font-bold cursor-pointer"
                >
                  Reject Non-Essential
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-800 text-xs font-semibold cursor-pointer"
                >
                  Accept All
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold cursor-pointer"
              >
                Save My Choices
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
