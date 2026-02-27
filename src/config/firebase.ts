import { initializeApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence is exported via the react-native condition in firebase/auth
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
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

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const db = getFirestore(app);

export default app;
