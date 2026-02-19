import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import colors from '../../theme/colors';
import CustomButton from '../../components/CustomButton';
import OTPInput from '../../components/OTPInput';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTPVerification'>;

const OTPVerificationScreen: React.FC<Props> = ({ navigation }) => {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(58);
  const [canResend, setCanResend] = useState(false);
  const otpInputRef = useRef<any>(null);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleKeypadPress = (digit: string) => {
    if (digit === 'backspace') {
      const lastFilledIndex = otp.lastIndexOf((val) => val !== '');
      if (lastFilledIndex >= 0) {
        const newOtp = [...otp];
        newOtp[lastFilledIndex] = '';
        setOtp(newOtp);
      }
    } else {
      const firstEmptyIndex = otp.indexOf('');
      if (firstEmptyIndex < 6) {
        const newOtp = [...otp];
        newOtp[firstEmptyIndex] = digit;
        setOtp(newOtp);
      }
    }
  };

  const handleVerify = () => {
    const otpString = otp.join('');
    if (otpString.length === 6) {
      navigation.navigate('CreateNewPassword');
    }
  };

  const handleResend = () => {
    if (canResend) {
      setResendTimer(58);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
    }
  };

  const keypadLayout = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', 'backspace'],
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Forgot Password</Text>
          </TouchableOpacity>
        </View>

        {/* Phone Number Display */}
        <View style={styles.phoneSection}>
          <Text style={styles.phoneLabel}>Code has been Sent to (+1) ***-****-+32</Text>
        </View>

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          <OTPInput
            ref={otpInputRef}
            value={otp}
            onChange={setOtp}
          />
        </View>

        {/* Resend Timer */}
        <View style={styles.resendSection}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendText}>Resend Code</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>Resend Code in {resendTimer}s</Text>
          )}
        </View>
      </ScrollView>

      {/* Verify Button */}
      <View style={styles.verifySection}>
        <CustomButton
          title="Verify →"
          onPress={handleVerify}
          variant="primary"
          disabled={otp.join('').length !== 6}
        />
      </View>

      {/* Numeric Keypad */}
      <View style={styles.keypadContainer}>
        {keypadLayout.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.keypadButton}
                onPress={() => handleKeypadPress(key)}
              >
                {key === 'backspace' ? (
                  <Text style={styles.backspaceIcon}>⌫</Text>
                ) : (
                  <Text style={styles.keypadNumber}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  phoneSection: {
    marginBottom: 32,
  },
  phoneLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  otpContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  resendText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  verifySection: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    backgroundColor: colors.background,
  },
  keypadContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  keypadButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  backspaceIcon: {
    fontSize: 20,
  },
});

export default OTPVerificationScreen;
