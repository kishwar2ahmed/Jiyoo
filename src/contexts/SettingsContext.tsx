import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BannerSlide } from '../types';
import { DEFAULT_HERO_BANNERS } from '../constants/banners';
import { adminSaveDoc } from '../utils/adminAuth';
import { isSupabaseConfigured, supabaseFetchTable } from '../services/supabase';

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

export interface StoreSettings {
  storeName: string;
  logoUrl?: string;
  developerImageUrl?: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  upiId?: string;
  upiId2?: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  estimatedDeliveryTime: string;
  minOrderAmount: number;
  heroBanners: BannerSlide[];
  aboutUs: AboutUsSettings;
  global?: Record<string, any>;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'JIYOO Premium Products',
  logoUrl: '/jiyoo.logo.jpeg',
  developerImageUrl: '/developer.png',
  contactEmail: 'shamsjiyoo@gmail.com',
  contactPhone: '+91 97393 91891',
  whatsappNumber: '919739391891',
  upiId: '9739391891@ybl',
  upiId2: '9739391891@paytm',
  deliveryFee: 40,
  freeDeliveryThreshold: 0,
  estimatedDeliveryTime: '30 - 60 mins',
  minOrderAmount: 0,
  heroBanners: DEFAULT_HERO_BANNERS,
  aboutUs: {
    introText:
      'JIYOO (jiyooshams) is an emerging online service provider connecting businesses and consumers with the finest fresh fruits, vegetables, meat, seafood, and other premium produce, sourced through a strong network of farmers, importers, and distributors both locally and internationally.',
    objectiveText:
      'Our objective is to build an efficient and robust online & offline platform that showcases our strengths in quality, express service, and value for money. We specialize in exotic and imported fresh produce, while continuously expanding to offer a wider range of healthy food products.',
    visionText:
      'Our vision is to consistently deliver premium quality with a wide assortment of healthy foods while enhancing customer experience through customized solutions and a pay-per-demand model.',
    standardsText:
      'With an experienced team serving hotels, retail stores, restaurants, general trade, and end-users, we are committed to maintaining the highest standards of hygiene, safety, and customer satisfaction in everything we do.',
    founderName: 'Syed Shams',
    founderRole: 'Founder & CEO',
    mdName: 'Dr. Mehraj Sultana',
    mdRole: 'Managing Director (MD)',
    marketedBy: 'Shams',
    contactPhone: '+91 97393 91891',
    fssaiNumber: '21226112000732',
    udyamNumber: 'UDYAM-KR-19-0005999',
  },
};

interface SettingsContextValue {
  settings: StoreSettings;
  isLoading: boolean;
  updateSettings: (partial: Partial<StoreSettings>) => Promise<void>;
  updateBanners: (banners: BannerSlide[]) => Promise<void>;
  resetBannersToDefault: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_STORE_SETTINGS,
  isLoading: false,
  updateSettings: async () => {},
  updateBanners: async () => {},
  resetBannersToDefault: async () => {},
});

const LOCAL_SETTINGS_CACHE_KEY = 'jiyoo_store_settings_v1';

function mergeWithDefaultSettings(incoming?: Partial<StoreSettings> | null): StoreSettings {
  if (!incoming || typeof incoming !== 'object') return DEFAULT_STORE_SETTINGS;
  return {
    ...DEFAULT_STORE_SETTINGS,
    ...incoming,
    heroBanners:
      Array.isArray(incoming.heroBanners) && incoming.heroBanners.length > 0
        ? incoming.heroBanners
        : DEFAULT_STORE_SETTINGS.heroBanners,
    aboutUs: {
      ...DEFAULT_STORE_SETTINGS.aboutUs,
      ...(incoming.aboutUs || {}),
    },
  };
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_SETTINGS_CACHE_KEY);
        if (cached) {
          return mergeWithDefaultSettings(JSON.parse(cached));
        }
      } catch {
        // ignore
      }
    }
    return DEFAULT_STORE_SETTINGS;
  });
  const [isLoading, setIsLoading] = useState(false);

  const persistLocalSettings = useCallback((next: StoreSettings) => {
    setSettings(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_SETTINGS_CACHE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/catalog/settings');
        if (res.ok) {
          const body = await res.json().catch(() => null);
          if (isMounted && body?.success && body.settings) {
            const merged = mergeWithDefaultSettings(body.settings);
            persistLocalSettings(merged);
            return;
          }
        }

        if (isSupabaseConfigured) {
          const supaRes = await supabaseFetchTable<any>('settings', {
            column: 'id',
            value: 'global',
            limit: 1,
          });
          const row = supaRes.data?.[0];
          if (isMounted && row?.data) {
            const merged = mergeWithDefaultSettings(row.data);
            persistLocalSettings(merged);
          }
        }
      } catch {
        // Keep cached or default settings
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadSettings();
    return () => {
      isMounted = false;
    };
  }, [persistLocalSettings]);

  const updateSettings = useCallback(
    async (partial: Partial<StoreSettings>) => {
      const next = mergeWithDefaultSettings({
        ...settings,
        ...partial,
        aboutUs: {
          ...settings.aboutUs,
          ...(partial.aboutUs || {}),
        },
      });
      persistLocalSettings(next);
      await adminSaveDoc('settings', 'global', next);
    },
    [settings, persistLocalSettings]
  );

  const updateBanners = useCallback(
    async (banners: BannerSlide[]) => {
      await updateSettings({ heroBanners: banners });
    },
    [updateSettings]
  );

  const resetBannersToDefault = useCallback(async () => {
    await updateSettings({ heroBanners: DEFAULT_HERO_BANNERS });
  }, [updateSettings]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateSettings,
        updateBanners,
        resetBannersToDefault,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
