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

const customProjectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
const isUsingCustomProject = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY ||
  (customProjectId && customProjectId !== appletConfig?.projectId)
);

const activeProjectId = customProjectId || appletConfig.projectId || 'jiyoo-7';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey || 'disabled-client-config',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    (isUsingCustomProject ? `${activeProjectId}.firebaseapp.com` : appletConfig.authDomain) ||
    'jiyoo-7.firebaseapp.com',
  projectId: activeProjectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    (isUsingCustomProject ? `${activeProjectId}.firebasestorage.app` : appletConfig.storageBucket) ||
    'jiyoo-7.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    (isUsingCustomProject ? '646981074808' : appletConfig.messagingSenderId) ||
    '646981074808',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId || '1:646981074808:web:0000000000000000000000',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || appletConfig.measurementId || '',
};

const app = initializeApp(firebaseConfig);

let firestoreDb: ReturnType<typeof getFirestore>;

const firestoreConfig: any = {
  localCache: persistentLocalCache()
};

const customDbId =
  !isUsingCustomProject &&
  appletConfig?.firestoreDatabaseId &&
  appletConfig.firestoreDatabaseId !== '(default)'
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

