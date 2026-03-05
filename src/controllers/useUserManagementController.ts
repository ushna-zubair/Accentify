import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ManagedUser } from '../models';

const PAGE_SIZE = 20;

/**
 * Generate a 5-digit numeric short ID for display.
 */
function generateShortId(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

// ─── Controller ───
export const useUserManagementController = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // ── Fetch first page ──
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
      const snapshot = await getDocs(q);

      const fetched: ManagedUser[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          userId: data.shortId ?? d.id.slice(0, 5),
          fullName: data.profile?.fullName ?? data.fullName ?? '',
          email: data.email ?? '',
          status: data.status ?? 'active',
        };
      });

      setUsers(fetched);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setSelectedUids(new Set());
    } catch (e: any) {
      console.error('[UserMgmt] fetchUsers error:', e);
      setError(e.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load more (pagination) ──
  const fetchMore = useCallback(async () => {
    if (!lastDoc || !hasMore || loading) return;

    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
      const snapshot = await getDocs(q);

      const fetched: ManagedUser[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          userId: data.shortId ?? d.id.slice(0, 5),
          fullName: data.profile?.fullName ?? data.fullName ?? '',
          email: data.email ?? '',
          status: data.status ?? 'active',
        };
      });

      setUsers((prev) => [...prev, ...fetched]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (e: any) {
      console.error('[UserMgmt] fetchMore error:', e);
      setError(e.message ?? 'Failed to load more users');
    } finally {
      setLoading(false);
    }
  }, [lastDoc, hasMore, loading]);

  // ── Search by short ID ──
  const searchUser = useCallback(async (id: string) => {
    if (!id.trim()) {
      // Reset to full list
      fetchUsers();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('shortId', '==', id.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Fallback: try using it as a UID prefix
        const docSnap = await getDoc(doc(db, 'users', id.trim()));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUsers([
            {
              uid: docSnap.id,
              userId: data.shortId ?? docSnap.id.slice(0, 5),
              fullName: data.profile?.fullName ?? data.fullName ?? '',
              email: data.email ?? '',
              status: data.status ?? 'active',
            },
          ]);
        } else {
          setUsers([]);
          setError('No user found with that ID');
        }
      } else {
        const fetched: ManagedUser[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            userId: data.shortId ?? d.id.slice(0, 5),
            fullName: data.profile?.fullName ?? data.fullName ?? '',
            email: data.email ?? '',
            status: data.status ?? 'active',
          };
        });
        setUsers(fetched);
      }

      setHasMore(false);
      setSelectedUids(new Set());
    } catch (e: any) {
      console.error('[UserMgmt] searchUser error:', e);
      setError(e.message ?? 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  // ── Toggle selection ──
  const toggleSelect = useCallback((uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  }, []);

  // ── Add user ──
  const addUser = useCallback(
    async (fullName: string, email: string) => {
      if (!fullName.trim() || !email.trim()) {
        setError('Name and email are required');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const shortId = generateShortId();
        const newDocRef = doc(collection(db, 'users'));

        await setDoc(newDocRef, {
          email: email.trim(),
          role: 'learner',
          authProvider: 'email',
          shortId,
          status: 'active',
          profileComplete: false,
          emailVerified: false,
          termsAccepted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: null,
          profile: {
            fullName: fullName.trim(),
            nickName: '',
            dateOfBirth: '',
            phoneNumber: '',
            gender: '',
            profilePictureUrl: '',
            country: '',
            timeZone: '',
          },
          security: {
            appPinHash: null,
            biometricsEnabled: false,
            twoFactorEnabled: false,
            twoFactorMethod: 'none',
            passwordChangedAt: null,
          },
          preferences: {
            tutor_personality: 'friendly coach',
            accessibility_mode: false,
            cultural_context: true,
            notificationsEnabled: true,
            appLanguage: 'en',
          },
          studyPlan: {
            learningGoals: [],
            nativeLanguage: '',
            englishLevel: '',
          },
        });

        const newUser: ManagedUser = {
          uid: newDocRef.id,
          userId: shortId,
          fullName: fullName.trim(),
          email: email.trim(),
          status: 'active',
        };

        setUsers((prev) => [newUser, ...prev]);
      } catch (e: any) {
        console.error('[UserMgmt] addUser error:', e);
        setError(e.message ?? 'Failed to add user');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ── Edit user ──
  const editUser = useCallback(
    async (uid: string, fullName: string, email: string) => {
      try {
        setLoading(true);
        setError(null);

        await updateDoc(doc(db, 'users', uid), {
          'profile.fullName': fullName.trim(),
          email: email.trim(),
          updatedAt: new Date().toISOString(),
        });

        setUsers((prev) =>
          prev.map((u) =>
            u.uid === uid
              ? { ...u, fullName: fullName.trim(), email: email.trim() }
              : u,
          ),
        );
      } catch (e: any) {
        console.error('[UserMgmt] editUser error:', e);
        setError(e.message ?? 'Failed to update user');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ── Delete selected users ──
  const deleteSelected = useCallback(async () => {
    if (selectedUids.size === 0) return;

    try {
      setLoading(true);
      setError(null);

      const promises = Array.from(selectedUids).map((uid) =>
        deleteDoc(doc(db, 'users', uid)),
      );
      await Promise.all(promises);

      setUsers((prev) => prev.filter((u) => !selectedUids.has(u.uid)));
      setSelectedUids(new Set());
    } catch (e: any) {
      console.error('[UserMgmt] deleteSelected error:', e);
      setError(e.message ?? 'Failed to delete users');
    } finally {
      setLoading(false);
    }
  }, [selectedUids]);

  // ── Initial fetch ──
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    selectedUids,
    loading,
    error,
    searchId,
    hasMore,
    setSearchId,
    fetchUsers,
    fetchMore,
    searchUser,
    toggleSelect,
    addUser,
    editUser,
    deleteSelected,
  };
};
