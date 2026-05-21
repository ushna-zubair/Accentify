/**
 * useProfileData – Fetches the authenticated user's Firestore document.
 *
 * Returns:
 *   • userDoc   – The typed `UserDocument` or `null` while loading / on error.
 *   • isLoading – `true` while the initial fetch is in-flight.
 *   • error     – A human-readable error string, or `null`.
 */

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import type { UserDocument } from '../models';

export interface UseProfileDataResult {
  userDoc: UserDocument | null;
  isLoading: boolean;
  error: string | null;
}

export function useProfileData(): UseProfileDataResult {
  const { currentUser } = useAuth();
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setUserDoc(null);
      setIsLoading(false);
      setError('No authenticated user.');
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (cancelled) return;

        if (snap.exists()) {
          setUserDoc(snap.data() as UserDocument);
        } else {
          setError('User profile not found.');
        }
      } catch (e: unknown) {
        if (!cancelled) {
          console.error('useProfileData fetch error:', e);
          setError(e instanceof Error ? e.message : 'Failed to load profile.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  return { userDoc, isLoading, error };
}
