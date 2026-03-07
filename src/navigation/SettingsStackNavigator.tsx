import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../models';

// Views – Settings
import AccessibilityScreen from '../views/main/AccessibilityScreen';
import NotificationsScreen from '../views/main/NotificationsScreen';
import AppPreferenceScreen from '../views/main/AppPreferenceScreen';
import ProfileSettingsScreen from '../views/main/ProfileSettingsScreen';
import LoginDevicesScreen from '../views/main/LoginDevicesScreen';
import TwoFactorSettingsScreen from '../views/main/TwoFactorSettingsScreen';
import { SettingsScreen } from '../views/main';

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

const SettingsStackNavigator = () => {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStack.Screen name="Accessibility" component={AccessibilityScreen} />
      <SettingsStack.Screen name="Notifications" component={NotificationsScreen} />
      <SettingsStack.Screen name="AppPreferences" component={AppPreferenceScreen} />
      <SettingsStack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
      <SettingsStack.Screen name="LoginDevices" component={LoginDevicesScreen} />
      <SettingsStack.Screen name="TwoFactorSettings" component={TwoFactorSettingsScreen} />
    </SettingsStack.Navigator>
  );
};

export default SettingsStackNavigator;
