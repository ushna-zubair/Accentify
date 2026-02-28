import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '../../theme/typography';
import { useAuth } from '../../context/AuthContext';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../models';
import type { ThemeColors, ThemeFontSizes } from '../../hooks/useAppTheme';

interface SettingsItemProps {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  tc: ThemeColors;
  fs: ThemeFontSizes;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ label, icon, onPress, tc, fs }) => (
  <TouchableOpacity
    style={[styles.settingsItem, { backgroundColor: tc.accent }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.settingsItemText, { color: tc.textOnAccent, fontSize: fs.body }]}>
      {label}
    </Text>
    <View style={styles.settingsItemIcon}>{icon}</View>
  </TouchableOpacity>
);

const SettingsScreen: React.FC = () => {
  const { signOut } = useAuth();
  const { handleScroll } = useTabBarScroll();
  const [loggingOut, setLoggingOut] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { colors: tc, fontSizes: fs } = useAppTheme();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await signOut();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
    );
  };

  const handleSettingsPress = (section: string) => {
    Alert.alert(section, `${section} coming soon!`);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: tc.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Text style={[styles.title, { color: tc.text, fontSize: fs.title }]}>Settings</Text>

        <View style={styles.itemsWrapper}>
          <SettingsItem
            label="Profile Settings"
            icon={<Ionicons name="person-circle-outline" size={28} color={tc.accentLight} />}
            onPress={() => navigation.navigate('ProfileSettings')}
            tc={tc}
            fs={fs}
          />

          <SettingsItem
            label="Accessibility"
            icon={<MaterialCommunityIcons name="file-search-outline" size={28} color={tc.accentLight} />}
            onPress={() => navigation.navigate('Accessibility')}
            tc={tc}
            fs={fs}
          />

          <SettingsItem
            label="Privacy & Security"
            icon={<MaterialCommunityIcons name="shield-lock-outline" size={28} color={tc.accentLight} />}
            onPress={() => handleSettingsPress('Privacy & Security')}
            tc={tc}
            fs={fs}
          />

          <SettingsItem
            label="App Preferences"
            icon={<MaterialCommunityIcons name="pencil-outline" size={28} color={tc.accentLight} />}
            onPress={() => navigation.navigate('AppPreferences')}
            tc={tc}
            fs={fs}
          />

          <SettingsItem
            label="Notifications"
            icon={<Ionicons name="notifications-outline" size={28} color={tc.accentLight} />}
            onPress={() => navigation.navigate('Notifications')}
            tc={tc}
            fs={fs}
          />

          <SettingsItem
            label="Payment Options"
            icon={<Ionicons name="people-outline" size={28} color={tc.accentLight} />}
            onPress={() => handleSettingsPress('Payment Options')}
            tc={tc}
            fs={fs}
          />
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: tc.error }]}
          onPress={handleLogout}
          activeOpacity={0.7}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color={tc.error} />
          ) : (
            <>
              <Text style={[styles.logoutText, { color: tc.error, fontSize: fs.body }]}>
                Log out
              </Text>
              <Feather name="log-out" size={22} color={tc.error} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  title: {
    fontFamily: fonts.bold,
    marginBottom: 24,
  },
  itemsWrapper: {
    gap: 14,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  settingsItemText: {
    fontFamily: fonts.semiBold,
  },
  settingsItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 10,
  },
  logoutText: {
    fontFamily: fonts.semiBold,
  },
});

export default SettingsScreen;
