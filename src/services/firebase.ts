import { initializeApp, setLogLevel } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, getFirestore, memoryLocalCache, persistentLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';

// Silence non-critical Firebase SDK log warnings
try {
  setLogLevel('silent');
} catch {
  // ignore
}

import appletConfig from '../../firebase-applet-config.json';
import { doc, getDocFromServer } from 'firebase/firestore';

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

export const isFirebaseConfigured = Boolean(
  (appletConfig?.projectId && appletConfig?.apiKey && !appletConfig.projectId.includes('remixed-project-id')) ||
  missingFirebaseEnvVars.length === 0
);

const firebaseConfig = {
  apiKey: appletConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || 'disabled-client-config',
  authDomain: appletConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'disabled-client-config.firebaseapp.com',
  projectId: appletConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'disabled-client-config',
  storageBucket: appletConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'disabled-client-config.appspot.com',
  messagingSenderId: appletConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: appletConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
  measurementId: appletConfig.measurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

const app = initializeApp(firebaseConfig);

let firestoreDb: ReturnType<typeof getFirestore>;

const firestoreConfig: any = {
  localCache: persistentLocalCache()
};

const customDbId =
  appletConfig?.firestoreDatabaseId && appletConfig.firestoreDatabaseId !== '(default)'
    ? appletConfig.firestoreDatabaseId
    : undefined;

try {
  firestoreDb = customDbId
    ? initializeFirestore(app, firestoreConfig, customDbId)
    : initializeFirestore(app, firestoreConfig);
} catch {
  try {
    firestoreConfig.localCache = memoryLocalCache();
    firestoreDb = customDbId
      ? initializeFirestore(app, firestoreConfig, customDbId)
      : initializeFirestore(app, firestoreConfig);
  } catch {
    firestoreDb = customDbId ? getFirestore(app, customDbId) : getFirestore(app);
  }
}

export const db = firestoreDb;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

// Test connection on boot if in browser
if (typeof window !== 'undefined' && isFirebaseConfigured) {
  getDocFromServer(doc(db, 'test', 'connection')).catch((err) => {
    if (err instanceof Error && err.message.includes('the client is offline')) {
      console.warn('Firebase client is offline.');
    }
  });
}

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

