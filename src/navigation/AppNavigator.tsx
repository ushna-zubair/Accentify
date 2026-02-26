import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import AccessibilityScreen from '../screens/main/AccessibilityScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import AppPreferenceScreen from '../screens/main/AppPreferenceScreen';
import ProfileSettingsScreen from '../screens/main/ProfileSettingsScreen';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import CreateProfileScreen from '../screens/auth/CreateProfileScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import CreateNewPasswordScreen from '../screens/auth/CreateNewPasswordScreen';
import SetupPinScreen from '../screens/auth/SetupPinScreen';
import SetupFaceIDScreen from '../screens/auth/SetupFaceIDScreen';
import TwoFactorAuthScreen from '../screens/auth/TwoFactorAuthScreen';
import LearningGoalsScreen from '../screens/auth/LearningGoalsScreen';
import NativeLanguageScreen from '../screens/auth/NativeLanguageScreen';
import EnglishLevelScreen from '../screens/auth/EnglishLevelScreen';
import ChooseVerificationMethodScreen from '../screens/auth/ChooseVerificationMethodScreen';
import SetupAuthenticatorScreen from '../screens/auth/SetupAuthenticatorScreen';
const SetYourFingerprintScreen = require('../screens/auth/SetYourFingerprintScreen').default;

// Main Screens
import { HomeScreen, TutorScreen, ProgressScreen, SettingsScreen } from '../screens/main';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';

// Onboarding profile data passed between screens during sign-up flow
export type ProfileData = {
  fullName: string;
  nickName: string;
  dateOfBirth: string;
  phoneNumber: string;
  gender: string;
  profilePictureUrl: string;
};

// Study plan data collected across onboarding screens
export type StudyPlanData = {
  learningGoals: string[];
  nativeLanguage: string;
  englishLevel: string;
};

// Navigation Types
export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  SignUp: undefined;
  CreateProfile: undefined;
  ForgotPassword: undefined;
  OTPVerification: undefined;
  CreateNewPassword: undefined;
  LearningGoals: { profile: ProfileData };
  NativeLanguage: { profile: ProfileData; learningGoals: string[] };
  EnglishLevel: { profile: ProfileData; learningGoals: string[]; nativeLanguage: string };
  SetupPin: { profile: ProfileData; learningGoals: string[]; nativeLanguage: string; englishLevel: string };
  SetupFaceID: { profile: ProfileData; learningGoals: string[]; nativeLanguage: string; englishLevel: string; appPin: string | null };
  TwoFactorAuth: { profile: ProfileData; learningGoals: string[]; nativeLanguage: string; englishLevel: string; appPin: string | null; biometricsEnabled: boolean };
  ChooseVerificationMethod: { profile: ProfileData; learningGoals: string[]; nativeLanguage: string; englishLevel: string; appPin: string | null; biometricsEnabled: boolean };
  SetupAuthenticator: { profile: ProfileData; learningGoals: string[]; nativeLanguage: string; englishLevel: string; appPin: string | null; biometricsEnabled: boolean };
  SetYourFingerprint: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Accessibility: undefined;
  Notifications: undefined;
  AppPreferences: undefined;
  ProfileSettings: undefined;
};

export type LearnerTabParamList = {
  Home: undefined;
  Tutor: undefined;
  Progress: undefined;
  Settings: undefined;
};

export type CMSStackParamList = {
  CMSDashboard: undefined;
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminManageLessons: undefined;
  AdminManageUsers: undefined;
  AdminFeedback: undefined;
  AdminSettings: undefined;
  AdminBilling: undefined;
  AdminAccessControl: undefined;
  AdminSupport: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
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

const AdminNavigator = () => {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
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
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#1A1A2E',
        tabBarActiveBackgroundColor: '#6B2FD9',
        tabBarStyle: {
          backgroundColor: '#F0EEFF',
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
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <LearnerTab.Screen name="Home" component={HomeScreen} />
      <LearnerTab.Screen name="Tutor" component={TutorScreen} />
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
