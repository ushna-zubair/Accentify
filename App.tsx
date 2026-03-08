import React, { useCallback, useEffect } from 'react';
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
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
import { AppPreferenceProvider, useAppPreference } from './src/context/AppPreferenceContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { initDeviceId } from './src/services/deviceService';

// Initialise the device installation ID as early as possible (async).
initDeviceId().catch(() => {});

// Keep the native splash screen visible while fonts load.
// Wrap in catch — on web this can silently fail and should not block the app.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Inner component that can consume AppPreference context for the StatusBar */
const ThemedStatusBar: React.FC = () => {
  const { theme } = useAppPreference();
  return <StatusBar style={theme === 'Dark' ? 'light' : 'dark'} />;
};

/** Full-screen loading indicator shown while fonts or auth are initialising. */
const LoadingScreen: React.FC = () => (
  <View style={loadingStyles.container}>
    <ActivityIndicator size="large" color="#6C63FF" />
  </View>
);

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    // Ensure the loading screen fills the entire viewport on web
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as any } : {}),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default function App() {
  // Web-only: inject Google Fonts CSS with display=swap to prevent
  // "Slow network detected" browser intervention and OTS parsing errors.
  // Also fix the root element height so flex: 1 works correctly on web.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Ensure root elements stretch to full viewport height
      const style = document.createElement('style');
      style.textContent = `
        html, body, #root {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `;
      document.head.appendChild(style);

      const id = 'google-fonts-poppins';
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
        document.head.appendChild(link);
      }
    }
  }, []);

  // Preload the FontAwesome5 icon font so icons appear instantly
  const [fontsLoaded, fontError] = useFonts({
    ...FontAwesome5.font,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Call hideAsync as a side-effect too, in case onReady already fired
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Show a visible loading screen instead of returning null, which causes
  // the white blank screen on web when fonts load slowly or fail.
  if (!fontsLoaded && !fontError) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <AccessibilityProvider>
            <AppPreferenceProvider>
              <NavigationContainer
                onReady={onLayoutRootView}
                fallback={<LoadingScreen />}
              >
                <AppNavigator />
                <ThemedStatusBar />
              </NavigationContainer>
            </AppPreferenceProvider>
          </AccessibilityProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
