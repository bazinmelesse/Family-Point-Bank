/**
 * The Firebase project every family's data lives in.
 * Copy these values from Firebase console → Project settings → Your apps → Web app.
 * They are meant to be public; the database rules (firebase-rules.json) are what keep each family's data private.
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBfAl_cHO_XT3HfHkt1BZbnrZZEVvyfi5A',
  authDomain: 'point-system-for-kids.firebaseapp.com',
  databaseURL: 'https://point-system-for-kids-default-rtdb.firebaseio.com',
  projectId: 'point-system-for-kids',
  storageBucket: 'point-system-for-kids.firebasestorage.app',
  messagingSenderId: '19367501093',
  appId: '1:19367501093:web:9cab1ffff54d8d540f0ecc',
};

/** For local testing against the Firebase emulators: set EXPO_PUBLIC_FIREBASE_EMULATOR=1 before `npx expo start`. */
export const USE_EMULATOR = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR === '1';

export const isConfigured = () => USE_EMULATOR || !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL);
