import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let app = null;

// Lazy + guarded: with no .env values set, this stays null and every export
// below no-ops or throws a caught error, so the site works fine with rate
// alerts simply unavailable until a Firebase project is configured.
function getFirebaseApp() {
  if (!firebaseConfig.apiKey) return null;
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export async function isPushSupported() {
  if (!getFirebaseApp()) return false;
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

/**
 * Requests browser permission, registers the Firebase messaging service
 * worker, and resolves the FCM registration token for this browser.
 * Throws with a user-facing message if permission is declined or push isn't
 * supported/configured.
 */
export async function requestFcmToken() {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) throw new Error('Rate alerts are not available on this site yet.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const messaging = getMessaging(firebaseApp);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error('Could not get a push token from the browser.');
  return token;
}

/** Foreground handler — fires while a tab is open and focused. Returns an unsubscribe function. */
export function onForegroundMessage(callback) {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return () => {};
  const messaging = getMessaging(firebaseApp);
  return onMessage(messaging, callback);
}
