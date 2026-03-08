import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
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

// Re-export notification fan-out function
export { sendNotificationFanout } from './notifications';

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

const REGION = 'us-central1';

// ─── Helpers ───

/** Generate a cryptographically secure 6-digit OTP. */
function generateOTP(): string {
  return crypto.randomInt(100_000, 1_000_000).toString();
}

/** Generate a cryptographically secure random token. */
function secureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Cached nodemailer transporter singleton. */
let _transporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: SMTP_HOST.value(),
      port: parseInt(SMTP_PORT.value(), 10),
      secure: parseInt(SMTP_PORT.value(), 10) === 465,
      auth: {
        user: SMTP_USER.value(),
        pass: SMTP_PASS.value(),
      },
    });
  }
  return _transporter;
}

/** Send an email, wrapping errors as HttpsError. */
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await getTransporter().sendMail({
      from: `"Accentify" <${SMTP_USER.value()}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Email send failed:', err);
    throw new HttpsError('internal', 'Failed to send email. Please try again later.');
  }
}

/** Build standard OTP email HTML. */
function otpEmailHtml(title: string, bodyText: string, code: string, footer: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px;">
      <h2 style="color: #6C63FF;">${title}</h2>
      <p>${bodyText}</p>
      <h1 style="letter-spacing: 12px; font-size: 36px; color: #333;">${code}</h1>
      <p style="color: #888;">${footer}</p>
    </div>
  `;
}

/**
 * Shared OTP verification logic.
 * Reads the OTP doc, checks expiry + attempts + code match, then deletes it.
 * Returns the verified document data on success.
 */
async function verifyOTPDocument(
  collection: string,
  docId: string,
  code: string,
): Promise<FirebaseFirestore.DocumentData> {
  const ref = db.collection(collection).doc(docId);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new HttpsError('not-found', 'No pending code. Please request a new one.');
  }

  const data = snap.data()!;

  if (data.expiresAt.toDate() < new Date()) {
    await ref.delete();
    throw new HttpsError('deadline-exceeded', 'Code has expired. Please request a new one.');
  }

  if (data.attempts >= 5) {
    await ref.delete();
    throw new HttpsError('resource-exhausted', 'Too many attempts. Please request a new code.');
  }

  await ref.update({ attempts: admin.firestore.FieldValue.increment(1) });

  if (data.code !== code) {
    throw new HttpsError('permission-denied', 'Incorrect code. Please try again.');
  }

  await ref.delete();
  return data;
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

/**
 * Rate-limit OTP sending per user.
 * Uses a `rate_limits/{collection}_{identifier}` doc to track request count
 * within a rolling window. Throws if the limit is exceeded.
 *
 * @param identifier  Unique key (usually uid or email)
 * @param collection  The OTP collection name (for namespacing)
 * @param maxRequests Maximum allowed requests in the window (default 5)
 * @param windowMs    Rolling window in ms (default 15 minutes)
 */
async function enforceRateLimit(
  identifier: string,
  collection: string,
  maxRequests = 5,
  windowMs = 15 * 60 * 1000,
): Promise<void> {
  const rateLimitRef = db.collection('rate_limits').doc(`${collection}_${identifier}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rateLimitRef);
    const now = Date.now();

    if (snap.exists) {
      const data = snap.data()!;
      const windowStart = data.windowStart?.toDate?.()
        ? data.windowStart.toDate().getTime()
        : data.windowStart;

      if (now - windowStart < windowMs) {
        if (data.count >= maxRequests) {
          const retryAfterSec = Math.ceil((windowMs - (now - windowStart)) / 1000);
          throw new HttpsError(
            'resource-exhausted',
            `Too many requests. Please try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
          );
        }
        tx.update(rateLimitRef, { count: data.count + 1 });
        return;
      }
    }

    tx.set(rateLimitRef, {
      count: 1,
      windowStart: admin.firestore.Timestamp.fromDate(new Date(now)),
    });
  });
}

// ─── 1. Look Up User ───
// Accepts an email, returns masked email + phone (if available) so the
// ForgotPasswordScreen can show real user data instead of hardcoded strings.
export const lookupUser = onCall({ region: REGION }, async (request) => {
  const email: string | undefined = request.data?.email;
  if (!email || typeof email !== 'string') {
    throw new HttpsError('invalid-argument', 'Email is required.');
  }

  const normalised = email.trim().toLowerCase();

  // Rate limit by email to prevent enumeration
  await enforceRateLimit(normalised, 'lookup_user', 10, 15 * 60 * 1000);

  // Find user in Firebase Auth
  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(normalised);
  } catch {
    // Return plausible-looking data so the caller cannot tell
    // whether the account actually exists.
    return {
      uid: null,
      maskedEmail: maskEmail(normalised),
      maskedPhone: null,
      hasPhone: false,
    };
  }

  // Read Firestore profile for phone
  const userDoc = await db.collection('users').doc(userRecord.uid).get();
  const phone = userDoc.exists ? userDoc.data()?.profile?.phoneNumber ?? '' : '';

  return {
    uid: userRecord.uid,
    maskedEmail: maskEmail(normalised),
    maskedPhone: phone ? maskPhone(phone) : null,
    hasPhone: !!phone,
  };
});

// ─── 2. Send OTP ───
export const sendOTP = onCall(
  { region: REGION, secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, TWILIO_SID, TWILIO_TOKEN, TWILIO_PHONE] },
  async (request) => {
    const { uid, method } = request.data as { uid?: string; method?: string };

    if (!uid || !method) {
      throw new HttpsError('invalid-argument', 'uid and method are required.');
    }
    if (method !== 'email' && method !== 'sms') {
      throw new HttpsError('invalid-argument', 'method must be "email" or "sms".');
    }

    // Rate limit: max 5 OTP requests per 15 minutes per user
    await enforceRateLimit(uid, 'password_reset_otps');

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
      await sendEmail(
        userRecord.email!,
        'Your Accentify Password Reset Code',
        otpEmailHtml(
          'Accentify Password Reset',
          'Your verification code is:',
          code,
          'This code expires in 5 minutes. If you didn\'t request a password reset, please ignore this email.',
        ),
      );
    } else {
      // SMS
      const userDoc = await db.collection('users').doc(uid).get();
      const phone = userDoc.data()?.profile?.phoneNumber;

      if (!phone) {
        throw new HttpsError('failed-precondition', 'No phone number on file.');
      }

      try {
        const twilio = await import('twilio');
        const client = twilio.default(TWILIO_SID.value(), TWILIO_TOKEN.value());
        await client.messages.create({
          body: `Your Accentify password reset code is: ${code}. It expires in 5 minutes.`,
          from: TWILIO_PHONE.value(),
          to: phone,
        });
      } catch (err) {
        console.error('SMS send failed:', err);
        throw new HttpsError('internal', 'Failed to send SMS. Please try again later.');
      }
    }

    return { success: true };
  }
);

// ─── 3. Verify OTP ───
export const verifyOTP = onCall({ region: REGION }, async (request) => {
  const { uid, code } = request.data as { uid?: string; code?: string };

  if (!uid || !code) {
    throw new HttpsError('invalid-argument', 'uid and code are required.');
  }

  // Shared verification: checks expiry, attempts, code match, then deletes
  await verifyOTPDocument('password_reset_otps', uid, code);

  // Issue a short-lived cryptographic session token for the password reset step
  const sessionToken = secureToken();
  const sessionExpiry = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 10 * 60 * 1000) // 10 minutes to set new password
  );

  // Re-create a minimal session doc (the OTP doc was deleted by verifyOTPDocument)
  await db.collection('password_reset_otps').doc(uid).set({
    verified: true,
    sessionToken,
    sessionExpiry,
  });

  return { success: true, sessionToken };
});

// ─── 4. Reset Password ───
export const resetPassword = onCall({ region: REGION }, async (request) => {
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
  { region: REGION, secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;
    const action: string = request.data?.action; // 'enable' or 'disable'

    if (!action || (action !== 'enable' && action !== 'disable')) {
      throw new HttpsError('invalid-argument', 'action must be "enable" or "disable".');
    }

    // Rate limit: max 5 2FA code requests per 15 minutes per user
    await enforceRateLimit(uid, 'two_factor_codes');

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

    const actionLabel = action === 'enable' ? 'enable' : 'disable';

    await sendEmail(
      userRecord.email,
      'Your Accentify 2FA Verification Code',
      otpEmailHtml(
        'Accentify Two-Factor Authentication',
        `You requested to <strong>${actionLabel}</strong> two-factor authentication. Your verification code is:`,
        code,
        'This code expires in 5 minutes. If you didn\'t make this request, please ignore this email and secure your account.',
      ),
    );

    return {
      success: true,
      maskedEmail: maskEmail(userRecord.email),
    };
  },
);

// ─── 6. Verify 2FA Code ───
// Validates the code and toggles the twoFactorEnabled flag on the user doc.
export const verify2FACode = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const uid = request.auth.uid;
  const { code, action } = request.data as { code?: string; action?: string };

  if (!code || !action) {
    throw new HttpsError('invalid-argument', 'code and action are required.');
  }

  const data = await verifyOTPDocument('two_factor_codes', uid, code);

  // Check action matches
  if (data.action !== action) {
    throw new HttpsError('permission-denied', 'Action mismatch.');
  }

  const newEnabled = action === 'enable';

  // Toggle 2FA on the user document
  await db.doc(`users/${uid}`).update({
    'security.twoFactorEnabled': newEnabled,
    'security.twoFactorMethod': newEnabled ? 'email' : 'none',
  });

  return {
    success: true,
    enabled: newEnabled,
  };
});

// ─── 7. Send Sign-Up Email Verification OTP ───
// Sends a 4-digit code to the newly registered user's email so they can
// prove ownership before continuing to the profile-creation screens.
export const sendSignUpOTP = onCall(
  { region: REGION, secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS] },
  async (request) => {
    // The user is authenticated (createUserWithEmailAndPassword already ran)
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;

    // Rate limit: max 5 sign-up OTP requests per 15 minutes per user
    await enforceRateLimit(uid, 'signup_verification_otps');

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
      new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    );

    // Store the code in Firestore
    const codeRef = db.collection('signup_verification_otps').doc(uid);
    await codeRef.set({
      code,
      attempts: 0,
      expiresAt,
      verified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await sendEmail(
      userRecord.email,
      'Verify Your Accentify Account',
      otpEmailHtml(
        'Welcome to Accentify!',
        'Thanks for signing up. Please verify your email with the code below:',
        code,
        'This code expires in 5 minutes. If you didn\'t create an account, you can safely ignore this email.',
      ),
    );

    return {
      success: true,
      maskedEmail: maskEmail(userRecord.email),
    };
  },
);

// ─── 8. Verify Sign-Up OTP ───
// Validates the code the user entered after signing up.
export const verifySignUpOTP = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const uid = request.auth.uid;
  const { code } = request.data as { code?: string };

  if (!code) {
    throw new HttpsError('invalid-argument', 'code is required.');
  }

  await verifyOTPDocument('signup_verification_otps', uid, code);

  // Mark the Firebase Auth user's email as verified
  await admin.auth().updateUser(uid, { emailVerified: true });

  return { success: true };
});

// ─── 9. Admin Reset Password ───
// Called by admins to trigger a password reset for a user.
// Generates a secure temp password, updates it in Firebase Auth (where it
// is automatically hashed with scrypt), and emails the user a notification
// with a link to set their own password. The plaintext password is NEVER
// stored in Firestore.
export const adminResetPassword = onCall(
  { region: REGION, secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS] },
  async (request) => {
    // Only authenticated admins may call this
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    // Verify the caller is an admin
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Only admins can reset user passwords.');
    }

    const { targetUid } = request.data as { targetUid?: string };
    if (!targetUid) {
      throw new HttpsError('invalid-argument', 'targetUid is required.');
    }

    // Get the target user
    let targetUser: admin.auth.UserRecord;
    try {
      targetUser = await admin.auth().getUser(targetUid);
    } catch {
      throw new HttpsError('not-found', 'Target user not found.');
    }

    if (!targetUser.email) {
      throw new HttpsError('failed-precondition', 'Target user has no email.');
    }

    // Generate a secure password reset link instead of a plaintext temp password.
    // The user clicks the link to set their own new password — the temporary
    // password never travels through email or Firestore.
    const resetLink = await admin.auth().generatePasswordResetLink(targetUser.email);

    // Record the reset event in Firestore
    await db.collection('users').doc(targetUid).update({
      'security.passwordChangedAt': new Date().toISOString(),
      'security.passwordResetByAdmin': true,
    });

    // Send notification email with reset link
    await sendEmail(
      targetUser.email,
      'Your Accentify Password Has Been Reset',
      `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px;">
          <h2 style="color: #6C63FF;">Accentify Password Reset</h2>
          <p>An administrator has initiated a password reset for your account.</p>
          <p>Please click the button below to set a new password:</p>
          <a href="${resetLink}" style="display: inline-block; background: #6C63FF; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">Reset My Password</a>
          <p style="color: #888;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="color: #888; word-break: break-all;">${resetLink}</p>
          <p style="color: #888;">If you didn't expect this, please contact support immediately.</p>
        </div>
      `,
    );

    return {
      success: true,
      message: 'Password reset email sent to the user.',
    };
  },
);
