# Accentify — Cloud Functions & Firebase Setup Guide

Complete setup instructions for deploying Accentify's Cloud Functions,
Firestore Security Rules, Storage Rules, and all third-party service
integrations.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Cloud Functions Overview](#cloud-functions-overview)
4. [Secrets Configuration](#secrets-configuration)
5. [Firestore Collections & Security Rules](#firestore-collections--security-rules)
6. [Storage Rules](#storage-rules)
7. [Building & Deploying Functions](#building--deploying-functions)
8. [Deploying Firestore & Storage Rules](#deploying-firestore--storage-rules)
9. [Running the Client App](#running-the-client-app)
10. [Local Development with Emulators](#local-development-with-emulators)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Requirement          | Version / Notes                                |
| -------------------- | ---------------------------------------------- |
| **Node.js**          | v20 (functions runtime requires Node 20)       |
| **npm**              | v9+ (ships with Node 20)                       |
| **Firebase CLI**     | v13+ — `npm install -g firebase-tools`         |
| **Expo CLI**         | Included via `npx expo` (SDK ~54)              |
| **Firebase Project** | A project created at https://console.firebase.google.com |

Make sure you are logged in:

```bash
firebase login
firebase projects:list          # verify your project appears
firebase use <your-project-id>  # set active project
```

---

## Project Structure

```
Accentify/
├── functions/                  # Cloud Functions (Node 20 / TypeScript)
│   ├── src/
│   │   ├── index.ts            # Auth, OTP, 2FA, admin password reset
│   │   ├── pronunciation.ts    # Speech-to-text evaluation & sentence seeding
│   │   └── adminAnalytics.ts   # Scheduled aggregation for admin dashboard
│   ├── lib/                    # Compiled JS output (auto-generated)
│   ├── package.json
│   └── tsconfig.json
├── src/                        # React Native / Expo client app
├── firebase.json               # Firebase project configuration
├── firestore.rules             # Firestore security rules
├── firestore.indexes.json      # Firestore composite indexes
├── storage.rules               # Cloud Storage security rules
└── package.json                # Client app dependencies
```

---

## Cloud Functions Overview

All functions use **Firebase Functions v2** (2nd-gen) with `onCall` or `onSchedule`.

### `index.ts` — Authentication & OTP

| Function               | Type       | Secrets Required                     | Description                                                    |
| ---------------------- | ---------- | ------------------------------------ | -------------------------------------------------------------- |
| `lookupUser`           | `onCall`   | —                                    | Finds user by email; returns masked email & phone              |
| `sendOTP`              | `onCall`   | SMTP_*, TWILIO_*                     | Generates 4-digit code, stores in Firestore, sends via email or SMS |
| `verifyOTP`            | `onCall`   | —                                    | Validates OTP, issues a short-lived session token              |
| `resetPassword`        | `onCall`   | —                                    | Resets password using session token from `verifyOTP`           |
| `send2FACode`          | `onCall`   | SMTP_*                               | Sends 2FA enable/disable verification code via email           |
| `verify2FACode`        | `onCall`   | —                                    | Validates 2FA code, toggles `twoFactorEnabled` on user doc     |
| `sendSignUpOTP`        | `onCall`   | SMTP_*                               | Sends email verification code during sign-up                   |
| `verifySignUpOTP`      | `onCall`   | —                                    | Validates sign-up OTP, marks email as verified                 |
| `adminResetPassword`   | `onCall`   | SMTP_*                               | Admin-triggered password reset; generates temp password & emails user |

### `pronunciation.ts` — Speech Evaluation

| Function                     | Type     | Secrets Required   | Description                                                 |
| ---------------------------- | -------- | ------------------ | ----------------------------------------------------------- |
| `getPronunciationSentences`  | `onCall` | —                  | Fetches sentences for a difficulty level from Firestore      |
| `transcribeAndEvaluate`      | `onCall` | GOOGLE_STT_API_KEY | Transcribes audio via Google Speech-to-Text, scores pronunciation |
| `seedPronunciationSentences` | `onCall` | —                  | Populates Firestore with default sentence data               |

### `adminAnalytics.ts` — Dashboard Aggregation

| Function                     | Type         | Secrets Required | Description                                              |
| ---------------------------- | ------------ | ---------------- | -------------------------------------------------------- |
| `scheduledAdminAggregation`  | `onSchedule` | —                | Runs every 6 hours; aggregates user progress for admin dashboard |
| `runAdminAggregation`        | `onCall`     | —                | Manually triggers the same aggregation                   |

---

## Secrets Configuration

Firebase secrets are encrypted at rest and injected at runtime. Set each one
via the CLI (you'll be prompted to enter the value):

### SMTP (Email Delivery)

Any SMTP provider works (Gmail App Password, SendGrid, Mailgun, AWS SES, etc.).

```bash
firebase functions:secrets:set SMTP_HOST      # e.g. smtp.gmail.com
firebase functions:secrets:set SMTP_PORT      # e.g. 465 (SSL) or 587 (TLS)
firebase functions:secrets:set SMTP_USER      # e.g. noreply@yourdomain.com
firebase functions:secrets:set SMTP_PASS      # App password or API key
```

### Twilio (SMS Delivery)

Required only if you support SMS-based OTP password reset. Sign up at
https://www.twilio.com and get your Account SID, Auth Token, and a phone number.

```bash
firebase functions:secrets:set TWILIO_SID     # Twilio Account SID
firebase functions:secrets:set TWILIO_TOKEN   # Twilio Auth Token
firebase functions:secrets:set TWILIO_PHONE   # Twilio phone number (e.g. +1234567890)
```

### Google Speech-to-Text (Pronunciation)

Required for the pronunciation exercise. Enable the Cloud Speech-to-Text API
in your GCP console, then create an API key.

```bash
firebase functions:secrets:set GOOGLE_STT_API_KEY   # Google Cloud STT API key
```

### Verify Secrets

```bash
firebase functions:secrets:access SMTP_HOST   # check a secret exists
```

---

## Firestore Collections & Security Rules

### Collections Used

| Collection                | Access                  | Purpose                                      |
| ------------------------- | ----------------------- | -------------------------------------------- |
| `users/{uid}`             | Owner + Admin           | User profiles, settings, security preferences|
| `users/{uid}/progress/*`  | Owner + Admin (read)    | Streak, daily activity, weekly entries        |
| `users/{uid}/lessons/*`   | Owner                   | Per-user lesson progress & attempts           |
| `users/{uid}/notifications/*` | Owner               | Push/in-app notifications                    |
| `users/{uid}/devices/*`   | Owner                   | Login device tracking                        |
| `users/{uid}/pronunciation_attempts/*` | Owner      | Pronunciation exercise history               |
| `lessons/{lessonId}`      | Authenticated (read) / Admin (write) | Global lesson definitions       |
| `lessons/{id}/vocabPairs/*` | Authenticated (read) / Admin (write) | Vocabulary word pairs for each lesson |
| `pronunciation_sentences/*` | Authenticated (read) / Admin (write) | Pronunciation exercise sentences |
| `announcements/*`         | Authenticated (read) / Admin (write) | System announcements           |
| `admin_analytics/*`       | Admin only              | Aggregated dashboard statistics              |
| `support_tickets/*`       | Admin only              | User support tickets                         |
| `system_logs/*`           | Admin only              | System event logs                            |
| `admin_activity_logs/*`   | Admin only              | Admin action audit trail                     |
| `feedback/*`              | Authenticated (read/create) / Admin (full) | User feedback & bug reports |
| `feedback_activity/*`     | Admin only              | Feedback response activity                   |
| `admin_invitations/*`     | Admin only              | Admin role invitations                       |
| `password_reset_otps/*`   | **None** (Admin SDK only) | OTP codes for password reset               |
| `signup_verification_otps/*` | **None** (Admin SDK only) | OTP codes for sign-up verification      |
| `two_factor_codes/*`      | **None** (Admin SDK only) | 2FA verification codes                    |

### Deploy Rules

The security rules are defined in `firestore.rules` at the project root:

```bash
firebase deploy --only firestore:rules
```

---

## Storage Rules

Cloud Storage is used for user profile photos. Rules are in `storage.rules`:

- Only authenticated users can read profile photos
- Only the owner can upload/delete their own photo
- Max file size: 5 MB
- Only image MIME types are accepted

```bash
firebase deploy --only storage
```

---

## Building & Deploying Functions

### Install Dependencies

```bash
cd functions
npm install
```

### Build (TypeScript → JavaScript)

```bash
npm run build
# Output goes to functions/lib/
```

### Deploy All Functions

```bash
cd ..  # back to project root
firebase deploy --only functions
```

### Deploy a Single Function

```bash
firebase deploy --only functions:sendOTP
firebase deploy --only functions:transcribeAndEvaluate
```

### View Logs

```bash
firebase functions:log
# or with filters:
firebase functions:log --only sendOTP
```

---

## Deploying Firestore & Storage Rules

```bash
# Deploy everything at once
firebase deploy --only firestore:rules,storage

# Or separately
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```

---

## Running the Client App

The Accentify client is a React Native app built with Expo (SDK ~54).

```bash
# From the project root
npm install

# Start development server
npx expo start

# Platform-specific
npx expo start --web          # Web (react-native-web)
npx expo start --android      # Android
npx expo start --ios          # iOS
```

### Web Build for Production

```bash
npx expo export --platform web
```

---

## Local Development with Emulators

Firebase provides local emulators for Firestore, Functions, and Auth so you
can develop without touching production data.

```bash
# Start emulators (from project root)
firebase emulators:start

# Or functions only (from functions/ directory)
cd functions
npm run serve
```

> **Note:** When using emulators, secrets are not available. You may need to
> provide fallback values or mock the email/SMS sending logic.

---

## Troubleshooting

### "Permission denied" errors in Firestore

- Verify the user is authenticated (`request.auth != null`)
- Check that the user's `role` field is set to `'admin'` for admin-only routes
- Re-deploy rules: `firebase deploy --only firestore:rules`

### Functions fail to deploy

- Ensure you are on **Node 20**: `node --version`
- Run `cd functions && npm install && npm run build` and fix any TypeScript errors
- Check that all secrets are set: `firebase functions:secrets:access SMTP_HOST`

### OTP emails not sending

- Verify SMTP secrets are correct: `firebase functions:secrets:access SMTP_USER`
- If using Gmail, make sure you are using an **App Password** (not your account password)
- Check function logs: `firebase functions:log --only sendOTP`

### Pronunciation evaluation returning errors

- Ensure `GOOGLE_STT_API_KEY` is set and the Speech-to-Text API is enabled in GCP
- The audio must be base64-encoded and in a supported format (LINEAR16, FLAC, etc.)

### "Functions not found" after deploy

- Make sure all functions are exported from `functions/src/index.ts`
- Verify the build output exists: `ls functions/lib/index.js`
- Re-deploy: `firebase deploy --only functions`

---

## Quick Reference — Full Deploy

```bash
# 1. Build Cloud Functions
cd functions && npm install && npm run build && cd ..

# 2. Deploy everything
firebase deploy --only functions,firestore:rules,firestore:indexes,storage

# 3. Start the client
npm install && npx expo start --web
```
