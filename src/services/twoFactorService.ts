

import { sendEmailVerification, reload } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface TwoFAStatus {
    enabled: boolean;
}

export interface SendLinkResult {
    maskedEmail: string;
}

export interface VerifyResult {
    enabled: boolean;
}
function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    const visible = local.slice(0, 1);
    const masked = '*'.repeat(Math.max(local.length - 1, 3));
    return `${visible}${masked}@${domain}`;
}


export async function get2FAStatus(uid: string): Promise<TwoFAStatus> {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        const enabled = userDoc.data()?.twoFactor?.enabled === true;
        return { enabled };
    } catch {
        return { enabled: false };
    }
}

export async function send2FACode(
    _action: 'enable' | 'disable',
): Promise<SendLinkResult> {
    const user = auth.currentUser;
    if (!user) throw new Error('You must be signed in to change 2FA settings.');
    if (!user.email) throw new Error('No email address associated with this account.');

    await sendEmailVerification(user);
    return { maskedEmail: maskEmail(user.email) };
}

export async function verify2FACode(
    _code: string,
    action: 'enable' | 'disable',
): Promise<VerifyResult> {
    const user = auth.currentUser;
    if (!user) throw new Error('You must be signed in.');

    // Refresh the user's token to get the latest emailVerified state
    await reload(user);

    if (!auth.currentUser?.emailVerified) {
        throw new Error('Email not yet verified. Please click the link in your email first.');
    }

    // Toggle the 2FA flag in Firestore
    const newEnabled = action === 'enable';
    await setDoc(
        doc(db, 'users', user.uid),
        { twoFactor: { enabled: newEnabled, updatedAt: new Date().toISOString() } },
        { merge: true },
    );

    return { enabled: newEnabled };
}
