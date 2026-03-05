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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useAuth } from '../../context/AuthContext';
import { useCodeInput } from '../../hooks/useCodeInput';
import OTPInput from '../../components/OTPInput';
import NumberKeypad from '../../components/NumberKeypad';
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

type ScreenStep = 'overview' | 'verifying';

const TwoFactorSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors: tc } = useAppTheme();
  const { width } = useWindowDimensions();
  const isWide = isWeb && width >= 700;
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { currentUser } = useAuth();

  // State
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [step, setStep] = useState<ScreenStep>('overview');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [pendingAction, setPendingAction] = useState<'enable' | 'disable'>('enable');
  const [error, setError] = useState<string | null>(null);

  const { code, handleKeyPress, isComplete, reset, value } = useCodeInput(4);

  // Fetch current status
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

  // When code is complete, auto-verify
  useEffect(() => {
    if (isComplete && step === 'verifying') {
      handleVerify();
    }
  }, [isComplete]);

  // Send the code
  const handleToggle = useCallback(async () => {
    const action = is2FAEnabled ? 'disable' : 'enable';
    setPendingAction(action);
    setError(null);
    setSending(true);

    try {
      const result = await send2FACode(action);
      setMaskedEmail(result.maskedEmail);
      setStep('verifying');
      reset();
    } catch (e: any) {
      webAlert('Error', e.message || 'Failed to send verification code.');
    } finally {
      setSending(false);
    }
  }, [is2FAEnabled, reset]);

  // Verify code
  const handleVerify = useCallback(async () => {
    if (!value || value.length < 4) return;
    setVerifying(true);
    setError(null);

    try {
      const result = await verify2FACode(value, pendingAction);
      setIs2FAEnabled(result.enabled);
      setStep('overview');
      reset();
      webAlert(
        'Success',
        result.enabled
          ? 'Two-Factor Authentication has been enabled.'
          : 'Two-Factor Authentication has been disabled.',
      );
    } catch (e: any) {
      setError(e.message || 'Incorrect code. Please try again.');
      reset();
    } finally {
      setVerifying(false);
    }
  }, [value, pendingAction, reset]);

  // Resend code
  const handleResend = useCallback(async () => {
    setSending(true);
    setError(null);
    reset();

    try {
      const result = await send2FACode(pendingAction);
      setMaskedEmail(result.maskedEmail);
      webAlert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (e: any) {
      webAlert('Error', e.message || 'Failed to resend code.');
    } finally {
      setSending(false);
    }
  }, [pendingAction, reset]);

  // Loading state
  if (loading) {
    const LoadContainer = isWide ? View : SafeAreaView;
    return (
      <LoadContainer style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tc.accent} />
          <Text style={styles.loadingText}>Loading security settings…</Text>
        </View>
      </LoadContainer>
    );
  }

  // ─── Verification step ───
  if (step === 'verifying') {
    const VerifyContainer = isWide ? View : SafeAreaView;
    return (
      <VerifyContainer style={styles.safeArea}>
        <View style={[styles.container, isWide && { maxWidth: 500, alignSelf: 'center' as any, width: '100%' as any }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => { setStep('overview'); reset(); setError(null); }}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={tc.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Verify Your Identity</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.verifyContent}>
            {/* Lock icon */}
            <View style={styles.lockIcon}>
              <Ionicons name="shield-checkmark" size={48} color={tc.accent} />
            </View>

            <Text style={styles.verifyTitle}>
              {pendingAction === 'enable' ? 'Enable' : 'Disable'} Two-Factor Authentication
            </Text>

            <Text style={styles.verifySubtitle}>
              We've sent a 4-digit verification code to{'\n'}
              <Text style={{ fontFamily: fonts.semiBold, color: tc.text }}>
                {maskedEmail}
              </Text>
            </Text>

            {/* OTP Input */}
            <View style={styles.otpContainer}>
              {isWeb ? (
                <TextInput
                  style={styles.webCodeInput}
                  value={value}
                  onChangeText={(text) => {
                    // Only allow digits, max 4
                    const digits = text.replace(/\D/g, '').slice(0, 4);
                    // Simulate key presses for each new digit
                    reset();
                    for (const d of digits) {
                      handleKeyPress(d);
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="0000"
                  placeholderTextColor={tc.textMuted}
                  autoFocus
                />
              ) : (
                <OTPInput value={code} />
              )}
            </View>

            {/* Error */}
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* Verify button */}
            <TouchableOpacity
              style={[styles.verifyBtn, !isComplete && styles.verifyBtnDisabled]}
              activeOpacity={0.7}
              onPress={handleVerify}
              disabled={!isComplete || verifying}
            >
              {verifying ? (
                <ActivityIndicator color={tc.white} size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>Verify</Text>
              )}
            </TouchableOpacity>

            {/* Resend */}
            <TouchableOpacity
              style={styles.resendBtn}
              activeOpacity={0.6}
              onPress={handleResend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color={tc.accent} size="small" />
              ) : (
                <Text style={styles.resendBtnText}>Resend Code</Text>
              )}
            </TouchableOpacity>

            {/* Keypad – only on native */}
            {!isWeb && (
              <NumberKeypad onKeyPress={handleKeyPress} size="compact" style={styles.keypad} />
            )}
          </View>
        </View>
      </VerifyContainer>
    );
  }

  // ─── Overview step ───
  const OverviewContainer = isWide ? View : SafeAreaView;
  return (
    <OverviewContainer style={styles.safeArea}>
      <View style={[styles.container, isWide && { maxWidth: 600, alignSelf: 'center' as any, width: '100%' as any }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={tc.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Two-Factor Authentication</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationCircle}>
            <Ionicons
              name={is2FAEnabled ? 'shield-checkmark' : 'shield-outline'}
              size={64}
              color={is2FAEnabled ? tc.success : tc.textLight}
            />
          </View>
        </View>

        {/* Status */}
        <Text style={styles.statusTitle}>
          {is2FAEnabled ? '2FA is Enabled' : '2FA is Disabled'}
        </Text>
        <Text style={styles.statusSubtitle}>
          {is2FAEnabled
            ? 'Your account is protected with an extra layer of security. A verification code will be sent to your email when you log in.'
            : 'Add an extra layer of security to your account. You\'ll receive a verification code via email each time you log in.'}
        </Text>

        {/* Toggle card */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="mail-outline" size={22} color={tc.accent} />
              <View style={styles.toggleTextBlock}>
                <Text style={styles.toggleLabel}>Email Verification</Text>
                <Text style={styles.toggleDesc}>
                  Receive a code at your registered email
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

        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={tc.accent} />
          <Text style={styles.infoText}>
            When enabled, you'll need to enter a 4-digit code sent to your email every time you sign in from a new device.
          </Text>
        </View>

        {sending && (
          <View style={styles.sendingOverlay}>
            <ActivityIndicator size="large" color={tc.accent} />
            <Text style={styles.sendingText}>Sending verification code…</Text>
          </View>
        )}
      </View>
    </OverviewContainer>
  );
};

// ─── Styles ───
const createStyles = (tc: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: tc.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 20,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
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
    title: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: tc.text,
    },
    // Illustration
    illustrationContainer: {
      alignItems: 'center',
      marginVertical: 28,
    },
    illustrationCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: tc.accentLight,
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
      backgroundColor: tc.white,
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
    toggleLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    toggleTextBlock: {
      flex: 1,
    },
    toggleLabel: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: tc.text,
      marginBottom: 2,
    },
    toggleDesc: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: tc.textLight,
    },
    // Info card
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: tc.accentLight,
      borderRadius: 12,
      padding: 14,
    },
    infoText: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: tc.text,
      flex: 1,
      lineHeight: 19,
    },
    // Sending overlay
    sendingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: tc.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12,
    },
    sendingText: {
      fontFamily: fonts.medium,
      fontSize: 15,
      color: tc.text,
      marginTop: 12,
    },
    // ─── Verify step ───
    verifyContent: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 16,
    },
    lockIcon: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: tc.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    verifyTitle: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: tc.text,
      textAlign: 'center',
      marginBottom: 10,
    },
    verifySubtitle: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: tc.textLight,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    otpContainer: {
      width: '70%',
      marginBottom: 8,
    },
    errorText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: tc.error,
      textAlign: 'center',
      marginBottom: 12,
    },
    verifyBtn: {
      backgroundColor: tc.accent,
      borderRadius: 24,
      paddingVertical: 14,
      paddingHorizontal: 48,
      alignItems: 'center',
      marginBottom: 12,
      width: '70%',
    },
    verifyBtnDisabled: {
      opacity: 0.5,
    },
    verifyBtnText: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: tc.white,
    },
    resendBtn: {
      paddingVertical: 10,
      marginBottom: 16,
    },
    resendBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: tc.accent,
    },
    keypad: {
      marginTop: 'auto',
      paddingBottom: 16,
      maxWidth: 300,
    },
    webCodeInput: {
      fontFamily: fonts.bold,
      fontSize: 32,
      color: tc.text,
      textAlign: 'center',
      letterSpacing: 16,
      borderWidth: 2,
      borderColor: tc.inputBorder,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 20,
      backgroundColor: tc.inputBg,
      ...(isWeb ? { outlineStyle: 'none' as any } : {}),
    },
  });

export default TwoFactorSettingsScreen;
