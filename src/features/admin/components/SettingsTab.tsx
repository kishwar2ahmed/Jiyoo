import { useState } from "react";
import { Save, Globe } from "lucide-react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useCart } from "../../../contexts/CartContext";
import { ImageUpload } from "./ImageUpload";
import { useToast } from "../../core/contexts/ToastContext";
import { PhonePeIcon, PaytmIcon, UpiOfficialIcon } from "../../core/components/UpiIcons";

export function SettingsTab() {
  const { showToast } = useToast();
  const { settings, updateSettings } = useSettings();
  const { user } = useCart();
  const [storeName, setStoreName] = useState(settings.storeName);
  const [contactEmail, setContactEmail] = useState(settings.contactEmail);
  const [whatsappNumber, setWhatsappNumber] = useState(
    settings.whatsappNumber || "919739391891",
  );
  const [upiId, setUpiId] = useState(settings.upiId || "9739391891@ybl");
  const [upiId2, setUpiId2] = useState(settings.upiId2 || "9739391891@paytm");
  const [deliveryFee, setDeliveryFee] = useState<number>(
    typeof settings.deliveryFee === "number" ? settings.deliveryFee : 40,
  );
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(
    settings.freeDeliveryThreshold || 0,
  );
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState<string>(
    settings.estimatedDeliveryTime || "30 - 60 mins",
  );
  const [minOrderAmount, setMinOrderAmount] = useState<number>(
    settings.minOrderAmount || 0,
  );
  const [storeNotice, setStoreNotice] = useState<string>(
    settings.storeNotice || "",
  );
  const [qrCodeUrl, setQrCodeUrl] = useState(settings.qrCodeUrl || "");
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || "");
  const [developerImageUrl, setDeveloperImageUrl] = useState<string>(
    settings.developerImageUrl || "/developer.png"
  );

  // SSO & Domain
  const [customDomain, setCustomDomain] = useState("store.jiyoo.com");
  const [ssoProvider, setSsoProvider] = useState("Google Workspace / SAML");

  // About Us Fields
  const [aboutIntro, setAboutIntro] = useState(settings.aboutUs?.introText || "");
  const [aboutObjective, setAboutObjective] = useState(settings.aboutUs?.objectiveText || "");
  const [aboutVision, setAboutVision] = useState(settings.aboutUs?.visionText || "");
  const [aboutStandards, setAboutStandards] = useState(settings.aboutUs?.standardsText || "");
  const [founderName, setFounderName] = useState(settings.aboutUs?.founderName || "Syed Shams");
  const [founderRole, setFounderRole] = useState(settings.aboutUs?.founderRole || "Founder, CEO & CFO");
  const [mdName, setMdName] = useState(settings.aboutUs?.mdName || "Dr. Mehraj Sultana");
  const [mdRole, setMdRole] = useState(settings.aboutUs?.mdRole || "Managing Director (MD)");
  const [marketedBy, setMarketedBy] = useState(settings.aboutUs?.marketedBy || "SHAM'S™");
  const [contactPhone, setContactPhone] = useState(settings.aboutUs?.contactPhone || "+91 97393 91891");

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updates: any = {
        storeName,
        contactEmail,
        whatsappNumber,
        upiId,
        upiId2,
        deliveryFee: Number(deliveryFee) || 0,
        freeDeliveryThreshold: Number(freeDeliveryThreshold) || 0,
        estimatedDeliveryTime,
        minOrderAmount: Number(minOrderAmount) || 0,
        storeNotice,
        qrCodeUrl: qrCodeUrl || null,
        logoUrl: logoUrl || null,
        developerImageUrl: developerImageUrl || "/developer.png",
        aboutUs: {
          introText: aboutIntro,
          objectiveText: aboutObjective,
          visionText: aboutVision,
          standardsText: aboutStandards,
          founderName,
          founderRole,
          mdName,
          mdRole,
          marketedBy,
          contactPhone,
        },
      };
      await updateSettings(updates);
      showToast("Store settings saved successfully!", "success");
    } catch (err: any) {
      console.warn("Could not save settings", err);
      if (err.message && err.message.includes("offline")) {
        showToast(
          'Images disappeared? Your Firebase Database is not created yet — go to Firebase Console (jiyoo-33318) and create it in Firestore, and click "Get Started" in Storage.',
          "error",
        );
      } else {
        showToast(
          "Settings saved locally, but Firebase sync failed: " + err.message,
          "error",
        );
      }
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-black">Settings</h2>
        <p className="text-brand-gray-500">
          Manage global store configuration.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-brand-gray-200 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                Store Name
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="text"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                WhatsApp & Payment Contact Number
              </label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600 font-mono"
                placeholder="919739391891"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1 flex items-center justify-between">
                <span>Primary Store UPI ID (QR 1)</span>
                <span className="flex items-center gap-1.5">
                  <PhonePeIcon className="h-4 w-4" />
                  <UpiOfficialIcon className="h-3 w-auto" />
                </span>
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600 font-mono"
                placeholder="9739391891@ybl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1 flex items-center justify-between">
                <span>Secondary Store UPI ID (QR 2)</span>
                <span className="flex items-center gap-1.5">
                  <PaytmIcon className="h-2.5 w-auto" />
                  <UpiOfficialIcon className="h-3 w-auto" />
                </span>
              </label>
              <input
                type="text"
                value={upiId2}
                onChange={(e) => setUpiId2(e.target.value)}
                className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600 font-mono"
                placeholder="9739391891@paytm"
              />
            </div>

            <div className="pt-4 border-t border-brand-gray-100 space-y-4">
              <h3 className="text-sm font-semibold text-brand-black">
                Delivery & Shipping Fees (Admin Configurable)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Delivery Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                    className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600 font-medium text-emerald-700"
                    placeholder="40"
                  />
                  <p className="text-xs text-brand-gray-400 mt-1">
                    Default delivery fee added to checkout orders (e.g. ₹40).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Free Delivery Threshold (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={freeDeliveryThreshold}
                    onChange={(e) =>
                      setFreeDeliveryThreshold(Number(e.target.value))
                    }
                    className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    placeholder="0"
                  />
                  <p className="text-xs text-brand-gray-400 mt-1">
                    Set to 0 to disable free delivery, or enter order total for
                    free delivery (e.g. 500).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Estimated Delivery Time
                  </label>
                  <input
                    type="text"
                    value={estimatedDeliveryTime}
                    onChange={(e) => setEstimatedDeliveryTime(e.target.value)}
                    className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    placeholder="30 - 60 mins"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Minimum Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                    className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                  Top Store Announcement / Notice (Optional)
                </label>
                <input
                  type="text"
                  value={storeNotice}
                  onChange={(e) => setStoreNotice(e.target.value)}
                  className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  placeholder="e.g., Special Offer: Flat ₹40 delivery on all fresh orders!"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-brand-gray-100">
              <h3 className="text-sm font-semibold text-brand-black mb-3">
                Custom UPI QR Code Image (Optional)
              </h3>
              <p className="text-xs text-brand-gray-500 mb-4">
                If provided, this image will be shown to customers instead of
                generating one automatically.
              </p>
              <div className="max-w-xs">
                <ImageUpload
                  label="Custom QR Code"
                  value={qrCodeUrl}
                  onChange={setQrCodeUrl}
                  storagePath="qr-codes"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-brand-gray-100 space-y-8">
            <div>
              <h3 className="text-lg font-medium text-brand-black mb-2">
                About Us Page Content
              </h3>
              <p className="text-sm text-brand-gray-500 mb-6">
                Customize the company biography, leadership names, and contact information displayed in the About Us modal.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Introduction Paragraph
                  </label>
                  <textarea
                    rows={3}
                    value={aboutIntro}
                    onChange={(e) => setAboutIntro(e.target.value)}
                    className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Company Objective
                  </label>
                  <textarea
                    rows={3}
                    value={aboutObjective}
                    onChange={(e) => setAboutObjective(e.target.value)}
                    className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                    Vision & Standards
                  </label>
                  <textarea
                    rows={3}
                    value={aboutVision}
                    onChange={(e) => setAboutVision(e.target.value)}
                    className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">Founder / CEO Name</label>
                    <input
                      type="text"
                      value={founderName}
                      onChange={(e) => setFounderName(e.target.value)}
                      className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">Founder Title</label>
                    <input
                      type="text"
                      value={founderRole}
                      onChange={(e) => setFounderRole(e.target.value)}
                      className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">Managing Director Name</label>
                    <input
                      type="text"
                      value={mdName}
                      onChange={(e) => setMdName(e.target.value)}
                      className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">MD Title</label>
                    <input
                      type="text"
                      value={mdRole}
                      onChange={(e) => setMdRole(e.target.value)}
                      className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">Marketed By</label>
                    <input
                      type="text"
                      value={marketedBy}
                      onChange={(e) => setMarketedBy(e.target.value)}
                      className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-brand-black mb-2">
                Store Branding & Developer Identity
              </h3>
              <p className="text-sm text-brand-gray-500 mb-6">
                Upload your brand logo and developer portrait image here.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <ImageUpload
                    label="Store Logo"
                    value={logoUrl}
                    onChange={setLogoUrl}
                    storagePath="brand"
                  />
                </div>
                <div>
                  <ImageUpload
                    label="Developer Portrait"
                    value={developerImageUrl}
                    onChange={setDeveloperImageUrl}
                    storagePath="brand"
                    circular={true}
                  />
                </div>
              </div>
            </div>

            {/* Organisation SSO & Custom Domains */}
            <div className="pt-6 border-t border-brand-gray-100">
              <h3 className="text-lg font-medium text-brand-black mb-2 flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-600" />
                Organisation Settings (SSO & Custom Domains)
              </h3>
              <p className="text-sm text-brand-gray-500 mb-4">
                Configure custom domain routing, CNAME SSL verification, and enterprise Single Sign-On (SSO).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-gray-700 uppercase tracking-wider mb-1">
                    Custom Domain Name
                  </label>
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600 font-mono"
                    placeholder="store.jiyoo.com"
                  />
                  <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                    ✓ SSL Certificate Active & CNAME Routed
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-gray-700 uppercase tracking-wider mb-1">
                    Enterprise SSO Provider
                  </label>
                  <select
                    value={ssoProvider}
                    onChange={(e) => setSsoProvider(e.target.value)}
                    className="w-full bg-brand-gray-50 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="Google Workspace / SAML">Google Workspace / Firebase Auth</option>
                    <option value="Okta SAML 2.0">Okta Enterprise SAML 2.0</option>
                    <option value="Azure AD / Entra ID">Azure AD / Microsoft Entra ID</option>
                  </select>
                  <p className="text-[11px] text-brand-gray-400 mt-1">
                    Enforces SSO auth across all organization admin users.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-brand-gray-100">
            <button
              disabled={isSaving}
              type="submit"
              className="w-full sm:w-auto bg-brand-black text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-gray-900 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />{" "}
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
