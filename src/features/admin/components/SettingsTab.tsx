import React, { useState, useEffect } from 'react';
import { Save, Store, Phone, Mail, ShieldCheck } from 'lucide-react';
import { useSettings } from '../../../contexts/SettingsContext';
import { useToast } from '../../core/contexts/ToastContext';
import { ImageUpload } from './ImageUpload';
import { logAuditEvent } from '../../../services/auditService';

export function SettingsTab() {
  const { settings, updateSettings } = useSettings();
  const { showToast } = useToast();

  const [storeName, setStoreName] = useState(settings.storeName || 'JIYOO Premium Products');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '/jiyoo.logo.jpeg');
  const [developerImageUrl, setDeveloperImageUrl] = useState(
    settings.developerImageUrl || '/developer.png'
  );
  const [contactEmail, setContactEmail] = useState(settings.contactEmail || 'shamsjiyoo@gmail.com');
  const [contactPhone, setContactPhone] = useState(settings.contactPhone || '+91 97393 91891');
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber || '919739391891');

  const [founderName, setFounderName] = useState(settings.aboutUs?.founderName || 'Syed Shams');
  const [founderRole, setFounderRole] = useState(settings.aboutUs?.founderRole || 'Founder & CEO');
  const [mdName, setMdName] = useState(settings.aboutUs?.mdName || 'Dr. Mehraj Sultana');
  const [mdRole, setMdRole] = useState(settings.aboutUs?.mdRole || 'Managing Director (MD)');
  const [marketedBy, setMarketedBy] = useState(settings.aboutUs?.marketedBy || 'Shams');
  const [fssaiNumber, setFssaiNumber] = useState(settings.aboutUs?.fssaiNumber || '21226112000732');
  const [udyamNumber, setUdyamNumber] = useState(
    settings.aboutUs?.udyamNumber || 'UDYAM-KR-19-0005999'
  );
  const [introText, setIntroText] = useState(settings.aboutUs?.introText || '');
  const [objectiveText, setObjectiveText] = useState(settings.aboutUs?.objectiveText || '');
  const [visionText, setVisionText] = useState(settings.aboutUs?.visionText || '');
  const [standardsText, setStandardsText] = useState(settings.aboutUs?.standardsText || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setStoreName(settings.storeName || 'JIYOO Premium Products');
    setLogoUrl(settings.logoUrl || '/jiyoo.logo.jpeg');
    setDeveloperImageUrl(settings.developerImageUrl || '/developer.png');
    setContactEmail(settings.contactEmail || 'shamsjiyoo@gmail.com');
    setContactPhone(settings.contactPhone || '+91 97393 91891');
    setWhatsappNumber(settings.whatsappNumber || '919739391891');
    setFounderName(settings.aboutUs?.founderName || 'Syed Shams');
    setFounderRole(settings.aboutUs?.founderRole || 'Founder & CEO');
    setMdName(settings.aboutUs?.mdName || 'Dr. Mehraj Sultana');
    setMdRole(settings.aboutUs?.mdRole || 'Managing Director (MD)');
    setMarketedBy(settings.aboutUs?.marketedBy || 'Shams');
    setFssaiNumber(settings.aboutUs?.fssaiNumber || '21226112000732');
    setUdyamNumber(settings.aboutUs?.udyamNumber || 'UDYAM-KR-19-0005999');
    setIntroText(settings.aboutUs?.introText || '');
    setObjectiveText(settings.aboutUs?.objectiveText || '');
    setVisionText(settings.aboutUs?.visionText || '');
    setStandardsText(settings.aboutUs?.standardsText || '');
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings({
        storeName,
        logoUrl,
        developerImageUrl,
        contactEmail,
        contactPhone,
        whatsappNumber,
        aboutUs: {
          ...settings.aboutUs,
          founderName,
          founderRole,
          mdName,
          mdRole,
          marketedBy,
          contactPhone,
          fssaiNumber,
          udyamNumber,
          introText,
          objectiveText,
          visionText,
          standardsText,
        },
      });
      logAuditEvent('UPDATE_STORE_SETTINGS', 'SETTINGS', `Updated global store settings for ${storeName}`);
      showToast('Store settings saved successfully!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-black">Store Settings &amp; Branding</h2>
          <p className="text-brand-gray-500">
            Manage brand identity, contact numbers, leadership details, and legal registrations.
          </p>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 bg-brand-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-gray-900 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-brand-gray-200 p-6 space-y-6 shadow-xs">
        <h3 className="text-lg font-bold text-brand-black flex items-center gap-2">
          <Store className="w-5 h-5 text-emerald-600" />
          Brand Identity &amp; Contact
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">Store Name</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">
              Support Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">
              Contact Phone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">
              WhatsApp Order Number
            </label>
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <ImageUpload
            label="Store Logo"
            value={logoUrl}
            onChange={setLogoUrl}
            storagePathPrefix="store_logo"
          />
          <ImageUpload
            label="Developer Portrait"
            value={developerImageUrl}
            onChange={setDeveloperImageUrl}
            storagePathPrefix="developer_portrait"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-gray-200 p-6 space-y-6 shadow-xs">
        <h3 className="text-lg font-bold text-brand-black flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          Leadership, Marketed By &amp; Legal Registrations
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">
              Founder Name
            </label>
            <input
              type="text"
              value={founderName}
              onChange={(e) => setFounderName(e.target.value)}
              className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">
              Founder Role
            </label>
            <input
              type="text"
              value={founderRole}
              onChange={(e) => setFounderRole(e.target.value)}
              className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">MD Name</label>
            <input
              type="text"
              value={mdName}
              onChange={(e) => setMdName(e.target.value)}
              className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">MD Role</label>
            <input
              type="text"
              value={mdRole}
              onChange={(e) => setMdRole(e.target.value)}
              className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">
              Marketed By
            </label>
            <input
              type="text"
              value={marketedBy}
              onChange={(e) => setMarketedBy(e.target.value)}
              className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">
              FSSAI License Number
            </label>
            <input
              type="text"
              value={fssaiNumber}
              onChange={(e) => setFssaiNumber(e.target.value)}
              className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">
              MSME Udyam Number
            </label>
            <input
              type="text"
              value={udyamNumber}
              onChange={(e) => setUdyamNumber(e.target.value)}
              className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm font-mono"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">
              About Us Intro
            </label>
            <textarea
              rows={3}
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">
              Our Objective
            </label>
            <textarea
              rows={2}
              value={objectiveText}
              onChange={(e) => setObjectiveText(e.target.value)}
              className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">Our Vision</label>
            <textarea
              rows={2}
              value={visionText}
              onChange={(e) => setVisionText(e.target.value)}
              className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-gray-700 mb-1">
              Quality &amp; Hygiene Standards
            </label>
            <textarea
              rows={2}
              value={standardsText}
              onChange={(e) => setStandardsText(e.target.value)}
              className="w-full px-3.5 py-2 border border-brand-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
