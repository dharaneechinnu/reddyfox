/* eslint-disable no-undef */
// Background push handler for Chrome rate alerts.
//
// This file is served as-is from /public — Vite does not process it, so it
// can't read VITE_FIREBASE_* from .env. Fill in the same values below; a
// Firebase web config is a public client identifier, not a secret.
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'REPLACE_WITH_VITE_FIREBASE_API_KEY',
  authDomain: 'REPLACE_WITH_VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'REPLACE_WITH_VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'REPLACE_WITH_VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'REPLACE_WITH_VITE_FIREBASE_APP_ID',
});

const messaging = firebase.messaging();

// Tab closed or unfocused — Chrome renders this as a native OS notification.
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'Reddy Forex rate alert', {
    body: body || '',
    icon: '/favicon.svg',
  });
});
