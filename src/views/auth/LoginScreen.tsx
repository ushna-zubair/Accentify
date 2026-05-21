import React, { useState, useMemo } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../models';
import CustomInput from '../../components/CustomInput';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { width } = useWindowDimensions();
  const { signIn, signInWithGoogle } = useAuth();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= 600;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSignInWithAccount = async () => {
    if (!email || !password) {
      showAlert('Error', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      // Use AuthContext.signIn — it calls Firebase Auth + fetches user role.
      // AppNavigator will automatically switch to LearnerNavigator/AdminNavigator
      // once the role is set in context state.
      const role = await signIn(email, password);

      if (!role) {
        // User exists in Firebase Auth but has no Firestore doc
        // (incomplete onboarding) — send them to complete their profile.
        navigation.navigate('CreateProfile');
      }
      // If role is set, AppNavigator handles navigation automatically — no manual nav needed.
    } catch (error: any) {
      let message = 'Sign in failed. Please try again.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      }
      showAlert('Sign In Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { isNewUser } = await signInWithGoogle();
      if (isNewUser) {
        navigation.navigate('CreateProfile');
      }
      // If not a new user, AppNavigator handles routing automatically
    } catch (error: any) {
      if (error?.message?.includes('CANCELLED') || error?.message?.includes('cancelled')) {
        return;
      }
      showAlert('Error', error.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
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

        {/* Title & Subtitle */}
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Login to Your Account to Continue Your Journey</Text>

        {/* Email & Password Inputs */}
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

        {/* Remember Me & Forgot Password Row */}
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <FontAwesome5 name="check" size={10} color={tc.white} />}
            </View>
            <Text style={styles.rememberText}>Remember Me</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() })}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Sign In Button */}
        <TouchableOpacity
          style={styles.signInButton}
          onPress={handleSignInWithAccount}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={tc.white} />
          ) : (
            <>
              <Text style={styles.signInButtonText}>Sign In</Text>
              <View style={styles.arrowCircle}>
                <FontAwesome5 name="arrow-right" size={14} color={tc.accent} />
              </View>
            </>
          )}
        </TouchableOpacity>

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
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color={tc.accent} size="small" />
            ) : (
              <FontAwesome5 name="google" size={22} color={'#4285F4'} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="apple" size={22} color={'#000000'} />
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Don't have an Account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signUpLink}>SIGN UP</Text>
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
  /* ── Title & Subtitle ── */
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: tc.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: tc.textLight,
    marginBottom: 28,
    lineHeight: 18,
  },
  /* ── Inputs ── */
  inputsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  /* ── Remember / Forgot Row ── */
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  rememberText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: tc.textLight,
  },
  forgotText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: tc.accent,
  },
  /* ── Sign In Button ── */
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tc.accent,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 12,
    shadowColor: tc.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 28,
  },
  signInButtonText: {
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
  /* ── Sign Up ── */
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: tc.text,
  },
  signUpLink: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: tc.accent,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
