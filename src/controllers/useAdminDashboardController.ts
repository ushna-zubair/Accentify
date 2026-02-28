import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  setDoc,
  addDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';
import type {
  DashboardData,
  SidebarItem,
  AdminMobileDashboardData,
  AdminOnline,
  Announcement,
  AdminMenuItem,
} from '../models';
// ------- Constants -------
export const MENU_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', icon: 'grid-outline', iconSet: 'ionicons', key: 'dashboard' },
  { label: 'Manage Lessons', icon: 'book-outline', iconSet: 'ionicons', key: 'lessons' },
  { label: 'Manage Users', icon: 'people-outline', iconSet: 'ionicons', key: 'users' },
  { label: 'Feedback & Reports', icon: 'chatbox-ellipses-outline', iconSet: 'ionicons', key: 'feedback' },
];

export const OTHERS_ITEMS: SidebarItem[] = [
  { label: 'Settings', icon: 'settings-outline', iconSet: 'ionicons', key: 'settings' },
  { label: 'Subscription & billing', icon: 'card-outline', iconSet: 'ionicons', key: 'billing' },
  { label: 'Admin access control', icon: 'shield-checkmark-outline', iconSet: 'ionicons', key: 'access' },
  { label: 'Support & logs', icon: 'help-circle-outline', iconSet: 'ionicons', key: 'support' },
];

export const ADMIN_MENU: AdminMenuItem[] = [
  { key: 'insights', label: 'Insights', filled: true },
  { key: 'user_management', label: 'User Management', filled: false },
  { key: 'content_management', label: 'Content Management', filled: false },
  { key: 'create_announcement', label: 'Create Announcement', filled: false },
];

const DEFAULT_ANNOUNCEMENT: Announcement = {
  id: 'default',
  title: 'Announcements',
  body: 'Please be aware of ongoing maintenance, certain services may not be available between 02:00 – 14:00 on Sunday October 31 2025.',
  createdAt: new Date().toISOString(),
  createdBy: 'system',
};

const DEFAULT_MOBILE: AdminMobileDashboardData = {
  adminName: 'Admin',
  adminAvatarUrl: undefined,
  announcement: DEFAULT_ANNOUNCEMENT,
  adminsOnline: [],
  menuItems: ADMIN_MENU,
};

// ─── Desktop / Tablet Controller (existing) ───
export const useAdminDashboardController = () => {
  const { signOut } = useAuth();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch pre-aggregated dashboard analytics from admin_analytics/global_stats
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
    runAggregation,
  } = useDashboardAnalytics();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  return {
    activeMenu,
    setActiveMenu,
    searchQuery,
    setSearchQuery,
    dashboardData,
    isLoading,
    error,
    refetch,
    runAggregation,
    handleLogout,
  };
};

// ─── Mobile Admin Dashboard Controller ───
export const useAdminMobileDashboardController = () => {
  const { currentUser, userProfile, signOut } = useAuth();
  const [mobileData, setMobileData] = useState<AdminMobileDashboardData>(DEFAULT_MOBILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch mobile dashboard data ──
  const fetchDashboard = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Admin's own name & avatar from profile
      const adminName =
        (userProfile as any)?.profile?.fullName ??
        userProfile?.fullName ??
        currentUser.displayName ??
        currentUser.email?.split('@')[0] ??
        'Admin';

      const adminAvatarUrl =
        (userProfile as any)?.profile?.profilePictureUrl ??
        undefined;

      // 2. Latest announcement from Firestore
      let announcement: Announcement | null = DEFAULT_ANNOUNCEMENT;
      try {
        const announcementsRef = collection(db, 'announcements');
        const announcementQ = query(announcementsRef, orderBy('createdAt', 'desc'), limit(1));
        const announcementSnap = await getDocs(announcementQ);
        if (!announcementSnap.empty) {
          const aDoc = announcementSnap.docs[0];
          const aData = aDoc.data();
          announcement = {
            id: aDoc.id,
            title: aData.title ?? 'Announcement',
            body: aData.body ?? '',
            createdAt: aData.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
            createdBy: aData.createdBy ?? 'system',
          };
        }
      } catch {
        // Use default announcement
      }

      // 3. Admins online (users with role 'admin' and lastSeen within 15 min)
      let adminsOnline: AdminOnline[] = [];
      try {
        const usersRef = collection(db, 'users');
        const adminQ = query(usersRef, where('role', '==', 'admin'));
        const adminSnap = await getDocs(adminQ);
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

        adminSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const lastSeen = d.lastSeen?.toDate?.() ?? new Date(0);
          // Include self always, others only if recently seen
          if (docSnap.id === currentUser.uid || lastSeen > fifteenMinAgo) {
            adminsOnline.push({
              uid: docSnap.id,
              name: d.profile?.fullName ?? d.profile?.nickName ?? 'Admin',
              avatarUrl: d.profile?.profilePictureUrl,
            });
          }
        });

        // If no admins found from Firebase, show self at minimum
        if (adminsOnline.length === 0) {
          adminsOnline = [{ uid: currentUser.uid, name: adminName }];
        }
      } catch {
        adminsOnline = [{ uid: currentUser.uid, name: adminName }];
      }

      // 4. Update last seen for current admin
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
      } catch {
        // Non-critical
      }

      setMobileData({
        adminName,
        adminAvatarUrl,
        announcement,
        adminsOnline,
        menuItems: ADMIN_MENU,
      });
    } catch (e: any) {
      console.error('Error fetching admin dashboard:', e);
      setError(e.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [currentUser, userProfile]);

  // ── Create a new announcement ──
  const createAnnouncement = useCallback(
    async (title: string, body: string) => {
      if (!currentUser) return;
      try {
        const announcementsRef = collection(db, 'announcements');
        await addDoc(announcementsRef, {
          title,
          body,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        // Refresh dashboard to show the new announcement
        await fetchDashboard();
      } catch (e: any) {
        console.error('Error creating announcement:', e);
        throw e;
      }
    },
    [currentUser, fetchDashboard],
  );

  // ── Logout ──
  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (e) {
      console.error('Logout error', e);
    }
  }, [signOut]);

  // ── Auto-fetch on mount ──
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    mobileData,
    loading,
    error,
    fetchDashboard,
    createAnnouncement,
    handleLogout,
  };
};

