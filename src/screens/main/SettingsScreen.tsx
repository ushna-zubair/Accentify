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
import colors from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../navigation/AppNavigator';

interface SettingsItemProps {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ label, icon, onPress }) => (
  <TouchableOpacity style={styles.settingsItem} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.settingsItemText}>{label}</Text>
    <View style={styles.settingsItemIcon}>{icon}</View>
  </TouchableOpacity>
);

const SettingsScreen: React.FC = () => {
  const { signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

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
    // Placeholder for future navigation to sub-settings screens
    Alert.alert(section, `${section} coming soon!`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        <View style={styles.itemsWrapper}>
          <SettingsItem
            label="Profile Settings"
            icon={<Ionicons name="person-circle-outline" size={28} color={colors.primary} />}
            onPress={() => handleSettingsPress('Profile Settings')}
          />

          <SettingsItem
            label="Accessibility"
            icon={<MaterialCommunityIcons name="file-search-outline" size={28} color={colors.primary} />}
            onPress={() => navigation.navigate('Accessibility')}
          />

          <SettingsItem
            label="Privacy & Security"
            icon={<MaterialCommunityIcons name="shield-lock-outline" size={28} color={colors.primary} />}
            onPress={() => handleSettingsPress('Privacy & Security')}
          />

          <SettingsItem
            label="App Preferences"
            icon={<MaterialCommunityIcons name="pencil-outline" size={28} color={colors.primary} />}
            onPress={() => handleSettingsPress('App Preferences')}
          />

          <SettingsItem
            label="Notifications"
            icon={<Ionicons name="notifications-outline" size={28} color={colors.primary} />}
            onPress={() => navigation.navigate('Notifications')}
          />

          <SettingsItem
            label="Payment Options"
            icon={<Ionicons name="people-outline" size={28} color={colors.primary} />}
            onPress={() => handleSettingsPress('Payment Options')}
          />
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color={colors.error} />
          ) : (
            <>
              <Text style={styles.logoutText}>Log out</Text>
              <Feather name="log-out" size={22} color={colors.error} />
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
    backgroundColor: colors.background,
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
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
  },
  itemsWrapper: {
    gap: 14,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  settingsItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
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
    borderColor: colors.error,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
});

export default SettingsScreen;
