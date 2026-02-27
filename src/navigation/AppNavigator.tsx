import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';
import { fonts } from '../theme/typography';

// Models
import {
  ProfileData,
  StudyPlanData,
  AuthStackParamList,
  SettingsStackParamList,
  LearnerTabParamList,
  CMSStackParamList,
  AdminStackParamList,
  TutorStackParamList,
} from '../models';

// Re-export types so existing consumers still work
export type { ProfileData, StudyPlanData, AuthStackParamList, SettingsStackParamList, LearnerTabParamList, CMSStackParamList, AdminStackParamList, TutorStackParamList };

// Views – Main
import AccessibilityScreen from '../views/main/AccessibilityScreen';
import NotificationsScreen from '../views/main/NotificationsScreen';
import AppPreferenceScreen from '../views/main/AppPreferenceScreen';
import ProfileSettingsScreen from '../views/main/ProfileSettingsScreen';

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
const SetYourFingerprintScreen = require('../views/auth/SetYourFingerprintScreen').default;

// Views – Main (barrel)
import { HomeScreen, TutorScreen, ProgressScreen, SettingsScreen } from '../views/main';
import LessonDetailScreen from '../views/main/LessonDetailScreen';
import VocabExerciseScreen from '../views/main/VocabExerciseScreen';

// Views – Admin
import AdminDashboardScreen from '../views/admin/AdminDashboardScreen';
import AdminInsightsScreen from '../views/admin/AdminInsightsScreen';
import AdminUserManagementScreen from '../views/admin/AdminUserManagementScreen';
import AdminUserDetailScreen from '../views/admin/AdminUserDetailScreen';
import AdminAnnouncementsScreen from '../views/admin/AdminAnnouncementsScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const TutorStack = createNativeStackNavigator<TutorStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const LearnerTab = createBottomTabNavigator<LearnerTabParamList>();

const SettingsStackNavigator = () => {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStack.Screen name="Accessibility" component={AccessibilityScreen} />
      <SettingsStack.Screen name="Notifications" component={NotificationsScreen} />
      <SettingsStack.Screen name="AppPreferences" component={AppPreferenceScreen} />
      <SettingsStack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
    </SettingsStack.Navigator>
  );
};

const TutorStackNavigator = () => {
  return (
    <TutorStack.Navigator screenOptions={{ headerShown: false }}>
      <TutorStack.Screen name="TutorMain" component={TutorScreen} />
      <TutorStack.Screen name="LessonDetail" component={LessonDetailScreen} />
      <TutorStack.Screen name="VocabExercise" component={VocabExerciseScreen} />
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

const LearnerNavigator = () => {
  return (
    <LearnerTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Tutor') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Progress') {
            iconName = focused ? 'star' : 'star-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarActiveBackgroundColor: colors.tabBarActive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 85 : 70,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
          paddingHorizontal: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          borderRadius: 20,
          marginHorizontal: 4,
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.semiBold,
          fontSize: 11,
        },
      })}
    >
      <LearnerTab.Screen name="Home" component={HomeScreen} />
      <LearnerTab.Screen name="Tutor" component={TutorStackNavigator} />
      <LearnerTab.Screen name="Progress" component={ProgressScreen} />
      <LearnerTab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{ tabBarLabel: 'Profile' }}
      />
    </LearnerTab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return null;
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
