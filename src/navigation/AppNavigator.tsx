import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';

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

// Main Screens
import HomeScreen from '../screens/main/HomeScreen';

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
};

export type MainStackParamList = {
  Home: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Splash" component={SplashScreen} />
    <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    <AuthStack.Screen name="CreateProfile" component={CreateProfileScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <AuthStack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    <AuthStack.Screen name="CreateNewPassword" component={CreateNewPasswordScreen} />
    <AuthStack.Screen name="SetupPin" component={SetupPinScreen} />
    <AuthStack.Screen name="SetupFaceID" component={SetupFaceIDScreen} />
    <AuthStack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
  </AuthStack.Navigator>
);

const MainNavigator = () => (
  <MainStack.Navigator screenOptions={{ headerShown: false }}>
    <MainStack.Screen name="Home" component={HomeScreen} />
  </MainStack.Navigator>
);

const AppNavigator = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {currentUser ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;
