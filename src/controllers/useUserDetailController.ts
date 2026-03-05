import { useState, useCallback, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { db } from '../config/firebase';
import type { UserDetailData, AccountStatus } from '../models';

const functions = getFunctions(app);

const DEFAULT_DETAIL: UserDetailData = {
  uid: '',
  username: '',
  fullName: '',
  email: '',
  userId: '',
  status: 'active',
  activeSince: '',
  role: 'learner',
  authProvider: 'email',
  emailVerified: false,
  lastLoginAt: null,
  twoFactorEnabled: false,
  twoFactorMethod: 'none',
};

// ─── Controller ───
export const useUserDetailController = (uid: string) => {
  const [detail, setDetail] = useState<UserDetailData>(DEFAULT_DETAIL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearSuccess = useCallback(() => setSuccessMessage(null), []);

  // ── Fetch user detail ──
  const fetchDetail = useCallback(async () => {
    if (!uid) return;

    try {
      setLoading(true);
      setError(null);

      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        setError('User not found');
        setLoading(false);
        return;
      }

      const data = snap.data();

      // Derive username from fullName (e.g. "Mason Clarke" → "MC_566")
      const nameParts = (data.profile?.fullName ?? data.fullName ?? '').split(' ');
      const initials = nameParts.map((p: string) => p[0]?.toUpperCase() ?? '').join('');
      const shortId = data.shortId ?? snap.id.slice(0, 5);
      const username = data.username ?? `${initials}_${shortId.slice(-3)}`;

      // Derive activeSince from createdAt
      let activeSince = '';
      if (data.createdAt) {
        try {
          const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          activeSince = `Since ${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`;
        } catch {
          activeSince = '';
        }
      }

      setDetail({
        uid: snap.id,
        username,
        fullName: data.fullName ?? data.profile?.fullName ?? '',
        email: data.email ?? '',
        userId: shortId,
        status: data.status ?? 'active',
        activeSince,
        role: data.role ?? 'learner',
        authProvider: data.authProvider ?? 'email',
        emailVerified: data.emailVerified ?? false,
        lastLoginAt: data.lastLoginAt ?? null,
        twoFactorEnabled: data.security?.twoFactorEnabled ?? false,
        twoFactorMethod: data.security?.twoFactorMethod ?? 'none',
      });
    } catch (e: any) {
      console.error('[UserDetail] fetchDetail error:', e);
      setError(e.message ?? 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // ── Toggle edit mode ──
  const toggleEdit = useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  // ── Update a single field locally ──
  const updateField = useCallback(
    (field: keyof UserDetailData, value: string) => {
      setDetail((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // ── Save edits to Firestore ──
  const saveEdits = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        'profile.fullName': detail.fullName,
        email: detail.email,
        username: detail.username,
        role: detail.role,
        updatedAt: new Date().toISOString(),
      });

      setIsEditing(false);
      setSuccessMessage(`Account ${detail.username} has been successfully updated.`);
    } catch (e: any) {
      console.error('[UserDetail] saveEdits error:', e);
      setError(e.message ?? 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [uid, detail]);

  // ── Reset password via Cloud Function (admin-only) ──
  // The Cloud Function generates a temp password, updates it in Firebase Auth
  // (where it's automatically hashed), and sends a reset email to the user.
  // The password is NEVER stored in Firestore.
  const resetPassword = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      const adminResetPassword = httpsCallable<
        { targetUid: string },
        { success: boolean; message: string }
      >(functions, 'adminResetPassword');

      await adminResetPassword({ targetUid: uid });

      setSuccessMessage(
        `A password reset email has been sent to ${detail.email}. The user will need to set a new password.`,
      );
    } catch (e: any) {
      console.error('[UserDetail] resetPassword error:', e);
      setError(e.message ?? 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  }, [uid, detail.email]);

  // ── Deactivate / Reactivate account ──
  const toggleAccountStatus = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      const newStatus: AccountStatus =
        detail.status === 'active' ? 'deactivated' : 'active';

      await updateDoc(doc(db, 'users', uid), {
        status: newStatus,
        statusChangedAt: new Date().toISOString(),
      });

      setDetail((prev) => ({ ...prev, status: newStatus }));
      setSuccessMessage(
        newStatus === 'active'
          ? `Account ${detail.username} has been successfully reactivated.`
          : `Account ${detail.username} has been successfully deactivated.`,
      );
    } catch (e: any) {
      console.error('[UserDetail] toggleAccountStatus error:', e);
      setError(e.message ?? 'Failed to update account status');
    } finally {
      setSaving(false);
    }
  }, [uid, detail.status]);

  return {
    detail,
    loading,
    saving,
    error,
    isEditing,
    successMessage,
    toggleEdit,
    updateField,
    saveEdits,
    resetPassword,
    toggleAccountStatus,
    clearSuccess,
  };
};
