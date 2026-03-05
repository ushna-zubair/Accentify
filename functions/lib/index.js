"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminResetPassword = exports.verifySignUpOTP = exports.sendSignUpOTP = exports.verify2FACode = exports.send2FACode = exports.resetPassword = exports.verifyOTP = exports.sendOTP = exports.lookupUser = exports.runAdminAggregation = exports.scheduledAdminAggregation = exports.seedPronunciationSentences = exports.transcribeAndEvaluate = exports.getPronunciationSentences = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const nodemailer = __importStar(require("nodemailer"));
// Re-export pronunciation functions
var pronunciation_1 = require("./pronunciation");
Object.defineProperty(exports, "getPronunciationSentences", { enumerable: true, get: function () { return pronunciation_1.getPronunciationSentences; } });
Object.defineProperty(exports, "transcribeAndEvaluate", { enumerable: true, get: function () { return pronunciation_1.transcribeAndEvaluate; } });
Object.defineProperty(exports, "seedPronunciationSentences", { enumerable: true, get: function () { return pronunciation_1.seedPronunciationSentences; } });
// Re-export admin analytics functions
var adminAnalytics_1 = require("./adminAnalytics");
Object.defineProperty(exports, "scheduledAdminAggregation", { enumerable: true, get: function () { return adminAnalytics_1.scheduledAdminAggregation; } });
Object.defineProperty(exports, "runAdminAggregation", { enumerable: true, get: function () { return adminAnalytics_1.runAdminAggregation; } });
// ─── Secrets (set via `firebase functions:secrets:set <NAME>`) ───
const SMTP_HOST = (0, params_1.defineSecret)('SMTP_HOST');
const SMTP_PORT = (0, params_1.defineSecret)('SMTP_PORT');
const SMTP_USER = (0, params_1.defineSecret)('SMTP_USER');
const SMTP_PASS = (0, params_1.defineSecret)('SMTP_PASS');
const TWILIO_SID = (0, params_1.defineSecret)('TWILIO_SID');
const TWILIO_TOKEN = (0, params_1.defineSecret)('TWILIO_TOKEN');
const TWILIO_PHONE = (0, params_1.defineSecret)('TWILIO_PHONE');
admin.initializeApp();
const db = admin.firestore();
// ─── Helpers ───
/** Generate a random 4-digit code. */
function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}
/** Mask an email: "user@example.com" → "u***r@example.com" */
function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (local.length <= 2)
        return `${local[0]}***@${domain}`;
    return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}
/** Mask a phone: "+61678789432" → "(+61) ***-***-*32" */
function maskPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4)
        return '***';
    return `***-***-*${digits.slice(-2)}`;
}
// ─── 1. Look Up User ───
// Accepts an email, returns masked email + phone (if available) so the
// ForgotPasswordScreen can show real user data instead of hardcoded strings.
exports.lookupUser = (0, https_1.onCall)(async (request) => {
    const email = request.data?.email;
    if (!email || typeof email !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Email is required.');
    }
    // Find user in Firebase Auth
    let userRecord;
    try {
        userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
    }
    catch {
        // Don't reveal whether the account exists
        throw new https_1.HttpsError('not-found', 'If an account exists, you will receive a reset code.');
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
exports.sendOTP = (0, https_1.onCall)({ secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, TWILIO_SID, TWILIO_TOKEN, TWILIO_PHONE] }, async (request) => {
    const { uid, method } = request.data;
    if (!uid || !method) {
        throw new https_1.HttpsError('invalid-argument', 'uid and method are required.');
    }
    // Fetch user
    let userRecord;
    try {
        userRecord = await admin.auth().getUser(uid);
    }
    catch {
        throw new https_1.HttpsError('not-found', 'User not found.');
    }
    const code = generateOTP();
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
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
            to: userRecord.email,
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
    }
    else if (method === 'sms') {
        // Dynamic import so the module is only loaded when SMS is used
        const twilio = await Promise.resolve().then(() => __importStar(require('twilio')));
        const client = twilio.default(TWILIO_SID.value(), TWILIO_TOKEN.value());
        const userDoc = await db.collection('users').doc(uid).get();
        const phone = userDoc.data()?.profile?.phoneNumber;
        if (!phone) {
            throw new https_1.HttpsError('failed-precondition', 'No phone number on file.');
        }
        await client.messages.create({
            body: `Your Accentify password reset code is: ${code}. It expires in 5 minutes.`,
            from: TWILIO_PHONE.value(),
            to: phone,
        });
    }
    return { success: true };
});
// ─── 3. Verify OTP ───
exports.verifyOTP = (0, https_1.onCall)(async (request) => {
    const { uid, code } = request.data;
    if (!uid || !code) {
        throw new https_1.HttpsError('invalid-argument', 'uid and code are required.');
    }
    const otpRef = db.collection('password_reset_otps').doc(uid);
    const otpSnap = await otpRef.get();
    if (!otpSnap.exists) {
        throw new https_1.HttpsError('not-found', 'No pending reset request. Please request a new code.');
    }
    const otpData = otpSnap.data();
    // Check expiry
    if (otpData.expiresAt.toDate() < new Date()) {
        await otpRef.delete();
        throw new https_1.HttpsError('deadline-exceeded', 'Code has expired. Please request a new one.');
    }
    // Check attempts (max 5)
    if (otpData.attempts >= 5) {
        await otpRef.delete();
        throw new https_1.HttpsError('resource-exhausted', 'Too many attempts. Please request a new code.');
    }
    // Increment attempts
    await otpRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
    if (otpData.code !== code) {
        throw new https_1.HttpsError('permission-denied', 'Incorrect code. Please try again.');
    }
    // Mark as verified and issue a short-lived session token
    const sessionToken = `rst_${uid}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const sessionExpiry = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000) // 10 minutes to set new password
    );
    await otpRef.update({
        verified: true,
        sessionToken,
        sessionExpiry,
    });
    return { success: true, sessionToken };
});
// ─── 4. Reset Password ───
exports.resetPassword = (0, https_1.onCall)(async (request) => {
    const { uid, sessionToken, newPassword } = request.data;
    if (!uid || !sessionToken || !newPassword) {
        throw new https_1.HttpsError('invalid-argument', 'uid, sessionToken, and newPassword are required.');
    }
    // Validate password strength server-side
    if (newPassword.length < 8) {
        throw new https_1.HttpsError('invalid-argument', 'Password must be at least 8 characters.');
    }
    const otpRef = db.collection('password_reset_otps').doc(uid);
    const otpSnap = await otpRef.get();
    if (!otpSnap.exists) {
        throw new https_1.HttpsError('not-found', 'No verified reset session.');
    }
    const otpData = otpSnap.data();
    if (!otpData.verified || otpData.sessionToken !== sessionToken) {
        throw new https_1.HttpsError('permission-denied', 'Invalid or expired session.');
    }
    if (otpData.sessionExpiry.toDate() < new Date()) {
        await otpRef.delete();
        throw new https_1.HttpsError('deadline-exceeded', 'Session expired. Please start over.');
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
exports.send2FACode = (0, https_1.onCall)({ secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    const uid = request.auth.uid;
    const action = request.data?.action; // 'enable' or 'disable'
    if (!action || (action !== 'enable' && action !== 'disable')) {
        throw new https_1.HttpsError('invalid-argument', 'action must be "enable" or "disable".');
    }
    // Get user email
    let userRecord;
    try {
        userRecord = await admin.auth().getUser(uid);
    }
    catch {
        throw new https_1.HttpsError('not-found', 'User not found.');
    }
    if (!userRecord.email) {
        throw new https_1.HttpsError('failed-precondition', 'No email on file.');
    }
    const code = generateOTP();
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000));
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
});
// ─── 6. Verify 2FA Code ───
// Validates the code and toggles the twoFactorEnabled flag on the user doc.
exports.verify2FACode = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    const uid = request.auth.uid;
    const { code, action } = request.data;
    if (!code || !action) {
        throw new https_1.HttpsError('invalid-argument', 'code and action are required.');
    }
    const codeRef = db.collection('two_factor_codes').doc(uid);
    const codeSnap = await codeRef.get();
    if (!codeSnap.exists) {
        throw new https_1.HttpsError('not-found', 'No pending 2FA code. Please request a new one.');
    }
    const codeData = codeSnap.data();
    // Check expiry
    if (codeData.expiresAt.toDate() < new Date()) {
        await codeRef.delete();
        throw new https_1.HttpsError('deadline-exceeded', 'Code has expired. Please request a new one.');
    }
    // Check attempts (max 5)
    if (codeData.attempts >= 5) {
        await codeRef.delete();
        throw new https_1.HttpsError('resource-exhausted', 'Too many attempts. Please request a new code.');
    }
    // Increment attempts
    await codeRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
    if (codeData.code !== code) {
        throw new https_1.HttpsError('permission-denied', 'Incorrect code. Please try again.');
    }
    // Check action matches
    if (codeData.action !== action) {
        throw new https_1.HttpsError('permission-denied', 'Action mismatch.');
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
// ─── 7. Send Sign-Up Email Verification OTP ───
// Sends a 4-digit code to the newly registered user's email so they can
// prove ownership before continuing to the profile-creation screens.
exports.sendSignUpOTP = (0, https_1.onCall)({ secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS] }, async (request) => {
    // The user is authenticated (createUserWithEmailAndPassword already ran)
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    const uid = request.auth.uid;
    let userRecord;
    try {
        userRecord = await admin.auth().getUser(uid);
    }
    catch {
        throw new https_1.HttpsError('not-found', 'User not found.');
    }
    if (!userRecord.email) {
        throw new https_1.HttpsError('failed-precondition', 'No email on file.');
    }
    const code = generateOTP();
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000));
    // Store the code in Firestore
    const codeRef = db.collection('signup_verification_otps').doc(uid);
    await codeRef.set({
        code,
        attempts: 0,
        expiresAt,
        verified: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Send the email
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
        to: userRecord.email,
        subject: 'Verify Your Accentify Account',
        html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px;">
          <h2 style="color: #6C63FF;">Welcome to Accentify!</h2>
          <p>Thanks for signing up. Please verify your email with the code below:</p>
          <h1 style="letter-spacing: 12px; font-size: 36px; color: #333;">${code}</h1>
          <p style="color: #888;">This code expires in 5 minutes. If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `,
    });
    return {
        success: true,
        maskedEmail: maskEmail(userRecord.email),
    };
});
// ─── 8. Verify Sign-Up OTP ───
// Validates the code the user entered after signing up.
exports.verifySignUpOTP = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    const uid = request.auth.uid;
    const { code } = request.data;
    if (!code) {
        throw new https_1.HttpsError('invalid-argument', 'code is required.');
    }
    const codeRef = db.collection('signup_verification_otps').doc(uid);
    const codeSnap = await codeRef.get();
    if (!codeSnap.exists) {
        throw new https_1.HttpsError('not-found', 'No pending verification. Please request a new code.');
    }
    const codeData = codeSnap.data();
    // Check expiry
    if (codeData.expiresAt.toDate() < new Date()) {
        await codeRef.delete();
        throw new https_1.HttpsError('deadline-exceeded', 'Code has expired. Please request a new one.');
    }
    // Check attempts (max 5)
    if (codeData.attempts >= 5) {
        await codeRef.delete();
        throw new https_1.HttpsError('resource-exhausted', 'Too many attempts. Please request a new code.');
    }
    // Increment attempts
    await codeRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
    if (codeData.code !== code) {
        throw new https_1.HttpsError('permission-denied', 'Incorrect code. Please try again.');
    }
    // Mark the Firebase Auth user's email as verified
    await admin.auth().updateUser(uid, { emailVerified: true });
    // Cleanup
    await codeRef.delete();
    return { success: true };
});
// ─── 9. Admin Reset Password ───
// Called by admins to trigger a password reset for a user.
// Generates a secure temp password, updates it in Firebase Auth (where it
// is automatically hashed with scrypt), and emails the user a notification
// with a link to set their own password. The plaintext password is NEVER
// stored in Firestore.
exports.adminResetPassword = (0, https_1.onCall)({ secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS] }, async (request) => {
    // Only authenticated admins may call this
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    // Verify the caller is an admin
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only admins can reset user passwords.');
    }
    const { targetUid } = request.data;
    if (!targetUid) {
        throw new https_1.HttpsError('invalid-argument', 'targetUid is required.');
    }
    // Get the target user
    let targetUser;
    try {
        targetUser = await admin.auth().getUser(targetUid);
    }
    catch {
        throw new https_1.HttpsError('not-found', 'Target user not found.');
    }
    if (!targetUser.email) {
        throw new https_1.HttpsError('failed-precondition', 'Target user has no email.');
    }
    // Generate a secure temporary password (16 chars with mixed case, digits, symbols)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let tempPassword = '';
    for (let i = 0; i < 16; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Update password in Firebase Auth — Firebase automatically hashes with scrypt
    await admin.auth().updateUser(targetUid, { password: tempPassword });
    // Record the reset event (NOT the password) in Firestore
    await db.collection('users').doc(targetUid).update({
        'security.passwordChangedAt': new Date().toISOString(),
        'security.passwordResetByAdmin': true,
    });
    // Send notification email with the temp password
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
        to: targetUser.email,
        subject: 'Your Accentify Password Has Been Reset',
        html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px;">
          <h2 style="color: #6C63FF;">Accentify Password Reset</h2>
          <p>An administrator has reset your password. Your temporary password is:</p>
          <h1 style="letter-spacing: 4px; font-size: 24px; color: #333; background: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center;">${tempPassword}</h1>
          <p style="color: #888;">Please sign in with this temporary password and change it immediately in your account settings. This password should not be shared with anyone.</p>
        </div>
      `,
    });
    return {
        success: true,
        message: 'Password reset email sent to the user.',
    };
});
//# sourceMappingURL=index.js.map