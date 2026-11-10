import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, isFirebaseConfigured } from '../services/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { BannerSlide } from '../types';
import { DEFAULT_HERO_BANNERS } from '../constants/banners';
import { getAdminAuthHeaders, isOwnerAdminEmail } from '../utils/adminAuth';

export interface AboutUsSettings {
  introText?: string;
  objectiveText?: string;
  visionText?: string;
  standardsText?: string;
  founderName?: string;
  founderRole?: string;
  mdName?: string;
  mdRole?: string;
  marketedBy?: string;
  contactPhone?: string;
  fssaiNumber?: string;
  udyamNumber?: string;
}

interface Settings {
  storeName: string;
  contactEmail: string;
  contactPhone?: string;
  logoUrl: string | null;
  developerImageUrl: string | null;
  whatsappNumber: string;
  upiId: string;
  upiId2?: string;
  qrCodeUrl?: string | null;
  deliveryFee: number;
  freeDeliveryThreshold?: number;
  estimatedDeliveryTime?: string;
  minOrderAmount?: number;
  storeNotice?: string;
  aboutUs?: AboutUsSettings;
  heroBanners?: BannerSlide[];
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  updateBanners: (banners: BannerSlide[]) => Promise<void>;
  resetBannersToDefault: () => Promise<void>;
}

const defaultAboutUs: AboutUsSettings = {
  introText: "JIYOO is an emerging online service provider connecting businesses and consumers with the finest fresh fruits, vegetables, meat, seafood, and other premium produce, sourced through a strong network of farmers, importers, and distributors both locally and internationally.",
  objectiveText: "Our objective is to build an efficient and robust online & offline platform that showcases our strengths in quality, express service, and value for money. We specialize in exotic and imported fresh produce, while continuously expanding to offer a wider range of healthy food products.",
  visionText: "Our vision is to consistently deliver premium quality with a wide assortment of healthy foods while enhancing customer experience through customized solutions and a pay-per-demand model.",
  standardsText: "With an experienced team serving hotels, retail stores, restaurants, general trade, and end-users, we are committed to maintaining the highest standards of hygiene, safety, and customer satisfaction in everything we do.",
  founderName: "Dr. Mehraj Sultana",
  founderRole: "Founder, CEO & CFO",
  mdName: "",
  mdRole: "",
  marketedBy: "JIYOO",
  contactPhone: "+91 96114 68986",
};

const normalizeAboutUs = (raw?: AboutUsSettings): AboutUsSettings => {
  const merged: AboutUsSettings = { ...defaultAboutUs, ...(raw || {}) };
  if (merged.introText) {
    merged.introText = merged.introText
      .replace(/\s*\(jiyoo+shams\)/gi, "")
      .replace(/\bshams\b/gi, "JIYOO");
  }
  if (!merged.founderName || /shams/i.test(merged.founderName)) {
    merged.founderName = "Dr. Mehraj Sultana";
  }
  if (!merged.founderRole || merged.founderRole.trim() === "Founder & CEO") {
    merged.founderRole = "Founder, CEO & CFO";
  }
  if (merged.mdName && merged.mdName.trim().toLowerCase() === "dr. mehraj sultana") {
    merged.mdName = "";
    merged.mdRole = "";
  }
  if (!merged.marketedBy || /sham/i.test(merged.marketedBy)) {
    merged.marketedBy = "JIYOO";
  }
  if (!merged.contactPhone || merged.contactPhone.replace(/\D/g, "").endsWith("9739391891")) {
    merged.contactPhone = "+91 96114 68986";
  }
  return merged;
};

const ensureCoreBanners = (banners: BannerSlide[]): BannerSlide[] => {
  const list = [...banners];

  const requiredIds = [
    'jiyoo-diwali-hampers',
    'jiyoo-diwali-feast',
    'jiyoo-diwali-wholesale',
    'diwali-special',
    'wholesale-india',
    'whatsapp-order',
    'fast-foods-banner',
  ];

  requiredIds.forEach((reqId, targetIdx) => {
    const defSlide = DEFAULT_HERO_BANNERS.find((b) => b.id === reqId);
    if (!defSlide) return;
    const existingIdx = list.findIndex(
      (b: any) => b.id === reqId || b.image === defSlide.image
    );
    if (existingIdx === -1) {
      list.splice(Math.min(targetIdx, list.length), 0, defSlide);
    } else if (existingIdx !== targetIdx && targetIdx < 4) {
      const [item] = list.splice(existingIdx, 1);
      list.splice(Math.min(targetIdx, list.length), 0, item);
    }
  });

  return list.map((b: BannerSlide, idx: number) => {
    const isClassicDiwali =
      b.id === 'diwali-special' ||
      b.image?.includes('diwali_special_sale') ||
      b.image?.includes('file_000000002410821198a81a83a16d503f');
    const isWhatsApp =
      b.id === 'whatsapp-order' ||
      b.image?.includes('whatsapp') ||
      b.image?.includes('file_00000000e7e48211898141e9b8e21f64');
    return {
      ...b,
      order: idx,
      durationMs: b.durationMs ?? (isWhatsApp ? 7500 : undefined),
      hideCaption: Boolean(isClassicDiwali || isWhatsApp),
    };
  });
};

const getInitialBanners = (): BannerSlide[] => {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('jiyoo_hero_banners');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return ensureCoreBanners(parsed);
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }
  return DEFAULT_HERO_BANNERS;
};

const defaultSettings: Settings = {
  storeName: 'JIYOO Premium Products',
  contactEmail: 'shamsjiyoo@gmail.com (Primary) · jiyooshams@gmail.com',
  logoUrl: '/jiyoo.logo.jpeg',
  developerImageUrl: '/developer.png',
  whatsappNumber: '919739391891',
  upiId: '9739391891@ybl',
  upiId2: '9739391891@paytm',
  qrCodeUrl: null,
  deliveryFee: 40,
  freeDeliveryThreshold: 0,
  estimatedDeliveryTime: '30 - 60 mins',
  minOrderAmount: 0,
  storeNotice: '',
  aboutUs: defaultAboutUs,
  heroBanners: getInitialBanners(),
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const sanitizeImageUrl = (url: string | null): string | null => {
  if (!url) return null;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return null;
    }
  }
  if (url === '/devoloper.jpeg' || url === '/developer-1.jpeg' || url === '/developer-old.jpeg' || url === '/developer-portrait.jpg') {
    return '/developer.png';
  }
  return url;
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('jiyoo_store_settings_v4');
        if (cached) {
          const parsed = JSON.parse(cached);
          return {
            ...defaultSettings,
            ...parsed,
            aboutUs: normalizeAboutUs(parsed.aboutUs),
            heroBanners: Array.isArray(parsed.heroBanners) && parsed.heroBanners.length > 0 ? ensureCoreBanners(parsed.heroBanners) : getInitialBanners(),
          };
        }
      } catch {
        // ignore
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    // Load server-persisted settings
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => {
        if (data?.success && data.settings && Object.keys(data.settings).length > 0) {
          const raw = data.settings;
          setSettings(prev => {
            const next: Settings = {
              ...prev,
              ...raw,
              aboutUs: normalizeAboutUs({ ...(prev.aboutUs || {}), ...(raw.aboutUs || {}) }),
              deliveryFee: typeof raw.deliveryFee === 'number' ? raw.deliveryFee : prev.deliveryFee,
              logoUrl: sanitizeImageUrl(raw.logoUrl) || prev.logoUrl,
              developerImageUrl: sanitizeImageUrl(raw.developerImageUrl) || prev.developerImageUrl,
              heroBanners: Array.isArray(raw.heroBanners) && raw.heroBanners.length > 0 ? ensureCoreBanners(raw.heroBanners) : prev.heroBanners,
            };
            try {
              localStorage.setItem('jiyoo_store_settings_v4', JSON.stringify(next));
            } catch {
              // ignore storage quota errors
            }
            return next;
          });
        }
      })
      .catch(() => {});

    if (!isFirebaseConfigured) return;
    const docRef = doc(db, 'settings', 'global');
    
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const raw = snap.data();
          setSettings((prev) => {
            let resolvedBanners: BannerSlide[] = prev.heroBanners || DEFAULT_HERO_BANNERS;

            if (Array.isArray(raw.heroBanners) && raw.heroBanners.length > 0) {
              resolvedBanners = ensureCoreBanners(
                raw.heroBanners.map((b: any, index: number) => {
                  const isDiwali = b.id?.includes('diwali') || b.image?.includes('diwali') || b.image?.includes('file_000000002410821198a81a83a16d503f');
                  const isWhatsApp = b.id?.includes('whatsapp') || b.image?.includes('whatsapp') || b.image?.includes('file_00000000e7e48211898141e9b8e21f64');
                  return {
                    id: b.id || `banner-${index}`,
                    image: b.image || '/banners/02_Indian_Fruits_Original.png',
                    alt: b.alt || b.title || 'JIYOO Banner',
                    badge: b.badge || 'Featured',
                    title: b.title || 'Fresh Produce',
                    subtitle: b.subtitle || '',
                    isActive: b.isActive !== false,
                    isFeatured: typeof b.isFeatured === 'boolean' ? b.isFeatured : isDiwali,
                    highlightTone: b.highlightTone || (isDiwali ? 'amber' : isWhatsApp ? 'emerald' : 'none'),
                    durationMs: typeof b.durationMs === 'number' ? b.durationMs : (isWhatsApp ? 7500 : undefined),
                    hideCaption: typeof b.hideCaption === 'boolean' ? b.hideCaption : (isWhatsApp || isDiwali),
                    order: typeof b.order === 'number' ? b.order : index,
                    linkUrl: b.linkUrl || '',
                  };
                }).sort((a: BannerSlide, b: BannerSlide) => a.order - b.order)
              );

              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('jiyoo_hero_banners', JSON.stringify(resolvedBanners));
                } catch {
                  // ignore
                }
              }
            }

            const remoteSettings: Settings = {
              ...defaultSettings,
              ...prev,
              ...raw,
              aboutUs: normalizeAboutUs({ ...(prev.aboutUs || {}), ...(raw.aboutUs || {}) }),
              deliveryFee: typeof raw.deliveryFee === 'number' ? raw.deliveryFee : (raw.deliveryFee ? Number(raw.deliveryFee) : 40),
              logoUrl: sanitizeImageUrl(raw.logoUrl) || defaultSettings.logoUrl,
              developerImageUrl: sanitizeImageUrl(raw.developerImageUrl) || defaultSettings.developerImageUrl,
              heroBanners: resolvedBanners,
            };
            try {
              localStorage.setItem('jiyoo_store_settings_v4', JSON.stringify(remoteSettings));
            } catch {
              // ignore storage quota errors
            }
            return remoteSettings;
          });
        }
      },
      (err) => {
        console.warn('Settings sync offline or unavailable:', err.message);
      }
    );

    return () => unsub();
  }, []);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jiyoo_store_settings_v4', JSON.stringify(updated));
      } catch {
        // ignore storage quota errors
      }
    }

    try {
      const headers = await getAdminAuthHeaders(true);
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify(updated),
      });
    } catch {
      // Local persistence already succeeded
    }

    // Best-effort mirror to client Firestore when signed in via Firebase Auth
    if (auth.currentUser && auth.currentUser.emailVerified && isOwnerAdminEmail(auth.currentUser.email)) {
      try {
        await setDoc(doc(db, 'settings', 'global'), updated, { merge: true });
      } catch {
        // Ignore optional client-side mirror error
      }
    }
  };

  const updateBanners = async (banners: BannerSlide[]) => {
    const normalized = [...banners].map((b, idx) => ({ ...b, order: idx }));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jiyoo_hero_banners', JSON.stringify(normalized));
      } catch {
        // ignore
      }
    }
    await updateSettings({ heroBanners: normalized });
  };

  const resetBannersToDefault = async () => {
    await updateBanners(DEFAULT_HERO_BANNERS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, updateBanners, resetBannersToDefault }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
