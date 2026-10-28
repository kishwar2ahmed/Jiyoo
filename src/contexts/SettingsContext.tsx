import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../services/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

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
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
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
          const remoteSettings: Settings = {
            ...defaultSettings,
            ...raw,
            aboutUs: { ...defaultAboutUs, ...(raw.aboutUs || {}) },
            deliveryFee: typeof raw.deliveryFee === 'number' ? raw.deliveryFee : (raw.deliveryFee ? Number(raw.deliveryFee) : 40),
            logoUrl: sanitizeImageUrl(raw.logoUrl) || defaultSettings.logoUrl,
            developerImageUrl: sanitizeImageUrl(raw.developerImageUrl) || defaultSettings.developerImageUrl,
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

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
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
