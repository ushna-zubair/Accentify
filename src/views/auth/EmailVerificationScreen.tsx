import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../models';
import NumberKeypad from '../../components/NumberKeypad';
import { useCodeInput } from '../../hooks/useCodeInput';
import {
  sendSignUpOTP,
  verifySignUpOTP,
} from '../../services/signUpVerificationService';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { OTP_RESEND_SECONDS } from '../../theme/spacing';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailVerification'>;

const OTP_LENGTH = 4;

const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors: tc } = useAppTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= 600;
  const styles = useMemo(() => createStyles(tc, isWideWeb), [tc, isWideWeb]);

  const { maskedEmail } = route.params;
  const { code: otp, handleKeyPress, isComplete, activeIndex, reset } =
    useCodeInput(OTP_LENGTH);
  const [resendTimer, setResendTimer] = useState(OTP_RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Hidden web text input ref for keyboard entry
  const webInputRef = useRef<TextInput>(null);

  // Blinking cursor animation
  const cursorAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.step0,
          useNativeDriver: true,
        }),
        Animated.timing(cursorAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.step0,
          useNativeDriver: true,
        }),
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, [cursorAnim]);

  // Countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Auto-focus the hidden web input
  useEffect(() => {
    if (isWideWeb && webInputRef.current) {
      webInputRef.current.focus();
    }
  }, [isWideWeb]);

  const handleResend = async () => {
    if (!canResend || isResending) return;
    setIsResending(true);
    try {
      await sendSignUpOTP();
      reset();
      setResendTimer(OTP_RESEND_SECONDS);
      setCanResend(false);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    if (!isComplete || isVerifying) return;
    setIsVerifying(true);
    try {
      await verifySignUpOTP(otp.join(''));
      Alert.alert('Email Verified!', 'Your email has been verified. Let\'s set up your profile.');
      navigation.navigate('CreateProfile');
    } catch (err: any) {
      Alert.alert(
        'Verification Failed',
        err.message ?? 'Incorrect code. Please try again.',
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Web keyboard handler — forward typed keys to the code input hook
  const handleWebInput = useCallback(
    (text: string) => {
      // The hidden TextInput accumulates chars; we only care about the last
      const last = text.slice(-1);
      if (/^\d$/.test(last)) {
        handleKeyPress(last);
      }
    },
    [handleKeyPress],
  );

  const handleWebKeyDown = useCallback(
    (e: any) => {
      if (e.nativeEvent.key === 'Backspace') {
        handleKeyPress('backspace');
      }
    },
    [handleKeyPress],
  );

  // ─── OTP boxes (shared) ───
  const otpBoxes = (
    <View style={styles.otpRow}>
      {otp.map((digit, index) => {
        const isFilled = digit !== '';
        const isActive = index === activeIndex;
        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.otpBox,
              isFilled && styles.otpBoxFilled,
              isActive && styles.otpBoxActive,
            ]}
            activeOpacity={0.9}
            onPress={() => isWideWeb && webInputRef.current?.focus()}
          >
            {isFilled ? (
              <Text style={styles.otpDigit}>{digit}</Text>
            ) : isActive ? (
              <Animated.View
                style={[styles.cursor, { opacity: cursorAnim }]}
              />
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ─── Verify button (shared) ───
  const verifyButton = (
    <TouchableOpacity
      style={[
        styles.verifyButton,
        (!isComplete || isVerifying) && styles.verifyButtonDisabled,
      ]}
      onPress={handleVerify}
      activeOpacity={0.8}
      disabled={!isComplete || isVerifying}
    >
      {isVerifying ? (
        <ActivityIndicator size="small" color={tc.white} />
      ) : (
        <>
          <Text style={styles.verifyButtonText}>Verify</Text>
          <View style={styles.arrowCircle}>
            <FontAwesome5 name="arrow-right" size={14} color={tc.accent} />
          </View>
        </>
      )}
    </TouchableOpacity>
  );

  // ─── Resend link (shared) ───
  const resendLink = (
    <TouchableOpacity
      onPress={handleResend}
      disabled={!canResend || isResending}
    >
      <Text style={styles.resendText}>
        {isResending
          ? 'Sending…'
          : canResend
            ? 'Resend Code'
            : 'Resend Code in '}
        {!canResend && !isResending && (
          <Text style={styles.resendBold}>{resendTimer}s</Text>
        )}
      </Text>
    </TouchableOpacity>
  );

  // ═══════════════ WEB LAYOUT ═══════════════
  if (isWideWeb) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webWrapper}>
          <View style={styles.webCard}>
            {/* Back button */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.webBackRow}
            >
              <FontAwesome5 name="arrow-left" size={16} color={tc.text} />
              <Text style={styles.webBackText}>Back</Text>
            </TouchableOpacity>

            {/* Email icon */}
            <View style={styles.iconCircle}>
              <FontAwesome5 name="envelope-open-text" size={28} color={tc.accent} />
            </View>

            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a 4-digit code to{'\n'}
              <Text style={styles.emailHighlight}>{maskedEmail}</Text>
            </Text>

            {/* Hidden text input for web keyboard entry */}
            <TextInput
              ref={webInputRef}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH + 1}
              onChangeText={handleWebInput}
              onKeyPress={handleWebKeyDown}
              autoFocus
              caretHidden
              value=""
            />

            {otpBoxes}
            {resendLink}
            {verifyButton}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════ MOBILE LAYOUT ═══════════════
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <FontAwesome5 name="arrow-left" size={18} color={tc.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Email</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Mail icon */}
        <View style={styles.iconCircle}>
          <FontAwesome5 name="envelope-open-text" size={28} color={tc.accent} />
        </View>

        <Text style={styles.subtitle}>
          Code has been sent to{'\n'}
          <Text style={styles.emailHighlight}>{maskedEmail}</Text>
        </Text>

        {otpBoxes}
        {resendLink}
        {verifyButton}

        {/* Number Keypad (mobile only) */}
        <View style={styles.keypad}>
          <NumberKeypad onKeyPress={handleKeyPress} />
        </View>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───

const createStyles = (tc: ThemeColors, isWideWeb: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isWideWeb ? '#F5F6FA' : tc.background,
    },
    // ─── Web ───
    webWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 16,
    },
    webCard: {
      width: '100%',
      maxWidth: 460,
      backgroundColor: tc.white,
      borderRadius: 20,
      paddingHorizontal: 36,
      paddingVertical: 40,
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
          }
        : {}),
    },
    webBackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 8,
      marginBottom: 20,
    },
    webBackText: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: tc.text,
    },
    hiddenInput: {
      position: 'absolute',
      opacity: 0,
      height: 0,
      width: 0,
    },
    // ─── Mobile ───
    content: {
      flex: 1,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      paddingTop: 12,
      paddingBottom: 8,
    },
    backButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: tc.text,
    },
    // ─── Shared ───
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: tc.accentMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: isWideWeb ? 0 : 24,
      marginBottom: 16,
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: 24,
      color: tc.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: tc.textLight,
      textAlign: 'center',
      marginBottom: 28,
      lineHeight: 22,
    },
    emailHighlight: {
      fontFamily: fonts.semiBold,
      color: tc.text,
    },
    otpRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 14,
      marginBottom: 24,
    },
    otpBox: {
      width: 62,
      height: 62,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: tc.inputBorder,
      backgroundColor: tc.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    otpBoxFilled: {
      borderColor: tc.accent,
      backgroundColor: tc.accentMuted,
    },
    otpBoxActive: {
      borderColor: tc.accent,
    },
    otpDigit: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: tc.text,
    },
    cursor: {
      width: 2,
      height: 22,
      backgroundColor: tc.accent,
      borderRadius: 1,
    },
    resendText: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: tc.textLight,
      marginBottom: 28,
    },
    resendBold: {
      fontFamily: fonts.bold,
      color: tc.text,
      textDecorationLine: 'underline',
    },
    verifyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tc.accent,
      borderRadius: 999,
      paddingVertical: 16,
      paddingHorizontal: 32,
      gap: 12,
      minWidth: 200,
      marginBottom: isWideWeb ? 0 : 32,
      shadowColor: tc.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
    verifyButtonDisabled: {
      opacity: 0.6,
    },
    verifyButtonText: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      color: tc.white,
    },
    arrowCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: tc.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keypad: {
      width: '100%',
      marginTop: 'auto',
      paddingBottom: 16,
    },
  });

export default EmailVerificationScreen;
