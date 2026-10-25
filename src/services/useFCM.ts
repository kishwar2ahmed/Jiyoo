import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth, getMessagingInstance } from './firebase';
import { useToast } from '../features/core/contexts/ToastContext';

export function useFCM() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) return;
      const setupFCM = async () => {
        try {
          const messaging = await getMessagingInstance();
          if (!messaging) return;

          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            let registration: ServiceWorkerRegistration | undefined;
            if ('serviceWorker' in navigator) {
              const swParams = new URLSearchParams({
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
                appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
                measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
              }).toString();

              registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${swParams}`);
            }

            const token = await getToken(messaging, {
              serviceWorkerRegistration: registration,
              vapidKey: import.meta.env.VITE_FCM_VAPID_KEY
            });

            if (token) {
              setFcmToken(token);
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                fcmTokens: arrayUnion(token)
              });
            }
          }
        } catch (error) {
          console.error('Error setting up FCM:', error);
        }
      };
      setupFCM();
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribeFn: (() => void) | undefined;
    const listenToMessages = async () => {
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      unsubscribeFn = onMessage(messaging, (payload) => {
        if (payload.notification) {
          const { title, body } = payload.notification;
          showToast(title && body ? `${title} — ${body}` : title || body || "New notification", "info");
        }
      });
    };

    listenToMessages();

    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, []);

  return { fcmToken };
}
