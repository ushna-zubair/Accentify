// ─── Auth / User Models ───
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'learner' | 'content_author' | 'admin';

/**
 * Unified Firestore `/users/{uid}` document.
 * This is the single source of truth for user data across the app.
 */
export interface UserDocument {
  email: string;
  role: UserRole;
  createdAt?: Timestamp;
  termsAccepted?: boolean;
  profile: {
    fullName: string;
    nickName: string;
    dateOfBirth: string;
    phoneNumber: string;
    gender: string;
    profilePictureUrl: string;
    country?: string;
    timeZone?: string;
  };
  security: {
    appPin: string | null;
    biometricsEnabled: boolean;
    twoFactorEnabled: boolean;
  };
  preferences: {
    tutor_personality: string;
    accessibility_mode: boolean;
    cultural_context: boolean;
  };
  studyPlan: {
    learningGoals: string[];
    nativeLanguage: string;
    englishLevel: string;
  };
}

/**
 * Lightweight projection used by AuthContext (backward-compatible).
 */
export interface UserProfile {
  email: string;
  role: UserRole;
  fullName: string;
  profileComplete: boolean;
  createdAt?: Timestamp;
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

// ─── User Management Models ───
export interface ManagedUser {
  uid: string;
  userId: string;     // short numeric ID shown in the table
  fullName: string;
  email: string;
}

export type AccountStatus = 'active' | 'deactivated';

export interface UserDetailData {
  uid: string;
  username: string;
  fullName: string;
  email: string;
  userId: string;
  password: string;
  status: AccountStatus;
  activeSince: string;
  role: 'admin' | 'learner' | 'content_author';
}
