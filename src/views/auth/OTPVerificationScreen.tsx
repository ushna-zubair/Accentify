import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../models';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTPVerification'>;

const OTP_LENGTH = 4;

const OTPVerificationScreen: React.FC<Props> = ({ navigation }) => {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resendTimer, setResendTimer] = useState(58);
  const [canResend, setCanResend] = useState(false);

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

  const handleKeypadPress = (key: string) => {
    if (key === 'backspace') {
      let lastFilledIndex = -1;
      for (let i = otp.length - 1; i >= 0; i--) {
        if (otp[i] !== '') {
          lastFilledIndex = i;
          break;
        }
      }
      if (lastFilledIndex >= 0) {
        const newOtp = [...otp];
        newOtp[lastFilledIndex] = '';
        setOtp(newOtp);
      }
    } else if (key !== '') {
      const firstEmptyIndex = otp.indexOf('');
      if (firstEmptyIndex >= 0 && firstEmptyIndex < OTP_LENGTH) {
        const newOtp = [...otp];
        newOtp[firstEmptyIndex] = key;
        setOtp(newOtp);
      }
    }
  };

  const handleResend = () => {
    if (canResend) {
      setResendTimer(58);
      setCanResend(false);
      // TODO: trigger resend OTP API call
    }
  };

  const isComplete = otp.every((d) => d !== '');
  const activeIndex = otp.indexOf('');

  // Keypad layout: 1-9, empty, 0, backspace
  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'backspace'],
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Code has been Sent to (+61) ***-***-*32
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
        <TouchableOpacity onPress={handleResend} disabled={!canResend}>
          <Text style={styles.resendText}>
            {canResend ? 'Resend Code' : 'Resend Code in '}
            {!canResend && <Text style={styles.resendBold}>{resendTimer}s</Text>}
          </Text>
        </TouchableOpacity>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyButton, !isComplete && styles.verifyButtonDisabled]}
          onPress={() => navigation.navigate('CreateNewPassword')}
          activeOpacity={0.8}
          disabled={!isComplete}
        >
          <Text style={styles.verifyButtonText}>Verify</Text>
          <View style={styles.arrowCircle}>
            <FontAwesome5 name="arrow-right" size={14} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Custom Keypad */}
        <View style={styles.keypad}>
          {keypadRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((key, colIndex) => (
                <TouchableOpacity
                  key={`${rowIndex}-${colIndex}`}
                  style={styles.keypadButton}
                  onPress={() => handleKeypadPress(key)}
                  activeOpacity={key === '' ? 1 : 0.5}
                  disabled={key === ''}
                >
                  {key === 'backspace' ? (
                    <FontAwesome5 name="backspace" size={20} color={colors.text} />
                  ) : (
                    <Text style={styles.keypadText}>{key}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  /* ── Subtitle ── */
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
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
    borderColor: colors.inputBorder,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: '#F5F3FF',
  },
  otpBoxActive: {
    borderColor: colors.primary,
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  cursor: {
    width: 2,
    height: 22,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  /* ── Resend ── */
  resendText: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 28,
  },
  resendBold: {
    fontWeight: '700',
    color: colors.text,
    textDecorationLine: 'underline',
  },
  /* ── Verify Button ── */
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 12,
    minWidth: 200,
    marginBottom: 32,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* ── Keypad ── */
  keypad: {
    width: '100%',
    marginTop: 'auto',
    paddingBottom: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  keypadButton: {
    width: '30%',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadText: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '500',
  },
});

export default OTPVerificationScreen;
