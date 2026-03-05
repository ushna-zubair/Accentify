import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Platform, Alert } from 'react-native';
import { auth, db } from '../config/firebase';
import { UserRole, UserProfile, OnboardingPayload, AccountStatus } from '../models';
import { recordDeviceSession } from '../services/deviceService';

// Re-export for backward compatibility
export type { UserRole, UserProfile, OnboardingPayload };

interface AuthContextType {
  currentUser: User | null;
  userRole: UserRole | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchUserRole: (uid: string) => Promise<UserRole | null>;
  completeOnboarding: (data: OnboardingPayload) => Promise<void>;
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
  signInWithApple: () => Promise<{ isNewUser: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hash a 4-digit PIN using SHA-256 so it's never stored in plaintext.
 * Uses the Web Crypto API (available in RN Hermes & web).
 */
async function hashPin(pin: string): Promise<string> {
  try {
    const Crypto = await import('expo-crypto');
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin,
    );
  } catch {
    // Fallback: basic hash for environments without expo-crypto
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `sha256_fallback_${Math.abs(hash).toString(16)}`;
  }
}

/** Generate a 5-digit numeric short ID. */
function generateShortId(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = useCallback(async (uid: string): Promise<UserRole | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const role = data.role as UserRole;
        setUserRole(role);
        setUserProfile({
          email: data.email ?? '',
          role,
          status: (data.status as AccountStatus) ?? 'active',
          profileComplete: data.profileComplete ?? false,
          fullName: data.profile?.fullName ?? data.fullName ?? '',
          createdAt: data.createdAt,
        });
        return role;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      // Only create the Firebase Auth account here
      // The full Firestore document is written at the end of onboarding via completeOnboarding()
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Update lastLoginAt on the Firestore doc
      updateDoc(doc(db, 'users', result.user.uid), {
        lastLoginAt: new Date().toISOString(),
      }).catch(() => {}); // non-blocking
      await fetchUserRole(result.user.uid);
    } catch (error) {
      throw error;
    }
  }, [fetchUserRole]);

  // Called at the END of the multi-step onboarding to write the complete Firestore document
  const completeOnboarding = useCallback(async (data: OnboardingPayload) => {
    if (!currentUser) throw new Error('No authenticated user found');

    // Hash the PIN before storing — NEVER store plaintext PINs
    let appPinHash: string | null = null;
    if (data.security.appPin) {
      appPinHash = await hashPin(data.security.appPin);
    }

    const shortId = generateShortId();

    // Write the COMPLETE user document — Document ID MUST match the Auth user.uid
    await setDoc(doc(db, 'users', currentUser.uid), {
      email: currentUser.email,
      role: 'learner' as UserRole,
      authProvider: 'email',
      shortId,
      status: 'active',
      profileComplete: true,
      emailVerified: currentUser.emailVerified ?? false,
      termsAccepted: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: new Date().toISOString(),
      profile: {
        fullName: data.profile.fullName,
        nickName: data.profile.nickName,
        dateOfBirth: data.profile.dateOfBirth,
        phoneNumber: data.profile.phoneNumber,
        gender: data.profile.gender,
        profilePictureUrl: data.profile.profilePictureUrl,
        country: '',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
      },
      security: {
        appPinHash,
        biometricsEnabled: data.security.biometricsEnabled,
        twoFactorEnabled: data.security.twoFactorEnabled,
        twoFactorMethod: data.security.twoFactorEnabled ? 'email' : 'none',
        passwordChangedAt: null,
      },
      preferences: {
        tutor_personality: 'friendly coach',
        accessibility_mode: false,
        cultural_context: true,
        notificationsEnabled: true,
        appLanguage: 'en',
      },
      studyPlan: {
        learningGoals: data.studyPlan.learningGoals,
        nativeLanguage: data.studyPlan.nativeLanguage,
        englishLevel: data.studyPlan.englishLevel,
      },
    });

    // Fetch role to update context state — triggers AppNavigator to show LearnerNavigator
    await fetchUserRole(currentUser.uid);
  }, [currentUser, fetchUserRole]);

  /**
   * Google Sign-In: authenticates with Google then links to Firebase.
   * Returns { isNewUser: true } when no Firestore doc exists yet (→ onboarding).
   */
  const signInWithGoogle = useCallback(async (): Promise<{ isNewUser: boolean }> => {
    let GoogleSignin: any;
    let statusCodes: any;

    try {
      const googleSigninModule = await import('@react-native-google-signin/google-signin');
      GoogleSignin = googleSigninModule.GoogleSignin;
      statusCodes = googleSigninModule.statusCodes;

      GoogleSignin.configure({
        webClientId: '104124924088-xxx.apps.googleusercontent.com', // Replace with your actual web client ID
        offlineAccess: true,
      });
    } catch {
      Alert.alert(
        'Google Sign-In unavailable',
        'Google Sign-In is not available in Expo Go. Use a development build or sign in with email.'
      );
      throw new Error('Google Sign-In not available');
    }

    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();

    if (!userInfo.data?.idToken) {
      throw new Error('Failed to get ID token from Google');
    }

    const credential = GoogleAuthProvider.credential(userInfo.data.idToken);
    const result = await signInWithCredential(auth, credential);

    // Check if user already has a Firestore profile
    const userRef = doc(db, 'users', result.user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      await fetchUserRole(result.user.uid);
      return { isNewUser: false };
    }

    // New user — caller should navigate to onboarding
    return { isNewUser: true };
  }, [fetchUserRole]);

  /**
   * Apple Sign-In: authenticates with Apple then links to Firebase.
   * Only available on iOS 13+.
   */
  const signInWithApple = useCallback(async (): Promise<{ isNewUser: boolean }> => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Unavailable', 'Apple Sign-In is only available on iOS devices.');
      throw new Error('Apple Sign-In not available on this platform');
    }

    let AppleAuthentication: any;
    let Crypto: any;

    try {
      AppleAuthentication = await import('expo-apple-authentication');
      Crypto = await import('expo-crypto');
    } catch {
      Alert.alert('Unavailable', 'Apple Sign-In packages are not installed.');
      throw new Error('Apple Sign-In packages not available');
    }

    // Generate a nonce for security
    const rawNonce = Math.random().toString(36).substring(2, 10);
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!appleCredential.identityToken) {
      throw new Error('Failed to get identity token from Apple');
    }

    const provider = new OAuthProvider('apple.com');
    const oauthCredential = provider.credential({
      idToken: appleCredential.identityToken,
      rawNonce,
    });

    const result = await signInWithCredential(auth, oauthCredential);

    // Check if user already has a Firestore profile
    const userRef = doc(db, 'users', result.user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      await fetchUserRole(result.user.uid);
      return { isNewUser: false };
    }

    // New user — caller should navigate to onboarding
    return { isNewUser: true };
  }, [fetchUserRole]);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setUserRole(null);
      setUserProfile(null);
    } catch (error) {
      throw error;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserRole(user.uid);
        // Record this device in the user's device sessions
        recordDeviceSession(user.uid).catch(() => {});
      } else {
        setUserRole(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    currentUser,
    userRole,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
    fetchUserRole,
    completeOnboarding,
    signInWithGoogle,
    signInWithApple,
  }), [currentUser, userRole, userProfile, loading, signUp, signIn, signOut, fetchUserRole, completeOnboarding, signInWithGoogle, signInWithApple]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
