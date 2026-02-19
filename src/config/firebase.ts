import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
