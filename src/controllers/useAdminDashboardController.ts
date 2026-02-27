import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  setDoc,
  addDoc,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import type {
  DashboardData,
  TopLearner,
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

export const DEFAULT_DATA: DashboardData = {
  activeUsers: 1245,
  growthPct: 8.4,
  usageDateRange: 'Oct 10 - 21 Oct, 25',
  weeklyBarData: [
    { label: 'Mon', thisWeek: 80, lastWeek: 60 },
    { label: 'Tue', thisWeek: 65, lastWeek: 50 },
    { label: 'Wed', thisWeek: 90, lastWeek: 70 },
    { label: 'Thur', thisWeek: 75, lastWeek: 55 },
    { label: 'Fri', thisWeek: 85, lastWeek: 68 },
    { label: 'Sat', thisWeek: 50, lastWeek: 45 },
    { label: 'Sun', thisWeek: 40, lastWeek: 35 },
  ],
  practiceActivity: { morning: 35, afternoon: 45, night: 20 },
  pronunciationAccuracy: 85,
  fluencyAccuracy: 86,
  vocabularyRetention: 92,
  topLearners: [
    { name: 'Sarah Lee', sessions: 48 },
    { name: 'Alex Chen', sessions: 43 },
    { name: 'Maria Lopez', sessions: 39 },
    { name: 'Omer Noor', sessions: 36 },
  ],
  totalSessions: 2568,
  sessionsGrowth: 8.4,
  sessionsThisWeek: [20, 35, 28, 42, 55, 50],
  sessionsLastWeek: [15, 22, 30, 25, 35, 40],
};

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
  const [dashboardData, setDashboardData] = useState<DashboardData>(DEFAULT_DATA);

  // Load real data from Firestore if available
  useEffect(() => {
    (async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('studyPlan.totalSessions', 'desc'), limit(4));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const learners: TopLearner[] = [];
          snap.forEach((docSnap) => {
            const d = docSnap.data();
            learners.push({
              name: d.profile?.fullName || d.profile?.nickName || 'Unknown',
              sessions: d.studyPlan?.totalSessions || 0,
            });
          });
          if (learners.length > 0 && learners[0].sessions > 0) {
            setDashboardData((prev) => ({ ...prev, topLearners: learners }));
          }
        }

        const statsDoc = await getDocs(collection(db, 'admin_stats'));
        if (!statsDoc.empty) {
          const stats = statsDoc.docs[0].data();
          setDashboardData((prev) => ({
            ...prev,
            activeUsers: stats.activeUsers ?? prev.activeUsers,
            totalSessions: stats.totalSessions ?? prev.totalSessions,
            growthPct: stats.growthPct ?? prev.growthPct,
          }));
        }
      } catch (e) {
        console.log('Using default dashboard data');
      }
    })();
  }, []);

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

