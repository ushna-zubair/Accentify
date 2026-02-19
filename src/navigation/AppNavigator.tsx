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
const SetYourFingerprintScreen = require('../screens/auth/SetYourFingerprintScreen').default;

// Main Screens
import { HomeScreen } from '../screens/main';

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
  SetupPin: undefined;
  SetupFaceID: undefined;
  TwoFactorAuth: undefined;
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
