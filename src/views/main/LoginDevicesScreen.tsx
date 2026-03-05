import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useLoginDevicesController } from '../../controllers/useLoginDevicesController';
import type { LoginDevice, DevicePlatform } from '../../models';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../models';

const isWeb = Platform.OS === 'web';

// ─── Helpers ───

const PLATFORM_ICON: Record<DevicePlatform, { name: string; set: 'ion' | 'mci' }> = {
  ios: { name: 'logo-apple', set: 'ion' },
  android: { name: 'logo-android', set: 'ion' },
  web: { name: 'monitor', set: 'mci' },
};

// ─── Sub-components ───

interface DeviceCardProps {
  device: LoginDevice;
  onRevoke: (id: string) => void;
  revoking: boolean;
  tc: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onRevoke, revoking, tc, styles }) => {
  const iconCfg = PLATFORM_ICON[device.platform];

  return (
    <View style={[styles.card, device.isCurrent && styles.cardCurrent]}>
      <View style={styles.cardBody}>
        {/* Icon */}
        <View style={[styles.iconCircle, device.isCurrent && styles.iconCircleCurrent]}>
          {iconCfg.set === 'ion' ? (
            <Ionicons
              name={iconCfg.name as any}
              size={24}
              color={device.isCurrent ? tc.white : tc.accent}
            />
          ) : (
            <MaterialCommunityIcons
              name={iconCfg.name as any}
              size={24}
              color={device.isCurrent ? tc.white : tc.accent}
            />
          )}
        </View>

        {/* Info */}
        <View style={styles.infoColumn}>
          <View style={styles.nameRow}>
            <Text style={styles.deviceName} numberOfLines={1}>
              {device.deviceName}
            </Text>
            {device.isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>This Device</Text>
              </View>
            )}
          </View>

          <Text style={styles.meta}>
            Last active: {device.lastActiveAt}
          </Text>

          {device.location ? (
            <Text style={styles.meta}>
              <Ionicons name="location-outline" size={11} color={tc.textMuted} />{' '}
              {device.location}
            </Text>
          ) : null}

          {device.ipAddress ? (
            <Text style={styles.meta}>IP: {device.ipAddress}</Text>
          ) : null}
        </View>
      </View>

      {/* Revoke button (only for non-current devices) */}
      {!device.isCurrent && (
        <TouchableOpacity
          style={styles.revokeBtn}
          onPress={() => onRevoke(device.id)}
          activeOpacity={0.7}
          disabled={revoking}
        >
          {revoking ? (
            <ActivityIndicator size="small" color={tc.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={16} color={tc.error} />
              <Text style={styles.revokeText}>Revoke</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Main Screen ───

type Props = NativeStackScreenProps<SettingsStackParamList, 'LoginDevices'>;

const LoginDevicesScreen: React.FC<Props> = ({ navigation }) => {
  const { devices, loading, revoking, revokeDevice } = useLoginDevicesController();
  const { colors: tc } = useAppTheme();
  const { width } = useWindowDimensions();
  const isWide = isWeb && width >= 700;
  const styles = useMemo(() => createStyles(tc), [tc]);

  const renderItem = ({ item }: { item: LoginDevice }) => (
    <DeviceCard
      device={item}
      onRevoke={revokeDevice}
      revoking={revoking === item.id}
      tc={tc}
      styles={styles}
    />
  );

  const Container = isWide ? View : SafeAreaView;

  return (
    <Container style={styles.safeArea}>
      {/* Header */}
      <View style={[styles.header, isWide && { maxWidth: 780, alignSelf: 'center' as any, width: '100%' as any }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={tc.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Login Devices</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={[styles.subtitle, isWide && { maxWidth: 780, alignSelf: 'center' as any, width: '100%' as any }]}>
        Devices where your account is currently signed in. You can revoke access to any device you
        don't recognize.
      </Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tc.accent} />
          <Text style={styles.loadingText}>Loading devices…</Text>
        </View>
      ) : devices.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="devices" size={56} color={tc.textMuted} />
          <Text style={styles.emptyText}>No recorded login sessions.</Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, isWide && { maxWidth: 780, alignSelf: 'center' as any, width: '100%' as any }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </Container>
  );
};

// ─── Styles ───

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tc.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tc.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: tc.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: tc.textLight,
    paddingHorizontal: 20,
    marginBottom: 16,
    lineHeight: 19,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // ─── Device Card ───
  card: {
    backgroundColor: tc.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: tc.cardBorder,
    padding: 14,
  },
  cardCurrent: {
    borderColor: tc.accent,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: tc.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleCurrent: {
    backgroundColor: tc.accent,
  },
  infoColumn: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  deviceName: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: tc.text,
    flexShrink: 1,
  },
  currentBadge: {
    backgroundColor: tc.successBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    color: tc.success,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: tc.textLight,
    lineHeight: 17,
  },
  // ─── Revoke ───
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: tc.error,
  },
  revokeText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: tc.error,
  },
  // ─── States ───
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: tc.textLight,
    marginTop: 12,
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: tc.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default LoginDevicesScreen;
