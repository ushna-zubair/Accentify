/**
 * shared.ts — Shared primitive types and reusable shapes.
 *
 * Single source of truth for branded scalars, categorical unions,
 * and commonly-duplicated structures across the domain layer.
 *
 * Import from '../models' barrel — never import this file directly.
 */

// ═══════════════════════════════════════════════
//  BRANDED SCALAR TYPES
// ═══════════════════════════════════════════════

/**
 * ISO-8601 date-time string (e.g. "2026-03-08T14:30:00.000Z").
 * Used for all human-readable timestamp fields in the app layer.
 *
 * This is a branded type — at runtime it's just a `string`, but
 * at compile-time TypeScript distinguishes it from plain `string`.
 */
export type IsoDateString = string & { readonly __brand: 'IsoDateString' };

/**
 * Helper to cast a plain string to IsoDateString at trust boundaries
 * (e.g. when reading from Firestore, API responses).
 */
export const asIsoDate = (s: string): IsoDateString => s as IsoDateString;

// ═══════════════════════════════════════════════
//  LESSON CATEGORY (app-wide)
// ═══════════════════════════════════════════════

/**
 * The three lesson categories used across both learner and admin sides.
 * Previously defined only in admin.ts — now shared.
 */
export type LessonCategory = 'conversation' | 'pronunciation' | 'vocabulary';

export const LESSON_CATEGORY_LABELS: Record<LessonCategory, string> = {
  conversation: 'Conversation',
  pronunciation: 'Pronunciation',
  vocabulary: 'Vocabulary',
};

// ═══════════════════════════════════════════════
//  LESSON DIFFICULTY (app-wide)
// ═══════════════════════════════════════════════

export type LessonDifficulty = 'Easy' | 'Medium' | 'Challenging';

// ═══════════════════════════════════════════════
//  LEARNING GOALS
// ═══════════════════════════════════════════════

/**
 * Goals selected during onboarding (use-case / motivation goals).
 */
export type OnboardingGoal =
  | 'travel'
  | 'work'
  | 'social_media'
  | 'academics'
  | 'immigration'
  | 'career'
  | 'entertainment'
  | 'daily_life'
  | 'conversation'
  | 'exams';

/**
 * Goals shown in Profile Settings (skill-based goals).
 */
export type SkillGoal = 'Pronunciation' | 'Vocabulary' | 'Fluency';

/**
 * Union of all valid learning goal values that may appear in
 * `UserDocument.studyPlan.learningGoals` — covers onboarding
 * AND profile settings goals.
 */
export type LearningGoal = OnboardingGoal | SkillGoal;

// ═══════════════════════════════════════════════
//  SHARED USER SHAPES
// ═══════════════════════════════════════════════

/**
 * Core profile fields collected during onboarding and passed
 * through navigation params. The Firestore UserDocument.profile
 * extends this with `country` and `timeZone`.
 */
export interface UserProfileCore {
  fullName: string;
  nickName: string;
  /** ISO-8601 date string (YYYY-MM-DD) */
  dateOfBirth: string;
  /** E.164 formatted phone number */
  phoneNumber: string;
  gender: string;
  /** Cloud Storage URL or empty string */
  profilePictureUrl: string;
}

/**
 * Study plan collected across onboarding screens.
 * Used in navigation params, OnboardingPayload, and UserDocument.
 */
export interface StudyPlan {
  learningGoals: LearningGoal[];
  nativeLanguage: string;
  englishLevel: string;
}
