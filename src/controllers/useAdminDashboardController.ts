import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import type { DashboardData, TopLearner, SidebarItem } from '../models';

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
