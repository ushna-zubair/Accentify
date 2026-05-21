import React from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { TabBarVisibilityProvider, useTabBarVisibility } from '../context/TabBarVisibilityContext';
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
import OTPVerificationScreen from '../views/auth/OTPVerificationScreen';
import CreateNewPasswordScreen from '../views/auth/CreateNewPasswordScreen';
import SetupPinScreen from '../views/auth/SetupPinScreen';
import SetupFaceIDScreen from '../views/auth/SetupFaceIDScreen';
import TwoFactorAuthScreen from '../views/auth/TwoFactorAuthScreen';
import LearningGoalsScreen from '../views/auth/LearningGoalsScreen';
import NativeLanguageScreen from '../views/auth/NativeLanguageScreen';
import EnglishLevelScreen from '../views/auth/EnglishLevelScreen';
import ChooseVerificationMethodScreen from '../views/auth/ChooseVerificationMethodScreen';
import SetupAuthenticatorScreen from '../views/auth/SetupAuthenticatorScreen';
import EmailVerificationScreen from '../views/auth/EmailVerificationScreen';
const SetYourFingerprintScreen = require('../views/auth/SetYourFingerprintScreen').default;

// Views – Main (barrel)
import { TutorScreen, ProgressScreen, SettingsScreen } from '../views/main';
import HomeMainScreen from '../views/main/HomeMainScreen';
import HomePronunciationScreen from '../views/main/HomePronunciationScreen';
import LessonDetailScreen from '../views/main/LessonDetailScreen';
import VocabExerciseScreen from '../views/main/VocabExerciseScreen';
import PronunciationExerciseScreen from '../views/main/PronunciationExerciseScreen';
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
      <HomeStack.Screen name="WavyChat" component={WavyChatScreen} />
    </HomeStack.Navigator>
  );
};

const TutorStackNavigator = () => {
  return (
    <TutorStack.Navigator screenOptions={{ headerShown: false }}>
      <TutorStack.Screen name="TutorMain" component={TutorScreen} />
      <TutorStack.Screen name="LessonDetail" component={LessonDetailScreen} />
      <TutorStack.Screen name="VocabExercise" component={VocabExerciseScreen} />
      <TutorStack.Screen name="PronunciationExercise" component={PronunciationExerciseScreen} />
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
      <AuthStack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <AuthStack.Screen name="CreateProfile" component={CreateProfileScreen} />
      <AuthStack.Screen name="LearningGoals" component={LearningGoalsScreen} />
      <AuthStack.Screen name="NativeLanguage" component={NativeLanguageScreen} />
      <AuthStack.Screen name="EnglishLevel" component={EnglishLevelScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <AuthStack.Screen name="CreateNewPassword" component={CreateNewPasswordScreen} />
      <AuthStack.Screen name="SetupPin" component={SetupPinScreen} />
      <AuthStack.Screen name="SetYourFingerprint" component={SetYourFingerprintScreen} />
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
  Home:     { active: 'home',      inactive: 'home-outline' },
  Tutor:    { active: 'bar-chart', inactive: 'bar-chart-outline' },
  Progress: { active: 'star',      inactive: 'star-outline' },
  Settings: { active: 'person',    inactive: 'person-outline' },
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
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        ...(Platform.OS === 'web' ? { minHeight: '100vh' as any } : {}),
      }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (!currentUser) {
    return <AuthNavigator />;
  }

  if (userRole === 'learner') {
    return <LearnerNavigator />;
  }

  if (userRole === 'admin') {
    return <AdminNavigator />;
  }

  // Default to auth for other roles (cms) - can be expanded later
  return <AuthNavigator />;
};

export default AppNavigator;
