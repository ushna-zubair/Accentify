import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { AccessibilityProvider } from './src/context/AccessibilityContext';
import { AppPreferenceProvider } from './src/context/AppPreferenceContext';
import AppNavigator from './src/navigation/AppNavigator';

// Keep the native splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

export default function App() {
  // Preload the FontAwesome5 icon font so icons appear instantly
  const [fontsLoaded] = useFonts({
    ...FontAwesome5.font,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AccessibilityProvider>
          <AppPreferenceProvider>
            <NavigationContainer onReady={onLayoutRootView}>
              <AppNavigator />
              <StatusBar style="auto" />
            </NavigationContainer>
          </AppPreferenceProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
