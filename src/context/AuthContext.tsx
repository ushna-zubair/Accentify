import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export type UserRole = 'learner' | 'content_author' | 'admin';

export interface UserProfile {
  email: string;
  role: UserRole;
  fullName: string;
  profileComplete: boolean;
  createdAt?: any;
}

export interface OnboardingPayload {
  profile: {
    fullName: string;
    nickName: string;
    dateOfBirth: string;
    phoneNumber: string;
    gender: string;
    profilePictureUrl: string;
  };
  security: {
    appPin: string | null;
    biometricsEnabled: boolean;
    twoFactorEnabled: boolean;
  };
  studyPlan: {
    learningGoals: string[];
    nativeLanguage: string;
    englishLevel: string;
  };
}

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (uid: string): Promise<UserRole | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        setUserRole(data.role);
        setUserProfile(data);
        return data.role;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      // Only create the Firebase Auth account here
      // The full Firestore document is written at the end of onboarding via completeOnboarding()
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await fetchUserRole(result.user.uid);
    } catch (error) {
      throw error;
    }
  };

  // Called at the END of the multi-step onboarding to write the complete Firestore document
  const completeOnboarding = async (data: OnboardingPayload) => {
    if (!currentUser) throw new Error('No authenticated user found');

    // Write the COMPLETE user document — Document ID MUST match the Auth user.uid
    await setDoc(doc(db, 'users', currentUser.uid), {
      email: currentUser.email,
      role: 'learner' as UserRole, // CRITICAL: Default role must be learner
      createdAt: serverTimestamp(),
      termsAccepted: true, // From the Sign Up UI checkbox
      profile: {
        fullName: data.profile.fullName,
        nickName: data.profile.nickName,
        dateOfBirth: data.profile.dateOfBirth,   // Format: YYYY-MM-DD
        phoneNumber: data.profile.phoneNumber,
        gender: data.profile.gender,
        profilePictureUrl: data.profile.profilePictureUrl,
      },
      security: {
        appPin: data.security.appPin,
        biometricsEnabled: data.security.biometricsEnabled,
        twoFactorEnabled: data.security.twoFactorEnabled,
      },
      preferences: {
        tutor_personality: 'friendly coach',
        accessibility_mode: false,
        cultural_context: true,
      },
      studyPlan: {
        learningGoals: data.studyPlan.learningGoals,
        nativeLanguage: data.studyPlan.nativeLanguage,
        englishLevel: data.studyPlan.englishLevel,
      },
    });

    // Fetch role to update context state — triggers AppNavigator to show LearnerNavigator
    await fetchUserRole(currentUser.uid);
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUserRole(null);
      setUserProfile(null);
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserRole(user.uid);
      } else {
        setUserRole(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userRole,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
    fetchUserRole,
    completeOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
