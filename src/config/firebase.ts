import { initializeApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence is exported via the react-native condition in firebase/auth
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyADW4-QogGi0N3pq_V8OPFZndSICCJ5YpM",
  authDomain: "accentify-capstone.firebaseapp.com",
  projectId: "accentify-capstone",
  storageBucket: "accentify-capstone.firebasestorage.app",
  messagingSenderId: "104124924088",
  appId: "1:104124924088:web:cab0cca9dbb1f2e4de344d",
  measurementId: "G-Z33LPZ97MT"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const db = getFirestore(app);

export default app;
