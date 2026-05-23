import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus, Platform, View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator, Image } from 'react-native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { TabBarVisibilityProvider, useTabBarVisibility } from '../context/TabBarVisibilityContext';
import { convoHealth } from '../services/conversationApi';
import { health as pronunciationHealth } from '../services/accentifyApi';
import { useAppTheme } from '../hooks/useAppTheme';
import { fonts } from '../theme/typography';

// Models
import {
  ProfileData,
  StudyPlanData,
  AuthStackParamList,
  SettingsStackParamList,
  HomeStackParamList,
  LearnerTabParamList,
  CMSStackParamList,
  AdminStackParamList,
  TutorStackParamList,
} from '../models';

// Re-export types so existing consumers still work
export type { ProfileData, StudyPlanData, AuthStackParamList, SettingsStackParamList, HomeStackParamList, LearnerTabParamList, CMSStackParamList, AdminStackParamList, TutorStackParamList };

// Views – Main
import SettingsStackNavigator from './SettingsStackNavigator';

// Views – Auth
import SplashScreen from '../views/auth/SplashScreen';
import OnboardingScreen from '../views/auth/OnboardingScreen';
import LoginScreen from '../views/auth/LoginScreen';
import SignUpScreen from '../views/auth/SignUpScreen';
import CreateProfileScreen from '../views/auth/CreateProfileScreen';
import ForgotPasswordScreen from '../views/auth/ForgotPasswordScreen';
import VerifyEmailScreen from '../views/auth/VerifyEmailScreen';
import SetupPinScreen from '../views/auth/SetupPinScreen';
import SetupFaceIDScreen from '../views/auth/SetupFaceIDScreen';
import TwoFactorAuthScreen from '../views/auth/TwoFactorAuthScreen';
import TwoFactorChallengeScreen from '../views/auth/TwoFactorChallengeScreen';
import LearningGoalsScreen from '../views/auth/LearningGoalsScreen';
import NativeLanguageScreen from '../views/auth/NativeLanguageScreen';
import EnglishLevelScreen from '../views/auth/EnglishLevelScreen';
import ChooseVerificationMethodScreen from '../views/auth/ChooseVerificationMethodScreen';
import SetupAuthenticatorScreen from '../views/auth/SetupAuthenticatorScreen';

// Views – Main (barrel)
import { TutorScreen, ProgressScreen, SettingsScreen } from '../views/main';
import HomeMainScreen from '../views/main/HomeMainScreen';
import HomePronunciationScreen from '../views/main/HomePronunciationScreen';
import HomeWordPronunciationScreen from '../views/main/HomeWordPronunciationScreen';
import LessonDetailScreen from '../views/main/LessonDetailScreen';
import VocabExerciseScreen from '../views/main/VocabExerciseScreen';
import PronunciationExerciseScreen from '../views/main/PronunciationExerciseScreen';
import { WordPronunciationExerciseScreen } from '../views/main/WordPronunciationExerciseScreen';
import ConversationExerciseScreen from '../views/main/ConversationExerciseScreen';
import CourseCompletionScreen from '../views/main/CourseCompletionScreen';
import WavyChatScreen from '../views/main/WavyChatScreen';

// Views – Admin
import AdminDashboardScreen from '../views/admin/AdminDashboardScreen';
import AdminInsightsScreen from '../views/admin/AdminInsightsScreen';
import AdminUserManagementScreen from '../views/admin/AdminUserManagementScreen';
import AdminUserDetailScreen from '../views/admin/AdminUserDetailScreen';
import AdminAnnouncementsScreen from '../views/admin/AdminAnnouncementsScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const TutorStack = createNativeStackNavigator<TutorStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const LearnerTab = createBottomTabNavigator<LearnerTabParamList>();

const HomeStackNavigator = () => {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeMainScreen} />
      <HomeStack.Screen name="HomePronunciation" component={HomePronunciationScreen} />
      <HomeStack.Screen name="HomeWordPronunciation" component={HomeWordPronunciationScreen} />
      <HomeStack.Screen name="WavyChat" component={WavyChatScreen} />
      <HomeStack.Screen name="CourseCompletion" component={CourseCompletionScreen} />
    </HomeStack.Navigator>
  );
};

const TutorWordPronunciationRoute: React.FC<
  NativeStackScreenProps<TutorStackParamList, 'WordPronunciationExercise'>
> = ({ route, navigation }) => (
  <WordPronunciationExerciseScreen
    lessonId={route.params.lessonId}
    onExit={() => navigation.goBack()}
    onComplete={(summary) => {
      if (!summary) return;
      navigation.replace('CourseCompletion', {
        lessonId: route.params.lessonId,
        courseTitle: 'Word Pronunciation',
        completedCount: summary.completedCount,
        totalWeekly: summary.totalAttempts,
      });
    }}
  />
);

const TutorStackNavigator = () => {
  return (
    <TutorStack.Navigator screenOptions={{ headerShown: false }}>
      <TutorStack.Screen name="TutorMain" component={TutorScreen} />
      <TutorStack.Screen name="LessonDetail" component={LessonDetailScreen} />
      <TutorStack.Screen name="VocabExercise" component={VocabExerciseScreen} />
      <TutorStack.Screen name="PronunciationExercise" component={PronunciationExerciseScreen} />
      <TutorStack.Screen
        name="WordPronunciationExercise"
        component={TutorWordPronunciationRoute}
      />
      <TutorStack.Screen name="ConversationExercise" component={ConversationExerciseScreen} />
      <TutorStack.Screen name="CourseCompletion" component={CourseCompletionScreen} />
    </TutorStack.Navigator>
  );
};

const AdminNavigator = () => {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <AdminStack.Screen name="AdminInsights" component={AdminInsightsScreen} />
      <AdminStack.Screen name="AdminManageUsers" component={AdminUserManagementScreen} />
      <AdminStack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} />
      <AdminStack.Screen name="AdminAnnouncements" component={AdminAnnouncementsScreen} />
    </AdminStack.Navigator>
  );
};

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <AuthStack.Screen name="CreateProfile" component={CreateProfileScreen} />
      <AuthStack.Screen name="SetupPin" component={SetupPinScreen} />
      <AuthStack.Screen name="SetupFaceID" component={SetupFaceIDScreen} />
      <AuthStack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
      <AuthStack.Screen name="ChooseVerificationMethod" component={ChooseVerificationMethodScreen} />
      <AuthStack.Screen name="SetupAuthenticator" component={SetupAuthenticatorScreen} />
    </AuthStack.Navigator>
  );
};

// ═══════════════════════════════════════════════
//  CUSTOM TAB BAR
// ═══════════════════════════════════════════════

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Tutor: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  Progress: { active: 'star', inactive: 'star-outline' },
  Settings: { active: 'person', inactive: 'person-outline' },
};

const TAB_LABELS: Record<string, string> = {
  Home: 'Home',
  Tutor: 'Tutor',
  Progress: 'Progress',
  Settings: 'Profile',
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 6);
  const { translateY: animValue } = useTabBarVisibility();
  const { colors: tc, isDark } = useAppTheme();

  // Derive tab bar palette from the theme's accent
  const tabBg = isDark ? tc.surfaceAlt : tc.accentDark;
  const tabActive = isDark ? tc.accent : tc.accent;
  const tabInactive = isDark ? tc.textMuted : 'rgba(255,255,255,0.50)';
  const tabLabelColor = isDark ? tc.text : '#FFFFFF';

  // Slide the bar down by its own height + bottom padding to fully hide
  const barHeight = 56 + bottomPad + 12; // bar + padding + wrapper gap
  const animatedTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, barHeight],
  });

  return (
    <Animated.View
      style={[
        tabStyles.wrapper,
        { paddingBottom: bottomPad, transform: [{ translateY: animatedTranslateY }] },
      ]}
    >
      <View style={[tabStyles.bar, { backgroundColor: tabBg }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const icons = TAB_ICONS[route.name] ?? { active: 'help-circle', inactive: 'help-circle-outline' };
          const iconName = focused ? icons.active : icons.inactive;
          const label = TAB_LABELS[route.name] ?? route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              activeOpacity={0.7}
              style={tabStyles.tab}
            >
              <View
                style={[
                  tabStyles.iconWrap,
                  focused && [tabStyles.iconWrapActive, { backgroundColor: tabActive }],
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={18}
                  color={focused ? '#FFFFFF' : tabInactive}
                />
              </View>
              <Text
                style={[
                  tabStyles.label,
                  { color: tabInactive },
                  focused && { color: tabLabelColor },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
};

const tabStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 4,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    borderRadius: 17,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    marginTop: 1,
  },
});

// ═══════════════════════════════════════════════
//  LEARNER NAVIGATOR
// ═══════════════════════════════════════════════

const LearnerNavigator = () => {
  // Fire the conversation Space's /health endpoint as soon as the learner
  // lands in the app — by the time they tap Wavy Chat or Tutor, the HF
  // container is usually past its cold-start. Best-effort: failures are
  // swallowed, the per-screen warmup pings still kick in too.
  useEffect(() => {
    convoHealth().catch(() => {});
    pronunciationHealth().catch(() => {});
  }, []);

  return (
    <TabBarVisibilityProvider>
      <LearnerTab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <LearnerTab.Screen name="Home" component={HomeStackNavigator} />
        <LearnerTab.Screen name="Tutor" component={TutorStackNavigator} />
        <LearnerTab.Screen name="Progress" component={ProgressScreen} />
        <LearnerTab.Screen name="Settings" component={SettingsStackNavigator} />
      </LearnerTab.Navigator>
    </TabBarVisibilityProvider>
  );
};

const AppNavigator: React.FC = () => {
  const { currentUser, loading, profileLoading, profileFetchError, userRole, userProfile, reloadUser, pendingTotpChallenge, fetchUserRole } = useAuth();
  const [appState, setAppState] = useState(AppState.currentState);
  const [splashVisible, setSplashVisible] = useState(true);
  const [retrying, setRetrying] = useState(false);

  // Ensure splash is visible for at least 1500ms for a smoother experience
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashVisible(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground — refresh user to check emailVerified
        if (currentUser && !currentUser.emailVerified) {
          reloadUser().catch(console.error);
        }
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState, currentUser, reloadUser]);

  if (loading || splashVisible || profileLoading) {
    return (
      <View style={{
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FFFFFF', // Matching splash background
      }}>
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: 180, height: 180, marginBottom: 24 }}
          resizeMode="contain"
        />
        <Text style={{
          fontFamily: fonts.bold,
          fontSize: 20,
          color: '#6C63FF', // Primary accent
          letterSpacing: 4,
        }}>A C C E N T I F Y</Text>
      </View>
    );
  }

  // 1. If not logged in, show Auth Stack
  if (!currentUser) {
    return <AuthNavigator />;
  }

  // 1.5. If a TOTP challenge is pending, gate the entire app behind it.
  // The user has signed in with Firebase but cannot reach the main app until
  // they prove possession of their authenticator app.
  if (pendingTotpChallenge) {
    return <TwoFactorChallengeScreen />;
  }

  // 1.6. The user is authenticated but the Firestore profile read failed
  // AND we have no cached profile yet. Don't shove them into CreateProfile —
  // show a retry screen so they don't end up re-doing onboarding because
  // the network was flaky on launch.
  if (profileFetchError && !userProfile) {
    const onRetry = async () => {
      if (retrying) return;
      setRetrying(true);
      try {
        await fetchUserRole(currentUser.uid);
      } finally {
        setRetrying(false);
      }
    };
    return (
      <View style={offlineStyles.container}>
        <Image
          source={require('../../assets/logo.png')}
          style={offlineStyles.logo}
          resizeMode="contain"
        />
        <Text style={offlineStyles.title}>Can't reach the server</Text>
        <Text style={offlineStyles.subtitle}>
          Check your internet connection and try again.
        </Text>
        <TouchableOpacity
          style={offlineStyles.button}
          onPress={onRetry}
          disabled={retrying}
          activeOpacity={0.85}
        >
          {retrying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={offlineStyles.buttonText}>Retry</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // 2. If email is not verified (only for email/password provider), show VerifyEmail in a stack
  // Note: Social providers (Google/Apple) have emailVerified: true by default
  if (!currentUser.emailVerified && currentUser.providerData.some(p => p.providerId === 'password')) {
    return (
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen
          name="VerifyEmail"
          component={VerifyEmailScreen}
          initialParams={{ email: currentUser.email ?? '' }}
        />
      </AuthStack.Navigator>
    );
  }

  // 3. If profile setup is not complete (new user), show full AuthStack starting at CreateProfile
  if (!userProfile?.profileComplete) {
    return (
      <AuthStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="CreateProfile"
      >
        <AuthStack.Screen name="CreateProfile" component={CreateProfileScreen} />
        <AuthStack.Screen name="LearningGoals" component={LearningGoalsScreen} />
        <AuthStack.Screen name="NativeLanguage" component={NativeLanguageScreen} />
        <AuthStack.Screen name="EnglishLevel" component={EnglishLevelScreen} />
        <AuthStack.Screen name="SetupPin" component={SetupPinScreen} />
        <AuthStack.Screen name="SetupFaceID" component={SetupFaceIDScreen} />
        <AuthStack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
        <AuthStack.Screen name="ChooseVerificationMethod" component={ChooseVerificationMethodScreen} />
        <AuthStack.Screen name="SetupAuthenticator" component={SetupAuthenticatorScreen} />
      </AuthStack.Navigator>
    );
  }

  // 4. Decide which role-based stack to show
  if (userRole === 'learner') {
    return <LearnerNavigator />;
  }
  if (userRole === 'admin') return <AdminNavigator />;

  // Default to Learner if role is unknown or not set (e.g. content_author)
  return <LearnerNavigator />;
};

const offlineStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#666666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default AppNavigator;
