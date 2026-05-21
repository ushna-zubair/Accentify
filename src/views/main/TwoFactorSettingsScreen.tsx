/**
 * TwoFactorSettingsScreen — TOTP-based 2FA management.
 *
 * States:
 *   overview   – show current status (enabled / disabled), big toggle button
 *   enrolling  – show QR code + secret + 6-digit input to confirm setup
 *   disabling  – show 6-digit input (must enter a current code to disable)
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  TextInput,
  ScrollView,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useAuth } from '../../context/AuthContext';
import {
  get2FAStatus,
  enrollTotp,
  confirmTotpEnrollment,
  disableTotp,
} from '../../services/twoFactorService';
import type { SettingsStackParamList } from '../../models';

const isWeb = Platform.OS === 'web';

const webAlert = (title: string, message?: string) => {
  if (isWeb) window.alert(message ? `${title}\n${message}` : title);
  else Alert.alert(title, message);
};

type Props = NativeStackScreenProps<SettingsStackParamList, 'TwoFactorSettings'>;
type Step = 'overview' | 'enrolling' | 'disabling';

const TwoFactorSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors: tc } = useAppTheme();
  const { width } = useWindowDimensions();
  const isWide = isWeb && width >= 700;
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { currentUser } = useAuth();

  const [step, setStep] = useState<Step>('overview');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  // Enrollment state
  const [secret, setSecret] = useState<string>('');
  const [otpauthUrl, setOtpauthUrl] = useState<string>('');
  const [code, setCode] = useState('');

  // ── Initial fetch ──
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const s = await get2FAStatus(currentUser.uid);
        setEnabled(s.enabled);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser]);

  // ── Start enrollment ──
  const startEnroll = useCallback(async () => {
    setWorking(true);
    try {
      const result = await enrollTotp();
      setSecret(result.secret);
      setOtpauthUrl(result.otpauthUrl);
      setCode('');
      setStep('enrolling');
    } catch (e: any) {
      webAlert('Could not start setup', e?.message ?? 'Unknown error');
    } finally {
      setWorking(false);
    }
  }, []);

  // ── Confirm enrollment ──
  const submitEnrollCode = useCallback(async () => {
    if (!/^\d{6}$/.test(code)) {
      webAlert('Invalid code', 'Enter the 6-digit code from your authenticator app.');
      return;
    }
    setWorking(true);
    try {
      await confirmTotpEnrollment(code);
      setEnabled(true);
      setStep('overview');
      setCode('');
      setSecret('');
      setOtpauthUrl('');
      webAlert('2FA Enabled', 'Two-Factor Authentication is now active on your account.');
    } catch (e: any) {
      webAlert('Verification failed', e?.message ?? 'Try again.');
    } finally {
      setWorking(false);
    }
  }, [code]);

  // ── Start disable ──
  const startDisable = useCallback(() => {
    setCode('');
    setStep('disabling');
  }, []);

  // ── Submit disable code ──
  const submitDisableCode = useCallback(async () => {
    if (!/^\d{6}$/.test(code)) {
      webAlert('Invalid code', 'Enter the 6-digit code from your authenticator app.');
      return;
    }
    setWorking(true);
    try {
      await disableTotp(code);
      setEnabled(false);
      setStep('overview');
      setCode('');
      webAlert('2FA Disabled', 'Two-Factor Authentication has been turned off.');
    } catch (e: any) {
      webAlert('Could not disable', e?.message ?? 'Try again.');
    } finally {
      setWorking(false);
    }
  }, [code]);

  const copySecret = useCallback(() => {
    if (!secret) return;
    if (isWeb && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(secret);
    } else {
      Clipboard.setString(secret);
    }
    webAlert('Copied', 'Secret copied to clipboard.');
  }, [secret]);

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tc.accent} />
          <Text style={styles.dim}>Loading security settings…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isWide && { maxWidth: 560, alignSelf: 'center', width: '100%' },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (step === 'overview' ? navigation.goBack() : setStep('overview'))}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={tc.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Two-Factor Authentication</Text>
          <View style={{ width: 36 }} />
        </View>

        {step === 'overview' && (
          <>
            <View style={styles.shieldWrap}>
              <View style={[styles.shieldCircle, enabled && styles.shieldCircleOn]}>
                <Ionicons
                  name={enabled ? 'shield-checkmark' : 'shield-outline'}
                  size={56}
                  color={enabled ? tc.success : tc.textLight}
                />
              </View>
            </View>

            <Text style={styles.statusTitle}>
              {enabled ? '2FA is Enabled' : '2FA is Disabled'}
            </Text>
            <Text style={styles.statusSub}>
              {enabled
                ? 'You will need a code from your authenticator app each time you sign in.'
                : 'Add an extra layer of security with an authenticator app (Google Authenticator, Authy, 1Password, etc.).'}
            </Text>

            {!enabled ? (
              <TouchableOpacity
                style={[styles.primaryBtn, working && styles.btnDisabled]}
                onPress={startEnroll}
                disabled={working}
              >
                {working ? (
                  <ActivityIndicator color={tc.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>Set Up 2FA</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={startDisable}
                disabled={working}
              >
                <Text style={styles.dangerBtnText}>Turn Off 2FA</Text>
              </TouchableOpacity>
            )}

            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={tc.accent} />
              <Text style={styles.infoText}>
                We never see your authenticator secret in plaintext — it's encrypted at rest.
                If you lose access to your authenticator app, contact support to reset.
              </Text>
            </View>
          </>
        )}

        {step === 'enrolling' && (
          <>
            <Text style={styles.stepTitle}>1. Scan this QR code</Text>
            <Text style={styles.stepDesc}>
              Open Google Authenticator, Authy, or 1Password and scan the code below.
            </Text>

            <View style={styles.qrWrap}>
              {otpauthUrl ? (
                <QRCode value={otpauthUrl} size={200} backgroundColor="#fff" color="#000" />
              ) : null}
            </View>

            <Text style={styles.stepTitle}>Or enter manually</Text>
            <TouchableOpacity onPress={copySecret} style={styles.secretBox}>
              <Text style={styles.secretText} selectable>
                {secret}
              </Text>
              <Ionicons name="copy-outline" size={18} color={tc.accent} />
            </TouchableOpacity>

            <Text style={styles.stepTitle}>2. Enter the 6-digit code</Text>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="123456"
              placeholderTextColor={tc.textMuted}
              maxLength={6}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (working || code.length !== 6) && styles.btnDisabled]}
              onPress={submitEnrollCode}
              disabled={working || code.length !== 6}
            >
              {working ? (
                <ActivityIndicator color={tc.white} />
              ) : (
                <Text style={styles.primaryBtnText}>Verify & Enable</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 'disabling' && (
          <>
            <Text style={styles.stepTitle}>Confirm to disable 2FA</Text>
            <Text style={styles.stepDesc}>
              Enter the current 6-digit code from your authenticator app to turn off 2FA.
            </Text>

            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="123456"
              placeholderTextColor={tc.textMuted}
              maxLength={6}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.dangerBtn, (working || code.length !== 6) && styles.btnDisabled]}
              onPress={submitDisableCode}
              disabled={working || code.length !== 6}
            >
              {working ? (
                <ActivityIndicator color={tc.white} />
              ) : (
                <Text style={styles.dangerBtnText}>Disable 2FA</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('overview')} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (tc: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: tc.background },
    scroll: { padding: 20, paddingBottom: 60 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    dim: { fontFamily: fonts.medium, color: tc.textLight, marginTop: 12 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: tc.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontFamily: fonts.bold, fontSize: 18, color: tc.text },

    shieldWrap: { alignItems: 'center', marginVertical: 16 },
    shieldCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: tc.accentLight + '40',
      alignItems: 'center',
      justifyContent: 'center',
    },
    shieldCircleOn: { backgroundColor: tc.success + '30' },

    statusTitle: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: tc.text,
      textAlign: 'center',
      marginTop: 8,
    },
    statusSub: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: tc.textLight,
      textAlign: 'center',
      lineHeight: 20,
      marginVertical: 12,
      paddingHorizontal: 8,
    },

    primaryBtn: {
      backgroundColor: tc.accent,
      borderRadius: 28,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 12,
    },
    primaryBtnText: { fontFamily: fonts.bold, fontSize: 16, color: tc.white },
    dangerBtn: {
      backgroundColor: tc.error,
      borderRadius: 28,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 12,
    },
    dangerBtnText: { fontFamily: fonts.bold, fontSize: 16, color: tc.white },
    btnDisabled: { opacity: 0.5 },
    cancelBtn: { paddingVertical: 14, alignItems: 'center' },
    cancelText: { fontFamily: fonts.semiBold, color: tc.textLight, fontSize: 14 },

    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: tc.accentLight + '30',
      borderRadius: 12,
      padding: 14,
      marginTop: 18,
    },
    infoText: { fontFamily: fonts.regular, fontSize: 13, color: tc.text, flex: 1, lineHeight: 19 },

    stepTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: tc.text, marginTop: 18, marginBottom: 6 },
    stepDesc: { fontFamily: fonts.regular, fontSize: 13, color: tc.textLight, marginBottom: 12, lineHeight: 19 },

    qrWrap: {
      alignSelf: 'center',
      padding: 16,
      backgroundColor: '#fff',
      borderRadius: 12,
      marginVertical: 12,
    },

    secretBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: tc.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 6,
    },
    secretText: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 14,
      color: tc.text,
      flex: 1,
      letterSpacing: 1,
    },

    codeInput: {
      backgroundColor: tc.surface,
      borderColor: tc.inputBorder,
      borderWidth: 1.5,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 22,
      fontFamily: fonts.bold,
      letterSpacing: 6,
      textAlign: 'center',
      color: tc.text,
      marginVertical: 12,
    },
  });

export default TwoFactorSettingsScreen;
