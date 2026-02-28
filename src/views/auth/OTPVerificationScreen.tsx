import React, { useEffect, useRef, useState , useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../models';
import NumberKeypad from '../../components/NumberKeypad';
import { useCodeInput } from '../../hooks/useCodeInput';
import { verifyOTP, sendOTP } from '../../services/passwordResetService';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { OTP_RESEND_SECONDS } from '../../theme/spacing';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTPVerification'>;

const OTP_LENGTH = 4;

const OTPVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { uid, method, maskedContact } = route.params;
  const { code: otp, handleKeyPress, isComplete, activeIndex } = useCodeInput(OTP_LENGTH);
  const [resendTimer, setResendTimer] = useState(OTP_RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Blinking cursor animation
  const cursorAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, { toValue: 0, duration: 500, easing: Easing.step0, useNativeDriver: true }),
        Animated.timing(cursorAnim, { toValue: 1, duration: 500, easing: Easing.step0, useNativeDriver: true }),
      ])
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

  const handleResend = async () => {
    if (!canResend || isResending) return;
    setIsResending(true);
    try {
      await sendOTP(uid, method);
      setResendTimer(OTP_RESEND_SECONDS);
      setCanResend(false);
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
      const { sessionToken } = await verifyOTP(uid, otp.join(''));
      navigation.navigate('CreateNewPassword', { uid, sessionToken });
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message ?? 'Incorrect code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={18} color={tc.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Code has been sent to {maskedContact}
        </Text>

        {/* OTP Boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => {
            const isFilled = digit !== '';
            const isActive = index === activeIndex;
            return (
              <View
                key={index}
                style={[
                  styles.otpBox,
                  isFilled && styles.otpBoxFilled,
                  isActive && styles.otpBoxActive,
                ]}
              >
                {isFilled ? (
                  <Text style={styles.otpDigit}>*</Text>
                ) : isActive ? (
                  <Animated.View style={[styles.cursor, { opacity: cursorAnim }]} />
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Resend Timer */}
        <TouchableOpacity onPress={handleResend} disabled={!canResend || isResending}>
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

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyButton, (!isComplete || isVerifying) && styles.verifyButtonDisabled]}
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

        {/* Custom Keypad */}
        <View style={styles.keypad}>
          <NumberKeypad onKeyPress={handleKeyPress} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tc.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  /* ── Header ── */
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
  /* ── Subtitle ── */
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: tc.textLight,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 28,
    lineHeight: 20,
  },
  /* ── OTP Boxes ── */
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
  /* ── Resend ── */
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
  /* ── Verify Button ── */
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
    marginBottom: 32,
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
  /* ── Keypad ── */
  keypad: {
    width: '100%',
    marginTop: 'auto',
    paddingBottom: 16,
  },
});

export default OTPVerificationScreen;
