import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

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
const SetYourFingerprintScreen = require('../screens/auth/SetYourFingerprintScreen').default;

// Main Screens
import { HomeScreen } from '../screens/main';

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
  SetYourFingerprint: undefined;
};

export type LearnerStackParamList = {
  Home: undefined;
};

export type CMSStackParamList = {
  CMSDashboard: undefined;
};

export type AdminStackParamList = {
  AdminPanel: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const LearnerStack = createNativeStackNavigator<LearnerStackParamList>();

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
    </AuthStack.Navigator>
  );
};

const LearnerNavigator = () => {
  return (
    <LearnerStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <LearnerStack.Screen name="Home" component={HomeScreen} />
    </LearnerStack.Navigator>
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

  // Default to auth for other roles (cms, admin) - can be expanded later
  return <AuthNavigator />;
};

export default AppNavigator;
