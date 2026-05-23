# 🎙️ Accentify — AI-Powered Accent & English Learning App

> **Final Year Project** | React Native (Expo) · Firebase · Google Cloud Speech-to-Text

Accentify is a cross-platform mobile application (Android, iOS, Web) that helps learners improve their English pronunciation, vocabulary, and conversational fluency using AI-driven speech recognition and personalized study paths.

---

## 📑 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Functional Requirements & Implementation](#functional-requirements--implementation)
   - [FR-01 User Registration & Authentication](#fr-01-user-registration--authentication)
   - [FR-02 Multi-Step Onboarding](#fr-02-multi-step-onboarding)
   - [FR-03 Pronunciation Exercise](#fr-03-pronunciation-exercise)
   - [FR-04 Vocabulary Exercise](#fr-04-vocabulary-exercise)
   - [FR-05 Conversation Exercise](#fr-05-conversation-exercise)
   - [FR-06 Progress Tracking & Analytics](#fr-06-progress-tracking--analytics)
   - [FR-07 AI Tutor & Study Path](#fr-07-ai-tutor--study-path)
   - [FR-08 Security — 2FA, PIN & Biometrics](#fr-08-security--2fa-pin--biometrics)
   - [FR-09 Profile & App Preferences](#fr-09-profile--app-preferences)
   - [FR-10 Notifications](#fr-10-notifications)
   - [FR-11 Admin Dashboard](#fr-11-admin-dashboard)
   - [FR-12 User Management (Admin)](#fr-12-user-management-admin)
   - [FR-13 Lesson / Content Management (Admin)](#fr-13-lesson--content-management-admin)
   - [FR-14 Feedback & Reports (Admin)](#fr-14-feedback--reports-admin)
   - [FR-15 Support Tickets & System Logs (Admin)](#fr-15-support-tickets--system-logs-admin)
   - [FR-16 Admin Access Control & Role Management](#fr-16-admin-access-control--role-management)
   - [FR-17 Announcements](#fr-17-announcements)
   - [FR-18 Insights / Analytics (Admin)](#fr-18-insights--analytics-admin)
5. [Project Structure](#project-structure)
6. [Getting Started](#getting-started)
7. [Running the App](#running-the-app)
8. [Environment Setup](#environment-setup)
9. [Database Schema (Firestore)](#database-schema-firestore)

---

## Project Overview

Accentify solves a real problem faced by non-native English speakers: they lack affordable, personalized, and real-time pronunciation coaching. The app provides:

- **AI-graded pronunciation exercises** — powered by Google Cloud Speech-to-Text
- **Vocabulary building** with phonetic feedback per word
- **Role-play conversation exercises** against an AI partner
- **Streak-based progress tracking** with weekly performance charts
- **Role-based access** — Learner + Admin panels in one codebase

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | React Native 0.81 + Expo SDK 54 |
| **Language** | TypeScript 5.9 |
| **Navigation** | React Navigation 7 (Stack + Bottom Tabs) |
| **Backend / DB** | Firebase Firestore (NoSQL) |
| **Authentication** | Firebase Auth (Email, Google, Apple) |
| **Cloud Functions** | Firebase Cloud Functions (Node.js) |
| **AI / Speech** | Google Cloud Speech-to-Text (via Cloud Functions) |
| **Storage** | Firebase Cloud Storage (profile pictures, audio) |
| **State Management** | React Context API |
| **Testing** | Jest + jest-expo |
| **Linting** | ESLint + Prettier |

---

## Architecture Overview

The project follows **MVC (Model-View-Controller)** architecture adapted for React Native:

```
App.tsx
│
├── src/models/          ← TypeScript interfaces & types (data shapes)
├── src/views/           ← UI screens (what the user sees)
│   ├── auth/            ← Login, SignUp, Onboarding screens
│   ├── main/            ← Learner home, exercises, progress
│   └── admin/           ← Admin dashboard and management screens
├── src/controllers/     ← Business logic hooks (useXyzController.ts)
├── src/services/        ← Firebase & API calls
├── src/context/         ← Global state (AuthContext, ThemeContext)
├── src/navigation/      ← Route definitions
├── src/hooks/           ← Shared React hooks
├── src/theme/           ← Colors, typography, spacing
└── functions/           ← Firebase Cloud Functions (server-side)
```

**Data Flow:**
```
View (Screen) → Controller Hook → Service → Firebase / Cloud API
```

---

## Functional Requirements & Implementation

---

### FR-01 User Registration & Authentication

**What it does:**
Users can create an account using Email/Password, Google Sign-In, or Apple Sign-In. After sign-up, the user's email must be verified before they can access the app.

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/auth/SignUpScreen.tsx` | Registration form UI |
| `src/views/auth/LoginScreen.tsx` | Login form UI |
| `src/views/auth/EmailVerificationScreen.tsx` | Email verification waiting screen |
| `src/views/auth/OTPVerificationScreen.tsx` | OTP input for 2FA login |
| `src/views/auth/TwoFactorAuthScreen.tsx` | 2FA code entry screen |
| `src/context/AuthContext.tsx` | Global auth state — stores `currentUser`, `userRole`, and `loading` |
| `src/services/signUpVerificationService.ts` | Sends/checks email verification link |
| `src/services/twoFactorService.ts` | Generates and verifies OTP codes |
| `src/models/auth.ts` | `UserDocument`, `UserProfile`, `AuthProvider` types |
| `firestore.rules` | Security rules: only verified users can read their own data |

**Key logic:**
- Firebase Auth handles password hashing (scrypt) — passwords are **never stored in Firestore**
- On sign-up, a `users/{uid}` document is created in Firestore with `profileComplete: false`
- `AppNavigator.tsx` reads `userRole` from `AuthContext` and routes to Auth, Learner, or Admin navigator accordingly

---

### FR-02 Multi-Step Onboarding

**What it does:**
After email verification, new users are walked through a multi-step setup: create profile → set learning goals → choose native language → choose English level → set security (PIN, biometrics, 2FA).

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/auth/OnboardingScreen.tsx` | Welcome / introductory splash |
| `src/views/auth/CreateProfileScreen.tsx` | Name, DOB, phone, gender, photo upload |
| `src/views/auth/LearningGoalsScreen.tsx` | User selects learning goals (e.g., "Travel", "Business") |
| `src/views/auth/NativeLanguageScreen.tsx` | Country picker for native language |
| `src/views/auth/EnglishLevelScreen.tsx` | Learner self-rates A1–C2 English level |
| `src/views/auth/SetupPinScreen.tsx` | 4-digit app PIN setup |
| `src/views/auth/SetYourFingerprintScreen.tsx` | Fingerprint biometric setup |
| `src/views/auth/SetupFaceIDScreen.tsx` | Face ID biometric setup |
| `src/views/auth/ChooseVerificationMethodScreen.tsx` | Choose 2FA method (email / authenticator) |
| `src/views/auth/SetupAuthenticatorScreen.tsx` | TOTP authenticator app setup |
| `src/models/auth.ts` | `OnboardingPayload` type contains all onboarding data |
| `src/services/deviceService.ts` | Registers device ID on first install |

**Key logic:**
- All onboarding data is batched into an `OnboardingPayload` object and written to Firestore in a single call when the last step completes
- `profileComplete` flag is set to `true` on completion; the navigator detects this and redirects to the main app

---

### FR-03 Pronunciation Exercise

**What it does:**
The learner reads a sentence aloud. The app records audio, sends it to Google Cloud Speech-to-Text via a Cloud Function, and returns a scored result — highlighting which words were correct/incorrect plus scores for clarity, accuracy, fluency, and overall.

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/main/PronunciationExerciseScreen.tsx` | Exercise UI — waveform, record button, word-by-word feedback |
| `src/views/main/HomePronunciationScreen.tsx` | Home entry point with practice sentence cards |
| `src/controllers/usePronunciationExerciseController.ts` | Manages recording state, calls service, parses results |
| `src/services/pronunciationService.ts` | Calls `getPronunciationSentences` and `transcribeAndEvaluate` Cloud Functions |
| `src/models/lessons.ts` | `PronunciationSentence`, `PronunciationScore`, `WordResult`, `PronunciationAttemptResult` types |
| `functions/src/` | `transcribeAndEvaluate` — sends audio to Google STT, scores result |
| `functions/src/` | `getPronunciationSentences` — fetches sentences from Firestore |

**Key logic:**
- Audio is recorded using `expo-av` in HIGH_QUALITY preset (AAC/m4a on iOS, AMR-WB on Android)
- Audio is converted to Base64 and sent to the Cloud Function
- The Cloud Function calls Google Speech-to-Text with LINEAR16 encoding at 44100 Hz
- Word-level `isCorrect` flags are returned and displayed with colour coding
- Scores (0–100) for `clarity`, `accuracy`, `fluency`, `overall` are stored in Firestore via `progressService`

---

### FR-04 Vocabulary Exercise

**What it does:**
The learner is shown pairs of words (basic ↔ advanced). They listen to pronunciation, practice saying each word, and get per-word phonetic feedback using the same STT pipeline.

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/main/VocabExerciseScreen.tsx` | Flashcard-style UI with audio controls and pronunciation feedback |
| `src/controllers/useVocabExerciseController.ts` | Card navigation, audio recording, STT evaluation |
| `src/models/lessons.ts` | `VocabWordPair`, `VocabExerciseData`, `SpeechRecognitionResult` types |
| `src/services/lessonService.ts` | Fetches vocab word pairs for a given lesson from Firestore |

**Key logic:**
- Each `VocabWordPair` has `basicWord`, `vocabWord`, phonetics for both, definitions, and an example sentence
- The learner records themselves saying both words; each gets separate `isCorrect` and feedback
- On completion, `progressService.onExerciseComplete('vocab', ...)` is called to update streak and weekly stats

---

### FR-05 Conversation Exercise

**What it does:**
A scripted role-play scenario between the learner and an AI partner. Each turn, the learner speaks their line, which is recorded and evaluated. The AI partner's lines are played as audio. Metrics (fluency, vocabulary, grammar, turn-taking) are scored at the end.

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/main/ConversationExerciseScreen.tsx` | Chat-style UI with audio bubbles, timer, and turn indicator |
| `src/controllers/useConversationExerciseController.ts` | Turn state machine, recording, playback, scoring |
| `src/models/lessons.ts` | `ConversationTurn`, `ConversationScenario`, `ConversationMetricsResult` types |
| `src/models/progress.ts` | `ConversationMetrics` (fluency, vocabulary, grammarUsage, turnTaking) |
| `src/services/lessonService.ts` | Fetches conversation scenarios from Firestore |

**Key logic:**
- `ConversationScenario` has a `turns` array; each turn tracks `speaker`, `text`, `audioUri`, `completed`
- The app has a configurable time limit (`timeLimitSeconds`) — a countdown timer is shown
- Background noise and crowd chatter can be toggled to simulate real-world conversation environments
- Final metrics are stored via `progressService.recordConversationActivity()`

---

### FR-06 Progress Tracking & Analytics

**What it does:**
The learner sees their daily streak, a 7-day lesson calendar, and weekly performance charts for pronunciation, conversation, and vocabulary growth. Data is aggregated from daily exercise completions.

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/main/ProgressScreen.tsx` | Full progress dashboard with charts and streak display |
| `src/controllers/useProgressController.ts` | Fetches and formats progress data for the view |
| `src/services/progressService.ts` | All Firestore progress writes and reads, streak logic, weekly aggregation |
| `src/models/progress.ts` | `ProgressData`, `WeeklyProgress`, `PronunciationMetrics`, `ConversationMetrics`, `LessonDay` |

**Firestore layout used by this feature:**
```
users/{uid}/progress/streak          → dayStreak, longestStreak, lastActiveDate
users/{uid}/progress/daily/entries/{YYYY-MM-DD} → per-day exercise counts & scores
users/{uid}/progress/weekly/entries/week-{YYYY}-{WW} → aggregated weekly metrics
```

**Key logic:**
- `updateStreak()` runs a Firestore transaction — increments streak if last active yesterday, resets if gap ≥ 2 days
- `aggregateWeek()` reads all 7 daily docs for the week and averages pronunciation/conversation scores
- `onExerciseComplete()` is the single entry point called by all three exercise controllers — updates streak + daily + weekly + admin analytics in one call

---

### FR-07 AI Tutor & Study Path

**What it does:**
The Tutor tab shows a personalised study path — an ordered list of lessons (Pronunciation → Vocabulary → Conversation) with difficulty levels. The learner sees their recent lessons and can resume or start new ones.

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/main/TutorScreen.tsx` | Tutor home with study path list and stats |
| `src/views/main/LessonDetailScreen.tsx` | Lesson detail — description, focus tips, start button |
| `src/views/main/CourseCompletionScreen.tsx` | Celebration screen after completing a lesson |
| `src/views/main/WavyChatScreen.tsx` | AI chat assistant screen |
| `src/controllers/useTutorController.ts` | Loads study path and recent lessons |
| `src/controllers/useLessonDetailController.ts` | Loads lesson metadata and starts exercise |
| `src/controllers/useWavyChatController.ts` | AI chat message handling |
| `src/services/lessonService.ts` | Fetches lessons and their status from Firestore |
| `src/models/lessons.ts` | `TutorLesson`, `TutorScreenData`, `LessonDetailData` types |

**Key logic:**
- Each lesson has `category` (pronunciation/vocabulary/conversation), `difficulty` (Easy/Medium/Challenging), and `order`
- Lesson `status` (completed/in_progress/upcoming) is merged from the learner's progress subcollection
- Prerequisites system: a lesson can specify `prerequisites` — IDs of lessons that must be completed first

---

### FR-08 Security — 2FA, PIN & Biometrics

**What it does:**
Users can secure their account with a 4-digit app PIN, fingerprint, or Face ID unlock, and optionally enable Two-Factor Authentication (email OTP or authenticator app TOTP).

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/main/TwoFactorSettingsScreen.tsx` | Enable/disable 2FA, switch method |
| `src/views/auth/SetupPinScreen.tsx` | PIN entry and confirm |
| `src/views/auth/SetYourFingerprintScreen.tsx` | Biometric enrollment |
| `src/views/auth/SetupFaceIDScreen.tsx` | Face ID enrollment |
| `src/services/twoFactorService.ts` | Send OTP email, verify OTP |
| `src/services/passwordResetService.ts` | Forgot password flow |
| `src/controllers/useProfileSettingsController.ts` | Manages security settings changes |
| `src/models/auth.ts` | `security` object in `UserDocument` — `appPinHash`, `biometricsEnabled`, `twoFactorEnabled`, `twoFactorMethod` |

**Key logic:**
- The 4-digit app PIN is hashed with SHA-256/bcrypt before being stored in Firestore — **never stored in plaintext**
- Biometric auth uses `expo-local-authentication`
- 2FA OTP is delivered via email (Firebase Cloud Function) or TOTP authenticator app (RFC 6238)
- `passwordChangedAt` timestamp is tracked for security audit

---

### FR-09 Profile & App Preferences

**What it does:**
Users can update their profile picture, name, phone number, date of birth, and gender. They can also choose app theme (Light/Dark), app language, tutor personality, and toggle accessibility mode.

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/main/ProfileSettingsScreen.tsx` | Edit profile form with image picker |
| `src/views/main/SettingsScreen.tsx` | Settings menu |
| `src/views/main/AppPreferenceScreen.tsx` | Theme, language, tutor personality toggles |
| `src/views/main/AccessibilityScreen.tsx` | Accessibility mode settings |
| `src/controllers/useProfileSettingsController.ts` | Save profile changes to Firestore & Storage |
| `src/context/AppPreferenceContext.tsx` | Global theme state |
| `src/context/AccessibilityContext.tsx` | Global accessibility state |
| `src/services/accessControlService.ts` | Permission checks before writes |
| `src/models/auth.ts` | `preferences` and `profile` objects in `UserDocument` |

**Key logic:**
- Profile pictures are uploaded to Firebase Cloud Storage; only the URL is saved in Firestore
- Theme preference is persisted in `AsyncStorage` so it survives app restarts
- `AppPreferenceContext` provides `theme` (`'Light' | 'Dark'`) consumed by `ThemedStatusBar` in `App.tsx`

---

### FR-10 Notifications

**What it does:**
Users receive push notifications for learning reminders. Users can view past notifications and toggle push permission.

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/main/NotificationsScreen.tsx` | Notification list UI |
| `src/controllers/useNotificationController.ts` | Fetches notifications from Firestore |
| `src/models/auth.ts` | `preferences.notificationsEnabled` flag |

---

### FR-11 Admin Dashboard

**What it does:**
Admins see a real-time overview of platform health: active users, session counts, pronunciation/fluency/vocabulary accuracy averages, top learners, weekly bar charts, and practice time distribution (morning/afternoon/night).

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/admin/AdminDashboardScreen.tsx` | Full dashboard UI with charts, stats cards, top learners |
| `src/controllers/useAdminDashboardController.ts` | Loads `DashboardData` from Firestore |
| `src/services/adminService.ts` | `incrementSessionCounter()`, `recordPracticeTime()` — called after each exercise |
| `src/models/admin.ts` | `DashboardData`, `TopLearner`, `AdminMobileDashboardData` types |

**Key logic:**
- `progressService.onExerciseComplete()` calls `adminService.incrementSessionCounter()` automatically after every completed exercise
- `recordPracticeTime(hour)` bins activity into morning (5–11), afternoon (12–17), night (18–23) slots
- Dashboard data is stored in a shared `analytics/dashboard` Firestore document updated incrementally

---

### FR-12 User Management (Admin)

**What it does:**
Admins can view all registered learners, search/filter by name or status, view individual user details (login history, 2FA status, active devices), and activate/deactivate/suspend accounts.

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/admin/AdminUserManagementScreen.tsx` | Searchable user table |
| `src/views/admin/AdminUserDetailScreen.tsx` | Full user detail page with action buttons |
| `src/controllers/useUserManagementController.ts` | Loads and filters user list |
| `src/controllers/useUserDetailController.ts` | Loads individual user + actions |
| `src/controllers/useLoginDevicesController.ts` | Shows trusted login devices for a user |
| `src/views/main/LoginDevicesScreen.tsx` | Device management UI |
| `src/services/deviceService.ts` | Registers/reads device info from Firestore |
| `src/models/auth.ts` | `ManagedUser`, `UserDetailData`, `AccountStatus` types |

**Key logic:**
- `AccountStatus` can be `'active' | 'deactivated' | 'suspended'`
- Each user can have multiple login devices tracked under `users/{uid}/devices/`
- Admins can trigger a password reset via a Cloud Function — the new password is never stored in Firestore

---

### FR-13 Lesson / Content Management (Admin)

**What it does:**
Admins (with `manageLessons` permission) can create, edit, publish, archive, and delete lessons. They configure lesson metadata, vocabulary word pairs, pronunciation sentences, focus tips, prerequisites, and passing scores.

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/admin/AdminManageLessonsScreen.tsx` | Lesson list with tabs (All / Published / Draft / Archived) |
| `src/controllers/useManageLessonsController.ts` | CRUD operations for lessons |
| `src/services/lessonService.ts` | Firestore reads/writes for lesson documents |
| `src/models/admin.ts` | `AdminLesson`, `AdminLessonFormData`, `AdminVocabPairForm`, `AdminLessonStats` types |
| `src/models/lessons.ts` | Learner-facing `TutorLesson`, `LessonDetailData` types |

**Key logic:**
- Lessons have `status: 'published' | 'draft' | 'archived'` — only published lessons appear in the learner's study path
- Vocabulary lessons embed `vocabPairs` array directly in the lesson document
- `enrolledCount` and `completedCount` are tracked per lesson for admin analytics
- `maxAttempts: 0` means unlimited retries

---

### FR-14 Feedback & Reports (Admin)

**What it does:**
Learners can submit feedback (bug report, feature request, content issue, etc.). Admins can view, filter, prioritise, assign, respond to, and close feedback tickets.

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/admin/AdminFeedbackReportsScreen.tsx` | Feedback list with status tabs and detail panel |
| `src/controllers/useFeedbackReportsController.ts` | Load, filter, and update feedback items |
| `src/services/feedbackService.ts` | Firestore read/write for feedback collection |
| `src/models/admin.ts` | `FeedbackItem`, `FeedbackStats`, `FeedbackCategory`, `FeedbackStatus`, `FeedbackPriority` types |

**Key logic:**
- Feedback has priority levels: `critical | high | medium | low`
- Status lifecycle: `open → in_progress → resolved → closed → archived`
- Admins can add internal `adminNotes` and a public `responseMessage` sent back to the user
- `avgResolutionHours` and `satisfactionRate` are included in `FeedbackStats`

---

### FR-15 Support Tickets & System Logs (Admin)

**What it does:**
Learners can raise support tickets. Admins handle tickets (assign, respond, resolve). System-level logs (auth events, Firestore errors, Cloud Function calls) are viewable in a filterable log viewer.

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/admin/AdminSupportLogsScreen.tsx` | Support tickets list + system log viewer |
| `src/controllers/useSupportLogsController.ts` | Load and manage tickets and logs |
| `src/services/supportService.ts` | Firestore operations for tickets and logs |
| `src/models/admin.ts` | `SupportTicket`, `SupportStats`, `SystemLog`, `SystemLogLevel`, `SystemLogSource` types |

**Key logic:**
- Ticket categories: `account | billing | technical | content | feature_request | other`
- System log sources: `auth | firestore | functions | storage | admin | system`
- Log levels: `info | warning | error | debug`
- `avgResponseHours` metric is tracked for SLA monitoring

---

### FR-16 Admin Access Control & Role Management

**What it does:**
Admins can be assigned one of four roles: `super_admin`, `admin`, `moderator`, or `viewer`. Each role has a default set of permissions which can be customised per admin. New admins are invited by email.

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/admin/AdminAccessControlScreen.tsx` | Admin member list and permission editor |
| `src/controllers/useAccessControlController.ts` | Invite, edit, suspend admin members |
| `src/services/accessControlService.ts` | Firestore operations for admin member documents |
| `src/models/admin.ts` | `AdminRole`, `AdminPermissions`, `AdminMember`, `DEFAULT_ROLE_PERMISSIONS`, `PERMISSION_LABELS` |
| `firestore.rules` | Enforces role-based read/write rules at database level |

**Permission matrix:**

| Permission | super_admin | admin | moderator | viewer |
|---|:---:|:---:|:---:|:---:|
| Manage Users | ✅ | ✅ | ✅ | ❌ |
| Manage Lessons | ✅ | ✅ | ❌ | ❌ |
| Manage Announcements | ✅ | ✅ | ✅ | ❌ |
| View Analytics | ✅ | ✅ | ✅ | ✅ |
| Manage Admins | ✅ | ❌ | ❌ | ❌ |
| View Logs | ✅ | ✅ | ❌ | ❌ |

---

### FR-17 Announcements

**What it does:**
Admins can post announcements that appear on the admin dashboard and are broadcast to all users.

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/admin/AdminAnnouncementsScreen.tsx` | Create/read announcements UI |
| `src/controllers/useAnnouncementsController.ts` | Loads and creates announcements in Firestore |
| `src/models/admin.ts` | `Announcement` type (`id`, `title`, `body`, `createdAt`, `createdBy`) |

---

### FR-18 Insights / Analytics (Admin)

**What it does:**
Admins can drill into per-user learning insights — current English level (A1–C2), weekly pronunciation/conversation charts, vocabulary growth trends, and lesson day calendar.

**How it is implemented:**

| File | Role |
|---|---|
| `src/views/admin/AdminInsightsScreen.tsx` | Insights dashboard UI |
| `src/controllers/useInsightsController.ts` | Loads `InsightsUserData` for selected user |
| `src/models/progress.ts` | `InsightsUserData`, `EnglishLevel` type |

---

## Project Structure

```
Accentify/
├── App.tsx                        # App entry point, provider tree, font loading
├── index.ts                       # Expo entry (registers root component)
├── app.json                       # Expo configuration
├── firebase.json                  # Firebase project config
├── firestore.rules                # Firestore security rules
├── storage.rules                  # Firebase Storage security rules
├── firestore.indexes.json         # Composite index definitions
│
├── functions/                     # Firebase Cloud Functions (server-side)
│   ├── src/                       # TypeScript source for functions
│   └── SETUP.md                   # Functions setup guide
│
├── src/
│   ├── config/
│   │   └── firebase.ts            # Firebase app initialisation
│   │
│   ├── context/
│   │   ├── AuthContext.tsx         # Current user, role, loading state
│   │   ├── AppPreferenceContext.tsx # Theme (Light/Dark), app language
│   │   ├── AccessibilityContext.tsx # Accessibility mode toggle
│   │   └── TabBarVisibilityContext.tsx # Hides tab bar during exercises
│   │
│   ├── models/
│   │   ├── auth.ts                # User, profile, onboarding types
│   │   ├── lessons.ts             # Lesson, exercise, vocab, conversation types
│   │   ├── progress.ts            # Progress, streak, weekly metrics types
│   │   ├── admin.ts               # Admin dashboard, access control, feedback types
│   │   ├── navigation.ts          # Navigation param list types
│   │   └── settings.ts            # Settings screen types
│   │
│   ├── views/
│   │   ├── auth/                  # 18 auth & onboarding screens
│   │   ├── main/                  # 18 main app screens (exercises, progress, settings)
│   │   └── admin/                 # 9 admin panel screens
│   │
│   ├── controllers/               # 20 business logic hooks (one per screen/feature)
│   ├── services/                  # 11 Firebase/API service modules
│   ├── navigation/                # AppNavigator + SettingsStackNavigator
│   ├── hooks/                     # useAppTheme, useDebounce, etc.
│   ├── theme/                     # colors.ts, typography.ts, spacing.ts
│   └── utils/                     # dateUtils, validators, formatters
│
├── __tests__/                     # Jest unit tests
├── assets/                        # App icons, splash images
└── package.json                   # Dependencies & scripts
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- Expo CLI: `npm install -g expo-cli`
- A Firebase project with Firestore, Auth, Storage, and Cloud Functions enabled

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd Accentify

# 2. Install dependencies
npm install

# 3. Install Cloud Functions dependencies
cd functions && npm install && cd ..
```

---

## Running the App

```bash
# Start Expo development server
npm start

# Open on Android emulator
npm run android

# Open on iOS simulator (macOS only)
npm run ios

# Open in browser (web)
npm run web
```

> Scan the QR code in the Expo Go app on your phone to run on a physical device.

### Running Tests

```bash
npm test
```

### Linting & Formatting

```bash
npm run lint          # Check for lint errors
npm run lint:fix      # Auto-fix lint errors
npm run format        # Format all source files with Prettier
```

---

## Environment Setup

Create a `src/config/firebase.ts` file with your Firebase project credentials:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
```

> See `functions/SETUP.md` for Cloud Functions deployment and Google Speech-to-Text API key setup.

---

## Database Schema (Firestore)

```
users/{uid}
  ├── [UserDocument fields]        # email, role, status, profile, security, preferences, studyPlan
  └── progress/
      ├── streak                   # dayStreak, longestStreak, lastActiveDate
      ├── daily/entries/{date}     # Per-day exercise scores and counts
      └── weekly/entries/{weekId}  # Aggregated weekly metrics

lessons/{lessonId}                 # Lesson content managed by admins
  └── vocabPairs/{pairId}          # Word pairs for vocabulary lessons

pronunciationSentences/{id}        # Sentences fetched for pronunciation exercises

feedback/{id}                      # User-submitted feedback tickets

supportTickets/{id}                # User support tickets

analytics/dashboard                # Global platform analytics

admins/{uid}                       # Admin member documents with roles & permissions

announcements/{id}                 # Platform announcements

systemLogs/{id}                    # System event logs
```

---

