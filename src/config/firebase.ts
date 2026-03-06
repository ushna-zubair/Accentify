import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Firebase configuration loaded from environment variables via app.json / eas.json.
 * In local development, values fall back to the `extra` block in app.json.
 *
 * To set up:
 *   1. Add your keys to app.json -> expo.extra (or use expo-dotenv / EAS secrets).
 *   2. Never commit raw API keys to version control.
 */
const extra = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: extra.FIREBASE_API_KEY ?? '',
  authDomain: extra.FIREBASE_AUTH_DOMAIN ?? '',
  projectId: extra.FIREBASE_PROJECT_ID ?? '',
  storageBucket: extra.FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: extra.FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: extra.FIREBASE_APP_ID ?? '',
  measurementId: extra.FIREBASE_MEASUREMENT_ID ?? '',
};

// Debug: verify config loaded (remove in production)
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn('[Firebase] Config missing! apiKey:', !!firebaseConfig.apiKey, 'projectId:', !!firebaseConfig.projectId,
    'expoConfig:', !!Constants.expoConfig, 'extra keys:', Object.keys(extra));
}

const app = initializeApp(firebaseConfig);

// Platform-aware auth initialization:
// Web → browserLocalPersistence  |  Native → AsyncStorage-backed persistence
import { initializeAuth, browserLocalPersistence } from 'firebase/auth';

let auth: ReturnType<typeof initializeAuth>;

if (Platform.OS === 'web') {
  auth = initializeAuth(app, { persistence: browserLocalPersistence });
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getReactNativePersistence: getRNPersistence } = require('firebase/auth');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  auth = initializeAuth(app, { persistence: getRNPersistence(AsyncStorage) });
}

export { auth };
export const db = getFirestore(app);

import { getStorage } from 'firebase/storage';
export const storage = getStorage(app);

export default app;
