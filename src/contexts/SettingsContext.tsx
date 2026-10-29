import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../services/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { BannerSlide } from '../types';
import { DEFAULT_HERO_BANNERS } from '../constants/banners';

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
}

interface Settings {
  storeName: string;
  contactEmail: string;
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
  introText: "JIYOO (jiyoooshams) is an emerging online service provider connecting businesses and consumers with the finest fresh fruits, vegetables, meat, seafood, and other premium produce, sourced through a strong network of farmers, importers, and distributors both locally and internationally.",
  objectiveText: "Our objective is to build an efficient and robust online & offline platform that showcases our strengths in quality, express service, and value for money. We specialize in exotic and imported fresh produce, while continuously expanding to offer a wider range of healthy food products.",
  visionText: "Our vision is to consistently deliver premium quality with a wide assortment of healthy foods while enhancing customer experience through customized solutions and a pay-per-demand model.",
  standardsText: "With an experienced team serving hotels, retail stores, restaurants, general trade, and end-users, we are committed to maintaining the highest standards of hygiene, safety, and customer satisfaction in everything we do.",
  founderName: "Syed Shams",
  founderRole: "Founder, CEO & CFO",
  mdName: "Dr. Mehraj Sultana",
  mdRole: "Managing Director (MD)",
  marketedBy: "SHAM'S™",
  contactPhone: "+91 97393 91891",
};

const getInitialBanners = (): BannerSlide[] => {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('jiyoo_hero_banners');
      if (cached) {
        let parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasDiwali = parsed.some((b: any) => 
            b.id?.includes('diwali') || 
            b.image?.includes('diwali') || 
            b.image?.includes('file_000000002410821198a81a83a16d503f')
          );
          if (!hasDiwali) {
            const diwaliSlide = DEFAULT_HERO_BANNERS.find(b => b.id === 'diwali-special') || DEFAULT_HERO_BANNERS[0];
            parsed = [diwaliSlide, ...parsed];
          }

          const hasWhatsApp = parsed.some((b: any) => 
            b.id?.includes('whatsapp') || 
            b.image?.includes('whatsapp') || 
            b.image?.includes('file_00000000e7e48211898141e9b8e21f64')
          );
          if (!hasWhatsApp) {
            const waSlide = DEFAULT_HERO_BANNERS.find(b => b.id === 'whatsapp-order');
            if (waSlide) {
              parsed.splice(1, 0, waSlide);
            }
          }

          return parsed.map((b: BannerSlide, idx: number) => ({
            ...b,
            order: typeof b.order === 'number' ? b.order : idx,
            durationMs: b.durationMs ?? (b.id === 'whatsapp-order' || b.image?.includes('whatsapp') || b.image?.includes('file_00000000e7e48211898141e9b8e21f64') ? 8000 : undefined),
            hideCaption: b.hideCaption ?? (b.id === 'whatsapp-order' || b.image?.includes('whatsapp') || b.image?.includes('file_00000000e7e48211898141e9b8e21f64')),
          }));
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
  upiId: 'paytm.s27lek5@pty',
  upiId2: 'paytm.s22fcsb@pty',
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
  // If we are on production (not localhost) and URL points to localhost, ignore it
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return null;
    }
  }
  // Auto-migrate legacy image names
  if (url === '/devoloper.jpeg' || url === '/developer-1.jpeg' || url === '/developer-old.jpeg' || url === '/developer-portrait.jpg') {
    return '/developer.png';
  }
  return url;
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const docRef = doc(db, 'settings', 'global');
    
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const raw = snap.data();
          let resolvedBanners: BannerSlide[] = settings.heroBanners || DEFAULT_HERO_BANNERS;

          if (Array.isArray(raw.heroBanners) && raw.heroBanners.length > 0) {
            resolvedBanners = raw.heroBanners.map((b: any, index: number) => {
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
                durationMs: typeof b.durationMs === 'number' ? b.durationMs : (isWhatsApp ? 8000 : undefined),
                hideCaption: typeof b.hideCaption === 'boolean' ? b.hideCaption : isWhatsApp,
                order: typeof b.order === 'number' ? b.order : index,
                linkUrl: b.linkUrl || '',
              };
            }).sort((a: BannerSlide, b: BannerSlide) => a.order - b.order);

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
            ...raw,
            aboutUs: { ...defaultAboutUs, ...(raw.aboutUs || {}) },
            deliveryFee: typeof raw.deliveryFee === 'number' ? raw.deliveryFee : (raw.deliveryFee ? Number(raw.deliveryFee) : 40),
            logoUrl: sanitizeImageUrl(raw.logoUrl) || defaultSettings.logoUrl,
            developerImageUrl: sanitizeImageUrl(raw.developerImageUrl) || defaultSettings.developerImageUrl,
            heroBanners: resolvedBanners,
          };
          setSettings(remoteSettings);
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
    // Optimistically update UI
    setSettings(updated);
    
    try {
      await setDoc(doc(db, 'settings', 'global'), updated, { merge: true });
    } catch (err) {
      console.warn('Could not sync settings to Firestore:', err);
      throw err;
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
