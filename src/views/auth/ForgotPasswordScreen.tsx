import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { AuthStackParamList } from '../../models';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import CustomInput from '../../components/CustomInput';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= 600;

  // Get email from route params (if passed from Login)
  const initialEmail = route.params?.email ?? '';

  const [email, setEmail] = useState(initialEmail);
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleResetPassword = async () => {
    if (!email || !email.includes('@')) {
      showAlert('Error', 'Please enter a valid email address.');
      return;
    }

    setIsSending(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setIsSuccess(true);
    } catch (error: any) {
      let message = 'Failed to send reset link. Please try again.';
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email address.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many requests. Please try again later.';
      }
      showAlert('Error', message);
    } finally {
      setIsSending(false);
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={[styles.container, isWideWeb && styles.webContainer]}>
        <View style={styles.centeredContent}>
          <View style={isWideWeb ? styles.webCard : styles.innerContent}>
            <View style={styles.successIconWrapper}>
              <FontAwesome5 name="paper-plane" size={40} color={tc.accent} />
            </View>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a password reset link to {'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isWideWeb && styles.webContainer]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isWideWeb && styles.webScrollContent,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={isWideWeb ? styles.webCard : styles.innerContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <FontAwesome5 name="arrow-left" size={18} color={tc.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reset Password</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Illustration Icon */}
          <View style={styles.illustrationContainer}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="lock" size={32} color={tc.accent} />
            </View>
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter the email address associated with your account and we'll send you a link to reset your password.
          </Text>

          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <CustomInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<FontAwesome5 name="envelope" size={16} color={tc.textMuted} />}
            />
          </View>

          {/* Continue button */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={[styles.continueButton, isSending && { opacity: 0.7 }]}
              onPress={handleResetPassword}
              activeOpacity={0.8}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={tc.white} />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>Send Reset Link</Text>
                  <View style={styles.arrowCircle}>
                    <FontAwesome5 name="arrow-right" size={14} color={tc.accent} />
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tc.white,
  },
  webContainer: {
    backgroundColor: '#F5F6FA',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scrollContent: {
    flexGrow: 1,
  },
  webScrollContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  webCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: tc.white,
    borderRadius: 24,
    paddingHorizontal: 36,
    paddingVertical: 48,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
      }
      : {}),
  },
  innerContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
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
  /* ── Illustration ── */
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tc.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: tc.accent + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  /* ── Typography ── */
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: tc.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: tc.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emailText: {
    fontFamily: fonts.bold,
    color: tc.text,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 24,
  },
  /* ── Buttons ── */
  bottomContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tc.accent,
    borderRadius: 16,
    paddingVertical: 18,
    gap: 12,
    shadowColor: tc.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: tc.white,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tc.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToLoginButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  backToLoginText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: tc.accent,
    textDecorationLine: 'underline',
  },
});

export default ForgotPasswordScreen;
