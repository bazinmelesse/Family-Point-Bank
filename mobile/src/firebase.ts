import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase, type Database } from 'firebase/database';
import { Platform } from 'react-native';
import { FIREBASE_CONFIG, USE_EMULATOR } from './firebaseConfig';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;

const EMU_HOST = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
const EMU_PROJECT = 'demo-fpb';

/** Sets Firebase up once and returns the auth and database handles. */
export function fb() {
  if (app && auth && db) return { app, auth, db };
  const config = USE_EMULATOR
    ? { apiKey: 'demo-key', projectId: EMU_PROJECT, databaseURL: `http://${EMU_HOST}:9000?ns=${EMU_PROJECT}` }
    : FIREBASE_CONFIG;
  app = getApps()[0] || initializeApp(config);
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    // Keeps people signed in between launches on phones and tablets.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getReactNativePersistence } = require('firebase/auth') as { getReactNativePersistence: (s: typeof AsyncStorage) => Persistence };
    auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  }
  db = getDatabase(app);
  if (USE_EMULATOR) {
    connectAuthEmulator(auth, `http://${EMU_HOST}:9099`, { disableWarnings: true });
    connectDatabaseEmulator(db, EMU_HOST, 9000);
  }
  return { app, auth, db };
}

/** The public, read-only address the old-iPad web board reads with ?src= */
export function boardUrl(boardKey: string) {
  const base = USE_EMULATOR ? `http://${EMU_HOST}:9000` : FIREBASE_CONFIG.databaseURL.replace(/\/+$/, '');
  return `${base}/boards/${boardKey}.json${USE_EMULATOR ? `?ns=${EMU_PROJECT}` : ''}`;
}
