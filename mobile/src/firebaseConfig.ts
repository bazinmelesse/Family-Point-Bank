/**
 * The Firebase project every family's data lives in.
 * Copy these values from Firebase console → Project settings → Your apps → Web app.
 * They are meant to be public; the database rules (firebase-rules.json) are what keep each family's data private.
 */
export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

/** For local testing against the Firebase emulators: set EXPO_PUBLIC_FIREBASE_EMULATOR=1 before `npx expo start`. */
export const USE_EMULATOR = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR === '1';

export const isConfigured = () => USE_EMULATOR || !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL);
