import { initializeApp, setLogLevel } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { initializeFirestore, getFirestore, memoryLocalCache, persistentLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';

// Silence non-critical Firebase SDK log warnings
try {
  setLogLevel('silent');
} catch {
  // ignore
}

const REQUIRED_FIREBASE_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const missingFirebaseEnvVars = REQUIRED_FIREBASE_ENV_VARS.filter(
  (key) => !import.meta.env[key]
);

/**
 * Firebase is a runtime dependency for authenticated/cloud features, but it
 * must not prevent the public storefront from rendering when a deployment is
 * missing environment variables. Vercel can therefore render the catalogue
 * and offline-safe UI while cloud-backed actions fail gracefully until the
 * Firebase configuration is supplied.
 */
export const isFirebaseConfigured = missingFirebaseEnvVars.length === 0;
export const missingFirebaseConfig = [...missingFirebaseEnvVars];

if (!isFirebaseConfigured && typeof console !== 'undefined') {
  console.warn(
    `[Firebase Config] Missing ${missingFirebaseEnvVars.length} environment variable(s). ` +
    'Cloud features will remain unavailable until Firebase configuration is supplied.'
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'disabled-client-config',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'disabled-client-config.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'disabled-client-config',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'disabled-client-config.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

let firestoreDb: ReturnType<typeof getFirestore>;

const firestoreConfig: any = {
  localCache: persistentLocalCache()
};

try {
  firestoreDb = initializeFirestore(app, firestoreConfig);
} catch (e) {
  try {
    firestoreConfig.localCache = memoryLocalCache();
    firestoreDb = initializeFirestore(app, firestoreConfig);
  } catch (err) {
    firestoreDb = getFirestore(app);
  }
}

export const db = firestoreDb;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
export const storage = getStorage(app);

let analyticsInstance: any = null;
export const getAnalyticsInstance = async () => {
  if (analyticsInstance) return analyticsInstance;
  
  if (!import.meta.env.VITE_FIREBASE_API_KEY) {
    return null;
  }
  
  try {
    const supported = await isAnalyticsSupported();
    if (supported) {
      try {
        analyticsInstance = getAnalytics(app);
        return analyticsInstance;
      } catch (e) {
        console.warn('Analytics initialization failed (possibly invalid API key):', e);
        return null;
      }
    }
  } catch (error) {
    console.error('Analytics not supported in this environment:', error);
  }
  return null;
};

let messagingInstance: any = null;
export const getMessagingInstance = async () => {
  if (messagingInstance) return messagingInstance;
  
  if (!import.meta.env.VITE_FIREBASE_API_KEY) {
    return null;
  }
  
  try {
    const supported = await isMessagingSupported();
    if (supported) {
      try {
        messagingInstance = getMessaging(app);
        return messagingInstance;
      } catch (e) {
        console.warn('FCM initialization failed (possibly invalid API key):', e);
        return null;
      }
    }
  } catch (error) {
    console.error('FCM not supported:', error);
  }
  return null;
};

