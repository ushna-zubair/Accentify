/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Manan Anghan
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const firebaseConfig = {
  apiKey: extra.FIREBASE_API_KEY ?? '',
  authDomain: extra.FIREBASE_AUTH_DOMAIN ?? '',
  projectId: extra.FIREBASE_PROJECT_ID ?? '',
  storageBucket: extra.FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: extra.FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: extra.FIREBASE_APP_ID ?? '',
  measurementId: extra.FIREBASE_MEASUREMENT_ID ?? '',
};

// Debug: verify config loaded (only in development)
if (__DEV__ && (!firebaseConfig.apiKey || !firebaseConfig.projectId)) {
  console.warn(
    '[Firebase] Config missing! apiKey:',
    !!firebaseConfig.apiKey,
    'projectId:',
    !!firebaseConfig.projectId,
    'expoConfig:',
    !!Constants.expoConfig,
    'extra keys:',
    Object.keys(extra),
  );
}

const app = initializeApp(firebaseConfig);
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

let db: ReturnType<typeof getFirestore>;
if (Platform.OS === 'web') {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    db = getFirestore(app);
  }
} else {
  // Native (React Native): the Firebase JS SDK probes IndexedDB whenever
  // initializeFirestore receives any localCache option — even
  // memoryLocalCache() — and logs the "missing IndexedDB" warning every
  // launch. Skip initializeFirestore entirely; getFirestore returns an
  // in-memory cache by default with no IndexedDB probe at all.
  db = getFirestore(app);
}
export { db };

import { getStorage } from 'firebase/storage';
export const storage = getStorage(app);

export default app;
