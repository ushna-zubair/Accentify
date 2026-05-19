import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useAuth } from '../../context/AuthContext';
import {
  get2FAStatus,
  send2FACode,
  verify2FACode,
} from '../../services/twoFactorService';
import type { SettingsStackParamList } from '../../models';

const isWeb = Platform.OS === 'web';

/** Web-safe alert */
const webAlert = (title: string, message?: string) => {
  if (isWeb) {
    window.alert(message ? `${title}\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};

type Props = NativeStackScreenProps<SettingsStackParamList, 'TwoFactorSettings'>;
type ScreenStep = 'overview' | 'linkSent';

const TwoFactorSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors: tc } = useAppTheme();
  const { width } = useWindowDimensions();
  const isWide = isWeb && width >= 700;
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { currentUser, reloadUser } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [step, setStep] = useState<ScreenStep>('overview');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [pendingAction, setPendingAction] = useState<'enable' | 'disable'>('enable');
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Animations ─────────────────────────────────────────────────────────────
  const floatY = useSharedValue(0);
  const shieldScale = useSharedValue(1);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000, easing: Easing.bezier(0.42, 0, 0.58, 1) }),
        withTiming(0, { duration: 2000, easing: Easing.bezier(0.42, 0, 0.58, 1) }),
      ),
      -1,
      true,
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const shieldStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shieldScale.value }],
  }));

  const pulseShield = () => {
    shieldScale.value = withSpring(1.15, { damping: 6 }, () => {
      shieldScale.value = withSpring(1);
    });
  };

  // ── Cooldown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ── Fetch current 2FA status ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const status = await get2FAStatus(currentUser.uid);
        setIs2FAEnabled(status.enabled);
      } catch {
        // Default to off
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser]);

  // ── Toggle: send verification link ────────────────────────────────────────
  const handleToggle = useCallback(async () => {
    const action: 'enable' | 'disable' = is2FAEnabled ? 'disable' : 'enable';
    setPendingAction(action);
    setSending(true);

    try {
      const result = await send2FACode(action);
      setMaskedEmail(result.maskedEmail);
      setStep('linkSent');
      setResendCooldown(60);
      pulseShield();
    } catch (e: unknown) {
      webAlert('Error', e instanceof Error ? e.message : 'Failed to send verification link.');
    } finally {
      setSending(false);
    }
  }, [is2FAEnabled]);

  // ── Check verification link was clicked ───────────────────────────────────
  const handleVerified = useCallback(async () => {
    setVerifying(true);

    try {
      // Reload the Firebase user to get the latest emailVerified flag
      await reloadUser();
      const result = await verify2FACode('', pendingAction);
      setIs2FAEnabled(result.enabled);
      setStep('overview');
      pulseShield();
      webAlert(
        'Success ✓',
        result.enabled
          ? 'Two-Factor Authentication has been enabled.'
          : 'Two-Factor Authentication has been disabled.',
      );
    } catch (e: unknown) {
      webAlert(
        'Not Verified Yet',
        e instanceof Error
          ? e.message
          : 'Please click the verification link in your email first, then try again.',
      );
    } finally {
      setVerifying(false);
    }
  }, [pendingAction, reloadUser]);

  // ── Resend link ────────────────────────────────────────────────────────────
  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    setSending(true);

    try {
      const result = await send2FACode(pendingAction);
      setMaskedEmail(result.maskedEmail);
      setResendCooldown(60);
      webAlert('Link Sent', 'A new verification link has been sent to your email.');
    } catch (e: unknown) {
      webAlert('Error', e instanceof Error ? e.message : 'Failed to resend link.');
    } finally {
      setSending(false);
    }
  }, [pendingAction, resendCooldown]);

  // ── Open email app ─────────────────────────────────────────────────────────
  const handleOpenEmail = async () => {
    const url = Platform.OS === 'ios' ? 'message://' : 'mailto:';
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    const Wrapper = isWide ? View : SafeAreaView;
    return (
      <Wrapper style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tc.accent} />
          <Text style={styles.loadingText}>Loading security settings…</Text>
        </View>
      </Wrapper>
    );
  }

  // ── Link Sent Step ─────────────────────────────────────────────────────────
  if (step === 'linkSent') {
    const Wrapper = isWide ? View : SafeAreaView;
    return (
      <Wrapper style={styles.safeArea}>
        <View style={[styles.container, isWide && { maxWidth: 500, alignSelf: 'center' as any, width: '100%' as any }]}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setStep('overview')}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={tc.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Verify Your Email</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.linkSentContent}>

            {/* Animated envelope icon */}
            <Animated.View style={[styles.iconCircle, floatStyle]}>
              <Ionicons name="mail-open-outline" size={52} color={tc.accent} />
            </Animated.View>

            <Text style={styles.linkSentTitle}>Check Your Email</Text>

            <Text style={styles.linkSentSubtitle}>
              We've sent a verification link to{'\n'}
              <Text style={{ fontFamily: fonts.semiBold, color: tc.text }}>
                {maskedEmail}
              </Text>
              {'\n\n'}Click the link in the email, then come back and tap the button below.
            </Text>

            {/* Security notice */}
            <View style={styles.securityNotice}>
              <Ionicons name="time-outline" size={14} color={tc.textLight} />
              <Text style={styles.securityText}>Link expires in 1 hour</Text>
            </View>

            {/* Open email app */}
            <TouchableOpacity
              style={styles.openEmailBtn}
              onPress={handleOpenEmail}
              activeOpacity={0.8}
            >
              <Ionicons name="open-outline" size={18} color={tc.white} />
              <Text style={styles.openEmailText}>Open Email App</Text>
            </TouchableOpacity>

            {/* I've clicked the link */}
            <TouchableOpacity
              style={[styles.verifiedBtn, verifying && styles.btnDisabled]}
              onPress={handleVerified}
              disabled={verifying}
              activeOpacity={0.8}
            >
              {verifying ? (
                <ActivityIndicator color={tc.accent} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color={tc.accent} />
                  <Text style={styles.verifiedBtnText}>I've Clicked the Link</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Resend link */}
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendCooldown > 0 || sending}
              style={styles.resendBtn}
            >
              {sending ? (
                <ActivityIndicator color={tc.accent} size="small" />
              ) : (
                <Text style={[styles.resendText, resendCooldown > 0 && styles.resendDisabled]}>
                  {resendCooldown > 0
                    ? `Resend link in ${resendCooldown}s`
                    : 'Resend Verification Link'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Wrapper>
    );
  }

  // ── Overview Step ──────────────────────────────────────────────────────────
  const Wrapper = isWide ? View : SafeAreaView;
  return (
    <Wrapper style={styles.safeArea}>
      <View style={[styles.container, isWide && { maxWidth: 600, alignSelf: 'center' as any, width: '100%' as any }]}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={tc.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Two-Factor Authentication</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Animated shield */}
        <View style={styles.illustrationContainer}>
          <Animated.View style={[styles.illustrationCircle, shieldStyle]}>
            <Ionicons
              name={is2FAEnabled ? 'shield-checkmark' : 'shield-outline'}
              size={64}
              color={is2FAEnabled ? tc.success : tc.textLight}
            />
          </Animated.View>
        </View>

        {/* Status */}
        <Text style={styles.statusTitle}>
          {is2FAEnabled ? '2FA is Enabled' : '2FA is Disabled'}
        </Text>
        <Text style={styles.statusSubtitle}>
          {is2FAEnabled
            ? 'Your account is protected with an extra layer of email verification.'
            : 'Add an extra layer of security. You\'ll receive a verification link via email.'}
        </Text>

        {/* Toggle card */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="mail-outline" size={22} color={tc.accent} />
              <View style={styles.toggleTextBlock}>
                <Text style={styles.toggleLabel}>Email Verification Link</Text>
                <Text style={styles.toggleDesc}>
                  Firebase sends a secure link to your email
                </Text>
              </View>
            </View>
            <Switch
              value={is2FAEnabled}
              onValueChange={handleToggle}
              trackColor={{ false: tc.inputBorder, true: tc.accentLight }}
              thumbColor={is2FAEnabled ? tc.accent : tc.textMuted}
              disabled={sending}
            />
          </View>
        </View>

        {/* How it works card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={tc.accent} />
          <Text style={styles.infoText}>
            When enabled, toggling 2FA sends a secure verification link to your registered email — no codes to enter.
          </Text>
        </View>

        {/* Steps */}
        <View style={styles.stepsCard}>
          {[
            { icon: 'toggle-outline', text: 'Tap the toggle to enable or disable 2FA' },
            { icon: 'mail-outline', text: 'Firebase sends a secure verification link' },
            { icon: 'checkmark-circle-outline', text: 'Click the link and confirm in the app' },
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNum}>{i + 1}</Text>
              </View>
              <Ionicons name={step.icon as any} size={18} color={tc.accent} style={styles.stepIcon} />
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {sending && (
          <View style={styles.sendingOverlay}>
            <ActivityIndicator size="large" color={tc.accent} />
            <Text style={styles.sendingText}>Sending verification link…</Text>
          </View>
        )}
      </View>
    </Wrapper>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (tc: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: tc.background },
    container: { flex: 1, paddingHorizontal: 20 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: {
      fontFamily: fonts.medium,
      fontSize: 16,
      color: tc.textLight,
      marginTop: 12,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: tc.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontFamily: fonts.bold, fontSize: 18, color: tc.text },

    // Illustration
    illustrationContainer: { alignItems: 'center', marginVertical: 28 },
    illustrationCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: tc.accentLight + '40',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Status
    statusTitle: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: tc.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    statusSubtitle: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: tc.textLight,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 28,
      paddingHorizontal: 12,
    },

    // Toggle card
    toggleCard: {
      backgroundColor: tc.surface,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: tc.accentLight,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginBottom: 16,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    toggleTextBlock: { flex: 1 },
    toggleLabel: { fontFamily: fonts.semiBold, fontSize: 15, color: tc.text, marginBottom: 2 },
    toggleDesc: { fontFamily: fonts.regular, fontSize: 12, color: tc.textLight },

    // Info card
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: tc.accentLight + '30',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    infoText: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: tc.text,
      flex: 1,
      lineHeight: 19,
    },

    // Steps card
    stepsCard: {
      backgroundColor: tc.surfaceAlt,
      borderRadius: 14,
      padding: 16,
      gap: 14,
    },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: tc.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNum: { fontFamily: fonts.bold, fontSize: 11, color: tc.white },
    stepIcon: { marginRight: 2 },
    stepText: { fontFamily: fonts.regular, fontSize: 13, color: tc.textLight, flex: 1 },

    // Sending overlay
    sendingOverlay: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: tc.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12,
    },
    sendingText: {
      fontFamily: fonts.medium,
      fontSize: 15,
      color: tc.white,
      marginTop: 12,
    },

    // ── Link Sent Step ──
    linkSentContent: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 24,
    },
    iconCircle: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: tc.accentLight + '40',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    linkSentTitle: {
      fontFamily: fonts.bold,
      fontSize: 24,
      color: tc.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    linkSentSubtitle: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: tc.textLight,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 20,
      paddingHorizontal: 8,
    },
    securityNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 28,
    },
    securityText: { fontFamily: fonts.regular, fontSize: 12, color: tc.textLight },

    // Open email button (primary)
    openEmailBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: tc.accent,
      borderRadius: 28,
      paddingVertical: 14,
      paddingHorizontal: 32,
      width: '100%',
      marginBottom: 12,
      shadowColor: tc.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    openEmailText: { fontFamily: fonts.bold, fontSize: 16, color: tc.white },

    // Verified button (outline)
    verifiedBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 2,
      borderColor: tc.accent,
      borderRadius: 28,
      paddingVertical: 14,
      paddingHorizontal: 32,
      width: '100%',
      marginBottom: 20,
    },
    verifiedBtnText: { fontFamily: fonts.bold, fontSize: 16, color: tc.accent },
    btnDisabled: { opacity: 0.5 },

    // Resend
    resendBtn: { paddingVertical: 8 },
    resendText: { fontFamily: fonts.semiBold, fontSize: 14, color: tc.accent },
    resendDisabled: { color: tc.textLight },
  });

export default TwoFactorSettingsScreen;
