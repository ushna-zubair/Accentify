// ─── Auth / User Models ───
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'learner' | 'content_author' | 'admin';

export type AccountStatus = 'active' | 'deactivated' | 'suspended';

export type AuthProvider = 'email' | 'google' | 'apple';

export type TwoFactorMethod = 'email' | 'authenticator' | 'none';

/**
 * Unified Firestore `/users/{uid}` document.
 * This is the single source of truth for user data across the app.
 *
 * NOTE: Passwords are NEVER stored in Firestore. Firebase Auth handles
 * password hashing (scrypt) internally. The `appPin` is stored as a
 * bcrypt/SHA-256 hash — never in plaintext.
 */
export interface UserDocument {
  /** User's primary email (synced from Firebase Auth) */
  email: string;
  /** Authorization level */
  role: UserRole;
  /** How the account was created */
  authProvider: AuthProvider;
  /** 5-digit display ID for admin tables / search */
  shortId: string;
  /** Account lifecycle status */
  status: AccountStatus;
  /** Whether the onboarding flow has been completed */
  profileComplete: boolean;
  /** Whether user's email has been verified (mirrors Firebase Auth) */
  emailVerified: boolean;
  /** Agreed to Terms and Conditions during sign-up */
  termsAccepted: boolean;
  /** Server timestamp — when the document was first created */
  createdAt: Timestamp;
  /** Server timestamp — updated on every profile edit */
  updatedAt: Timestamp;
  /** ISO-8601 string — last successful sign-in */
  lastLoginAt: string | null;
  /** User-facing profile information */
  profile: {
    fullName: string;
    nickName: string;
    /** ISO-8601 date string (YYYY-MM-DD) */
    dateOfBirth: string;
    /** E.164 formatted phone number */
    phoneNumber: string;
    gender: string;
    /** Cloud Storage URL or empty string */
    profilePictureUrl: string;
    /** ISO country code (e.g. "PK", "US") */
    country: string;
    /** IANA timezone (e.g. "Asia/Karachi") */
    timeZone: string;
  };
  /** Security settings — sensitive values are hashed, never plaintext */
  security: {
    /** SHA-256 hash of the 4-digit app PIN, or null if not set */
    appPinHash: string | null;
    /** Whether biometric unlock is enabled */
    biometricsEnabled: boolean;
    /** Whether two-factor authentication is turned on */
    twoFactorEnabled: boolean;
    /** The 2FA delivery method when enabled */
    twoFactorMethod: TwoFactorMethod;
    /** ISO-8601 string — last password change via Firebase Auth */
    passwordChangedAt: string | null;
  };
  /** App-level preferences */
  preferences: {
    tutor_personality: string;
    accessibility_mode: boolean;
    cultural_context: boolean;
    /** Push notification opt-in */
    notificationsEnabled: boolean;
    /** Preferred app language code (e.g. "en") */
    appLanguage: string;
  };
  /** Learning configuration set during onboarding */
  studyPlan: {
    learningGoals: string[];
    nativeLanguage: string;
    englishLevel: string;
  };
}

/**
 * Lightweight projection used by AuthContext for quick role/name lookups.
 * Cast from Firestore data in `fetchUserRole`.
 */
export interface UserProfile {
  email: string;
  role: UserRole;
  status: AccountStatus;
  profileComplete: boolean;
  /** Resolved from nested `profile.fullName` or root `fullName` (backward compat) */
  fullName: string;
  createdAt?: Timestamp;
  /** Nested profile data from Firestore `users/{uid}.profile` */
  profile?: {
    fullName?: string;
    profilePictureUrl?: string;
  };
}

/**
 * Data collected across the multi-step onboarding screens
 * and passed to `completeOnboarding()`.
 */
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
    /** Raw PIN entered by user — will be hashed before storage */
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

/** Row data shown in the admin Manage Users table */
export interface ManagedUser {
  uid: string;
  /** 5-digit short numeric ID for display */
  userId: string;
  fullName: string;
  email: string;
  status: AccountStatus;
}

/**
 * Admin-facing user detail view.
 *
 * NOTE: No plaintext password field. Admins can trigger a password reset
 * via Cloud Function which updates Firebase Auth — the new password is
 * never stored in Firestore.
 */
export interface UserDetailData {
  uid: string;
  username: string;
  fullName: string;
  email: string;
  userId: string;
  status: AccountStatus;
  activeSince: string;
  role: UserRole;
  authProvider: AuthProvider;
  emailVerified: boolean;
  lastLoginAt: string | null;
  twoFactorEnabled: boolean;
  twoFactorMethod: TwoFactorMethod;
}
