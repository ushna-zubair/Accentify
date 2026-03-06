import React, { useState , useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../models';
import { sendSignUpOTP } from '../../services/signUpVerificationService';
import { useAuth } from '../../context/AuthContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= 600;
  const { signUp, signInWithGoogle, signInWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    if (!agreeToTerms) {
      showAlert('Error', 'Please agree to Terms and Conditions');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create the Firebase Auth account via AuthContext.
      // The full Firestore document is written at END of onboarding (TwoFactorAuth screen).
      await signUp(email, password);

      // Step 2: Try to send email verification OTP.
      // If the Cloud Function isn't deployed, skip verification and go straight to profile setup.
      try {
        const { maskedEmail } = await sendSignUpOTP();
        navigation.navigate('EmailVerification', { maskedEmail });
      } catch (otpError: any) {
        console.warn('[SignUp] OTP send failed (skipping email verification):', otpError?.code, otpError?.message);
        // Cloud Function not deployed or unavailable — skip email verification
        navigation.navigate('CreateProfile');
      }
    } catch (error: any) {
      console.error('[SignUp] error:', error?.code, error?.message, error);
      // Handle specific Firebase Auth error codes
      let message = 'Sign up failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered. Please sign in instead.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Email/password sign-up is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        message = error.message;
      }
      showAlert('Sign Up Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setSocialLoading('google');
    try {
      const { isNewUser } = await signInWithGoogle();
      if (isNewUser) {
        showAlert('Success', 'Google account linked! Let\'s set up your profile.');
        navigation.navigate('CreateProfile');
      }
      // If not a new user, AppNavigator handles routing automatically
    } catch (error: any) {
      if (error?.code === 'SIGN_IN_CANCELLED' || error?.message?.includes('cancelled')) {
        return; // User cancelled, no alert needed
      }
      if (!error?.message?.includes('not available')) {
        showAlert('Google Sign-Up Error', error.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignUp = async () => {
    setSocialLoading('apple');
    try {
      const { isNewUser } = await signInWithApple();
      if (isNewUser) {
        showAlert('Success', 'Apple account linked! Let\'s set up your profile.');
        navigation.navigate('CreateProfile');
      }
      // If not a new user, AppNavigator handles routing automatically
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED' || error?.message?.includes('cancelled')) {
        return; // User cancelled, no alert needed
      }
      if (!error?.message?.includes('not available') && !error?.message?.includes('Unavailable')) {
        showAlert('Apple Sign-Up Error', error.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSocialLoading(null);
    }
  };

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
        <View style={isWideWeb ? styles.webCard : undefined}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Create your Accentify Account</Text>

        <View style={styles.inputsContainer}>
          <CustomInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            leftIcon={<FontAwesome5 name="envelope" size={16} color={tc.textMuted} />}
          />

          <CustomInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={<FontAwesome5 name="lock" size={16} color={tc.textMuted} />}
          />
        </View>

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setAgreeToTerms(!agreeToTerms)}
        >
          <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
            {agreeToTerms && <FontAwesome5 name="check" size={10} color={tc.white} />}
          </View>
          <Text style={styles.checkboxText}>Agree to Terms and Conditions</Text>
        </TouchableOpacity>

        <View style={styles.signUpButtonContainer}>
          <CustomButton
            title="Sign Up"
            onPress={handleSignUp}
            loading={loading}
            variant="primary"
          />
        </View>

        {/* Or Continue With Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or Continue With</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Login Buttons */}
        <View style={styles.socialRow}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignUp}
            disabled={loading || socialLoading !== null}
            activeOpacity={0.7}
          >
            {socialLoading === 'google' ? (
              <ActivityIndicator color={tc.accent} size="small" />
            ) : (
              <FontAwesome5 name="google" size={22} color={'#4285F4'} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleAppleSignUp}
            disabled={loading || socialLoading !== null}
            activeOpacity={0.7}
          >
            {socialLoading === 'apple' ? (
              <ActivityIndicator color={tc.text} size="small" />
            ) : (
              <FontAwesome5 name="apple" size={22} color={'#000000'} />
            )}
          </TouchableOpacity>
        </View>

        {/* Sign In Link */}
        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signInLink}>SIGN IN</Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
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
    borderRadius: 20,
    paddingHorizontal: 36,
    paddingVertical: 36,
    ...(Platform.OS === 'web'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 24,
        }
      : {}),
  },
  /* ── Logo ── */
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  logo: {
    width: 100,
    height: 100,
  },
  /* ── Title ── */
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: tc.text,
    textAlign: 'center',
    marginBottom: 28,
  },
  /* ── Inputs ── */
  inputsContainer: {
    gap: 8,
    marginBottom: 4,
  },
  /* ── Checkbox ── */
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: tc.inputBorder,
    backgroundColor: tc.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: tc.accent,
    borderColor: tc.accent,
  },
  checkboxText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: tc.text,
  },
  /* ── Sign Up Button ── */
  signUpButtonContainer: {
    marginTop: 16,
    marginBottom: 28,
  },
  /* ── Divider ── */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: tc.inputBorder,
  },
  dividerText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: tc.textLight,
    marginHorizontal: 14,
  },
  /* ── Social Buttons ── */
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 28,
  },
  socialButton: {
    width: 60,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tc.inputBorder,
    backgroundColor: tc.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* ── Sign In Link ── */
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: tc.text,
  },
  signInLink: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: tc.accent,
    textDecorationLine: 'underline',
  },
});

export default SignUpScreen;
