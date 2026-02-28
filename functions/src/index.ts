import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as nodemailer from 'nodemailer';

// Re-export pronunciation functions
export {
  getPronunciationSentences,
  transcribeAndEvaluate,
  seedPronunciationSentences,
} from './pronunciation';

// Re-export admin analytics functions
export {
  scheduledAdminAggregation,
  runAdminAggregation,
} from './adminAnalytics';

// ─── Secrets (set via `firebase functions:secrets:set <NAME>`) ───
const SMTP_HOST = defineSecret('SMTP_HOST');
const SMTP_PORT = defineSecret('SMTP_PORT');
const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');
const TWILIO_SID = defineSecret('TWILIO_SID');
const TWILIO_TOKEN = defineSecret('TWILIO_TOKEN');
const TWILIO_PHONE = defineSecret('TWILIO_PHONE');

admin.initializeApp();
const db = admin.firestore();

// ─── Helpers ───

/** Generate a random 4-digit code. */
function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/** Mask an email: "user@example.com" → "u***r@example.com" */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

/** Mask a phone: "+61678789432" → "(+61) ***-***-*32" */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***-***-*${digits.slice(-2)}`;
}

// ─── 1. Look Up User ───
// Accepts an email, returns masked email + phone (if available) so the
// ForgotPasswordScreen can show real user data instead of hardcoded strings.
export const lookupUser = onCall(async (request) => {
  const email: string | undefined = request.data?.email;
  if (!email || typeof email !== 'string') {
    throw new HttpsError('invalid-argument', 'Email is required.');
  }

  // Find user in Firebase Auth
  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
  } catch {
    // Don't reveal whether the account exists
    throw new HttpsError('not-found', 'If an account exists, you will receive a reset code.');
  }

  // Read Firestore profile for phone
  const userDoc = await db.collection('users').doc(userRecord.uid).get();
  const phone = userDoc.exists ? userDoc.data()?.profile?.phoneNumber ?? '' : '';

  return {
    uid: userRecord.uid,
    maskedEmail: maskEmail(email),
    maskedPhone: phone ? maskPhone(phone) : null,
    hasPhone: !!phone,
  };
});

// ─── 2. Send OTP ───
export const sendOTP = onCall(
  { secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, TWILIO_SID, TWILIO_TOKEN, TWILIO_PHONE] },
  async (request) => {
    const { uid, method } = request.data as { uid?: string; method?: 'email' | 'sms' };

    if (!uid || !method) {
      throw new HttpsError('invalid-argument', 'uid and method are required.');
    }

    // Fetch user
    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await admin.auth().getUser(uid);
    } catch {
      throw new HttpsError('not-found', 'User not found.');
    }

    const code = generateOTP();
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    );

    // Store OTP in Firestore
    const otpRef = db.collection('password_reset_otps').doc(uid);
    await otpRef.set({
      code,
      method,
      attempts: 0,
      expiresAt,
      verified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (method === 'email') {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST.value(),
        port: parseInt(SMTP_PORT.value(), 10),
        secure: parseInt(SMTP_PORT.value(), 10) === 465,
        auth: {
          user: SMTP_USER.value(),
          pass: SMTP_PASS.value(),
        },
      });

      await transporter.sendMail({
        from: `"Accentify" <${SMTP_USER.value()}>`,
        to: userRecord.email!,
        subject: 'Your Accentify Password Reset Code',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px;">
            <h2 style="color: #6C63FF;">Accentify Password Reset</h2>
            <p>Your verification code is:</p>
            <h1 style="letter-spacing: 12px; font-size: 36px; color: #333;">${code}</h1>
            <p style="color: #888;">This code expires in 5 minutes. If you didn't request a password reset, please ignore this email.</p>
          </div>
        `,
      });
    } else if (method === 'sms') {
      // Dynamic import so the module is only loaded when SMS is used
      const twilio = await import('twilio');
      const client = twilio.default(TWILIO_SID.value(), TWILIO_TOKEN.value());

      const userDoc = await db.collection('users').doc(uid).get();
      const phone = userDoc.data()?.profile?.phoneNumber;

      if (!phone) {
        throw new HttpsError('failed-precondition', 'No phone number on file.');
      }

      await client.messages.create({
        body: `Your Accentify password reset code is: ${code}. It expires in 5 minutes.`,
        from: TWILIO_PHONE.value(),
        to: phone,
      });
    }

    return { success: true };
  }
);

// ─── 3. Verify OTP ───
export const verifyOTP = onCall(async (request) => {
  const { uid, code } = request.data as { uid?: string; code?: string };

  if (!uid || !code) {
    throw new HttpsError('invalid-argument', 'uid and code are required.');
  }

  const otpRef = db.collection('password_reset_otps').doc(uid);
  const otpSnap = await otpRef.get();

  if (!otpSnap.exists) {
    throw new HttpsError('not-found', 'No pending reset request. Please request a new code.');
  }

  const otpData = otpSnap.data()!;

  // Check expiry
  if (otpData.expiresAt.toDate() < new Date()) {
    await otpRef.delete();
    throw new HttpsError('deadline-exceeded', 'Code has expired. Please request a new one.');
  }

  // Check attempts (max 5)
  if (otpData.attempts >= 5) {
    await otpRef.delete();
    throw new HttpsError('resource-exhausted', 'Too many attempts. Please request a new code.');
  }

  // Increment attempts
  await otpRef.update({ attempts: admin.firestore.FieldValue.increment(1) });

  if (otpData.code !== code) {
    throw new HttpsError('permission-denied', 'Incorrect code. Please try again.');
  }

  // Mark as verified and issue a short-lived session token
  const sessionToken = `rst_${uid}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const sessionExpiry = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 10 * 60 * 1000) // 10 minutes to set new password
  );

  await otpRef.update({
    verified: true,
    sessionToken,
    sessionExpiry,
  });

  return { success: true, sessionToken };
});

// ─── 4. Reset Password ───
export const resetPassword = onCall(async (request) => {
  const { uid, sessionToken, newPassword } = request.data as {
    uid?: string;
    sessionToken?: string;
    newPassword?: string;
  };

  if (!uid || !sessionToken || !newPassword) {
    throw new HttpsError('invalid-argument', 'uid, sessionToken, and newPassword are required.');
  }

  // Validate password strength server-side
  if (newPassword.length < 8) {
    throw new HttpsError('invalid-argument', 'Password must be at least 8 characters.');
  }

  const otpRef = db.collection('password_reset_otps').doc(uid);
  const otpSnap = await otpRef.get();

  if (!otpSnap.exists) {
    throw new HttpsError('not-found', 'No verified reset session.');
  }

  const otpData = otpSnap.data()!;

  if (!otpData.verified || otpData.sessionToken !== sessionToken) {
    throw new HttpsError('permission-denied', 'Invalid or expired session.');
  }

  if (otpData.sessionExpiry.toDate() < new Date()) {
    await otpRef.delete();
    throw new HttpsError('deadline-exceeded', 'Session expired. Please start over.');
  }

  // Update password in Firebase Auth
  await admin.auth().updateUser(uid, { password: newPassword });

  // Clean up OTP document
  await otpRef.delete();

  return { success: true };
});

// ─── 5. Send 2FA Code ───
// Sends a 4-digit verification code to the authenticated user's email
// for enabling or disabling Two-Factor Authentication.
export const send2FACode = onCall(
  { secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;
    const action: string = request.data?.action; // 'enable' or 'disable'

    if (!action || (action !== 'enable' && action !== 'disable')) {
      throw new HttpsError('invalid-argument', 'action must be "enable" or "disable".');
    }

    // Get user email
    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await admin.auth().getUser(uid);
    } catch {
      throw new HttpsError('not-found', 'User not found.');
    }

    if (!userRecord.email) {
      throw new HttpsError('failed-precondition', 'No email on file.');
    }

    const code = generateOTP();
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 5 * 60 * 1000),
    );

    // Store the code in Firestore
    const codeRef = db.collection('two_factor_codes').doc(uid);
    await codeRef.set({
      code,
      action,
      attempts: 0,
      expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send via email
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST.value(),
      port: parseInt(SMTP_PORT.value(), 10),
      secure: parseInt(SMTP_PORT.value(), 10) === 465,
      auth: {
        user: SMTP_USER.value(),
        pass: SMTP_PASS.value(),
      },
    });

    const actionLabel = action === 'enable' ? 'enable' : 'disable';

    await transporter.sendMail({
      from: `"Accentify" <${SMTP_USER.value()}>`,
      to: userRecord.email,
      subject: `Your Accentify 2FA Verification Code`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px;">
          <h2 style="color: #6C63FF;">Accentify Two-Factor Authentication</h2>
          <p>You requested to <strong>${actionLabel}</strong> two-factor authentication.</p>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing: 12px; font-size: 36px; color: #333;">${code}</h1>
          <p style="color: #888;">This code expires in 5 minutes. If you didn't make this request, please ignore this email and secure your account.</p>
        </div>
      `,
    });

    return {
      success: true,
      maskedEmail: maskEmail(userRecord.email),
    };
  },
);

// ─── 6. Verify 2FA Code ───
// Validates the code and toggles the twoFactorEnabled flag on the user doc.
export const verify2FACode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const uid = request.auth.uid;
  const { code, action } = request.data as { code?: string; action?: string };

  if (!code || !action) {
    throw new HttpsError('invalid-argument', 'code and action are required.');
  }

  const codeRef = db.collection('two_factor_codes').doc(uid);
  const codeSnap = await codeRef.get();

  if (!codeSnap.exists) {
    throw new HttpsError('not-found', 'No pending 2FA code. Please request a new one.');
  }

  const codeData = codeSnap.data()!;

  // Check expiry
  if (codeData.expiresAt.toDate() < new Date()) {
    await codeRef.delete();
    throw new HttpsError('deadline-exceeded', 'Code has expired. Please request a new one.');
  }

  // Check attempts (max 5)
  if (codeData.attempts >= 5) {
    await codeRef.delete();
    throw new HttpsError('resource-exhausted', 'Too many attempts. Please request a new code.');
  }

  // Increment attempts
  await codeRef.update({ attempts: admin.firestore.FieldValue.increment(1) });

  if (codeData.code !== code) {
    throw new HttpsError('permission-denied', 'Incorrect code. Please try again.');
  }

  // Check action matches
  if (codeData.action !== action) {
    throw new HttpsError('permission-denied', 'Action mismatch.');
  }

  const newEnabled = action === 'enable';

  // Toggle 2FA on the user document
  await db.doc(`users/${uid}`).update({
    'security.twoFactorEnabled': newEnabled,
    'security.twoFactorMethod': newEnabled ? 'email' : 'none',
  });

  // Cleanup
  await codeRef.delete();

  return {
    success: true,
    enabled: newEnabled,
  };
});
