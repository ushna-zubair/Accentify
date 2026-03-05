import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
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

// ═══════════════════════════════════════════════
//  WEB ALERT HELPER
// ═══════════════════════════════════════════════
const isWeb = Platform.OS === 'web';

function webAlert(title: string, message?: string) {
  if (isWeb) {
    // eslint-disable-next-line no-restricted-globals
    alert(message ? `${title}\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

function webConfirm(title: string, message: string, onConfirm: () => void) {
  if (isWeb) {
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`${title}\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

// ═══════════════════════════════════════════════
//  SETTINGS ITEM DATA
// ═══════════════════════════════════════════════

interface SettingsItemData {
  key: string;
  label: string;
  description: string;
  iconSet: 'ionicons' | 'mci' | 'feather';
  iconName: string;
  route?: keyof SettingsStackParamList;
  comingSoon?: boolean;
}

const SETTINGS_ITEMS: SettingsItemData[] = [
  {
    key: 'profile',
    label: 'Profile Settings',
    description: 'Update your name, photo, and account details',
    iconSet: 'ionicons',
    iconName: 'person-circle-outline',
    route: 'ProfileSettings',
  },
  {
    key: 'accessibility',
    label: 'Accessibility',
    description: 'Color-blind modes, font styles, and more',
    iconSet: 'mci',
    iconName: 'file-search-outline',
    route: 'Accessibility',
  },
  {
    key: 'privacy',
    label: 'Privacy & Security',
    description: 'Two-factor auth, login devices, and privacy',
    iconSet: 'mci',
    iconName: 'shield-lock-outline',
    comingSoon: true,
  },
  {
    key: 'preferences',
    label: 'App Preferences',
    description: 'Theme, accent color, and font size',
    iconSet: 'mci',
    iconName: 'pencil-outline',
    route: 'AppPreferences',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    description: 'Manage alerts, reminders, and updates',
    iconSet: 'ionicons',
    iconName: 'notifications-outline',
    route: 'Notifications',
  },
  {
    key: 'payment',
    label: 'Payment Options',
    description: 'Billing, subscriptions, and payment methods',
    iconSet: 'ionicons',
    iconName: 'card-outline',
    comingSoon: true,
  },
];

// ═══════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════

/** Renders the icon for each settings item */
const SettingsIcon: React.FC<{
  iconSet: string;
  iconName: string;
  size: number;
  color: string;
}> = ({ iconSet, iconName, size, color }) => {
  if (iconSet === 'ionicons')
    return <Ionicons name={iconName as any} size={size} color={color} />;
  if (iconSet === 'mci')
    return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
  return <Feather name={iconName as any} size={size} color={color} />;
};

// ─── Mobile Settings Row ───
const MobileSettingsItem: React.FC<{
  item: SettingsItemData;
  onPress: () => void;
  tc: ThemeColors;
  fs: ThemeFontSizes;
}> = ({ item, onPress, tc, fs }) => (
  <TouchableOpacity
    style={[mobileStyles.settingsItem, { backgroundColor: tc.accent }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[mobileStyles.settingsItemText, { color: tc.textOnAccent, fontSize: fs.body }]}>
      {item.label}
    </Text>
    <View style={mobileStyles.settingsItemIcon}>
      <SettingsIcon iconSet={item.iconSet} iconName={item.iconName} size={28} color={tc.accentLight} />
    </View>
  </TouchableOpacity>
);

// ─── Web Settings Card ───
const WebSettingsCard: React.FC<{
  item: SettingsItemData;
  onPress: () => void;
  tc: ThemeColors;
  fs: ThemeFontSizes;
  styles: ReturnType<typeof createWebStyles>;
}> = ({ item, onPress, tc, fs, styles }) => (
  <TouchableOpacity
    style={styles.card}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <View style={styles.cardIconContainer}>
      <SettingsIcon iconSet={item.iconSet} iconName={item.iconName} size={26} color={tc.accent} />
    </View>
    <View style={styles.cardTextContainer}>
      <Text style={[styles.cardTitle, { fontSize: fs.body }]}>{item.label}</Text>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {item.description}
      </Text>
      {item.comingSoon && (
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        </View>
      )}
    </View>
    <Ionicons name="chevron-forward" size={20} color={tc.textMuted} />
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const SettingsScreen: React.FC = () => {
  const { signOut } = useAuth();
  const { handleScroll } = useTabBarScroll();
  const [loggingOut, setLoggingOut] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { colors: tc, fontSizes: fs, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWide = isWeb && width >= 700;
  const isExtraWide = isWeb && width >= 1100;
  const webStyles = useMemo(() => createWebStyles(tc, width, isDark), [tc, width, isDark]);

  const handleLogout = () => {
    const doLogout = async () => {
      setLoggingOut(true);
      try {
        await signOut();
      } catch (e) {
        console.error('Logout error:', e);
        webAlert('Error', 'Failed to log out. Please try again.');
      } finally {
        setLoggingOut(false);
      }
    };

    webConfirm('Log Out', 'Are you sure you want to log out?', doLogout);
  };

  const handleItemPress = (item: SettingsItemData) => {
    if (item.comingSoon) {
      webAlert(item.label, `${item.label} coming soon!`);
      return;
    }
    if (item.route) {
      navigation.navigate(item.route as any);
    }
  };

  // ── Web layout ──
  if (isWide) {
    const gridCols = isExtraWide ? 3 : 2;
    return (
      <View style={webStyles.container}>
        <ScrollView
          contentContainerStyle={webStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={webStyles.headerSection}>
            <Text style={[webStyles.pageTitle, { fontSize: Math.max(fs.title, 28) }]}>
              Settings
            </Text>
            <Text style={webStyles.pageSubtitle}>Manage your account, preferences, and more</Text>
          </View>

          {/* Settings Grid */}
          <View style={[webStyles.grid, { maxWidth: isExtraWide ? 960 : 680 }]}>
            {SETTINGS_ITEMS.map((item) => (
              <View key={item.key} style={{ width: `${(100 / gridCols) - 2}%` as any }}>
                <WebSettingsCard
                  item={item}
                  onPress={() => handleItemPress(item)}
                  tc={tc}
                  fs={fs}
                  styles={webStyles}
                />
              </View>
            ))}
          </View>

          {/* Logout */}
          <View style={webStyles.logoutSection}>
            <TouchableOpacity
              style={webStyles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator color={tc.error} />
              ) : (
                <>
                  <Feather name="log-out" size={18} color={tc.error} />
                  <Text style={[webStyles.logoutText, { fontSize: fs.body }]}>Sign Out</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Mobile layout ──
  return (
    <SafeAreaView style={[mobileStyles.safeArea, { backgroundColor: tc.background }]}>
      <ScrollView
        style={mobileStyles.container}
        contentContainerStyle={mobileStyles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Text style={[mobileStyles.title, { color: tc.text, fontSize: fs.title }]}>Settings</Text>

        <View style={mobileStyles.itemsWrapper}>
          {SETTINGS_ITEMS.map((item) => (
            <MobileSettingsItem
              key={item.key}
              item={item}
              onPress={() => handleItemPress(item)}
              tc={tc}
              fs={fs}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[mobileStyles.logoutButton, { borderColor: tc.error }]}
          onPress={handleLogout}
          activeOpacity={0.7}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color={tc.error} />
          ) : (
            <>
              <Text style={[mobileStyles.logoutText, { color: tc.error, fontSize: fs.body }]}>
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

// ═══════════════════════════════════════════════
//  MOBILE STYLES (original look)
// ═══════════════════════════════════════════════

const mobileStyles = StyleSheet.create({
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

// ═══════════════════════════════════════════════
//  WEB STYLES (responsive card grid)
// ═══════════════════════════════════════════════

const createWebStyles = (tc: ThemeColors, screenWidth: number, isDark: boolean) => {
  const bgColor = isDark ? tc.background : '#F5F6FA';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bgColor,
    },
    scrollContent: {
      paddingHorizontal: screenWidth >= 1100 ? 48 : 32,
      paddingTop: 32,
      paddingBottom: 48,
    },

    // Header
    headerSection: {
      marginBottom: 28,
    },
    pageTitle: {
      fontFamily: fonts.bold,
      color: tc.text,
      marginBottom: 6,
    },
    pageSubtitle: {
      fontFamily: fonts.regular,
      fontSize: 15,
      color: tc.textLight,
    },

    // Grid
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },

    // Card
    card: {
      backgroundColor: tc.surface,
      borderRadius: 14,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: tc.cardBorder,
      marginBottom: 0,
      ...(Platform.OS === 'web'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.2 : 0.06,
            shadowRadius: 10,
          }
        : {}),
    },
    cardIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: tc.accentBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    cardTextContainer: {
      flex: 1,
      marginRight: 8,
    },
    cardTitle: {
      fontFamily: fonts.semiBold,
      color: tc.text,
      marginBottom: 4,
    },
    cardDescription: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: tc.textLight,
      lineHeight: 18,
    },
    comingSoonBadge: {
      alignSelf: 'flex-start',
      backgroundColor: tc.warningBg,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      marginTop: 6,
    },
    comingSoonText: {
      fontFamily: fonts.medium,
      fontSize: 10,
      color: tc.warningDeep,
    },

    // Logout
    logoutSection: {
      marginTop: 32,
      alignItems: 'flex-start',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: tc.error,
      backgroundColor: tc.errorBg,
    },
    logoutText: {
      fontFamily: fonts.semiBold,
      color: tc.error,
    },
  });
};

export default SettingsScreen;
