# Firestore Security Rules for `password_reset_otps`

The `password_reset_otps` collection is written **only** by Cloud Functions
(using the Admin SDK, which bypasses rules). No client should ever read or
write this collection directly.

Add this to your `firestore.rules`:

```
match /password_reset_otps/{uid} {
  allow read, write: if false; // Admin SDK only
}
```

# Secrets Configuration

Before deploying, set these secrets via the Firebase CLI:

```bash
# SMTP (any provider: Gmail, SendGrid, Mailgun, etc.)
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS

# Twilio (for SMS delivery)
firebase functions:secrets:set TWILIO_SID
firebase functions:secrets:set TWILIO_TOKEN
firebase functions:secrets:set TWILIO_PHONE
```

# Deployment

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```
