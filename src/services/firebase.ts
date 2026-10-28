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
export const missingFirebaseConfig = [...missingFirebaseEnvVars];

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

try {
  firestoreDb = initializeFirestore(app, firestoreConfig, appletConfig.firestoreDatabaseId);
} catch (e) {
  try {
    firestoreConfig.localCache = memoryLocalCache();
    firestoreDb = initializeFirestore(app, firestoreConfig, appletConfig.firestoreDatabaseId);
  } catch (err) {
    firestoreDb = getFirestore(app, appletConfig.firestoreDatabaseId);
  }
}

export const db = firestoreDb;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot if in browser
if (typeof window !== 'undefined' && isFirebaseConfigured) {
  getDocFromServer(doc(db, 'test', 'connection')).catch((err) => {
    if (err instanceof Error && err.message.includes('the client is offline')) {
      console.warn('Firebase client is offline.');
    }
  });
}

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

