import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignInWithAccount = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Step 2: Fetch the user's Firestore document to read their role
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        Alert.alert('Error', 'User profile not found. Please contact support.');
        return;
      }

      const userData = userSnap.data();
      const role = userData.role;

      // Step 3: Route based on the user's role
      if (role === 'learner') {
        // If role === 'learner', navigate to Learner Dashboard
        navigation.navigate('SetYourFingerprint');
      } else if (role === 'content_author') {
        // If role === 'content_author', navigate to CMS Dashboard
        // TODO: navigation.navigate('CMSDashboard');
        navigation.navigate('SetYourFingerprint');
      } else if (role === 'admin') {
        // If role === 'admin', navigate to Admin Panel
        // TODO: navigation.navigate('AdminPanel');
        navigation.navigate('SetYourFingerprint');
      } else {
        // Fallback for unknown roles
        navigation.navigate('SetYourFingerprint');
      }
    } catch (error: any) {
      // Handle specific Firebase Auth error codes
      let message = 'Sign in failed. Please try again.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      }
      Alert.alert('Sign In Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    let GoogleSignin: any;
    let statusCodes: any;

    try {
      setLoading(true);

      try {
        const googleSigninModule = await import('@react-native-google-signin/google-signin');
        GoogleSignin = googleSigninModule.GoogleSignin;
        statusCodes = googleSigninModule.statusCodes;

        GoogleSignin.configure({
          webClientId: '104124924088-xxx.apps.googleusercontent.com',
          offlineAccess: true,
        });
      } catch {
        Alert.alert(
          'Google Sign-In unavailable',
          'Google Sign-In is not available in Expo Go. Use a development build or sign in with your account.'
        );
        return;
      }

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.data?.idToken) {
        const credential = GoogleAuthProvider.credential(userInfo.data.idToken);
        const result = await signInWithCredential(auth, credential);

        const userRef = doc(db, 'users', result.user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: result.user.email,
            role: 'learner',
            fullName: userInfo.data.user.name || '',
            profileComplete: false,
            createdAt: serverTimestamp(),
          });
        }

        navigation.navigate('SetYourFingerprint');
      } else {
        Alert.alert('Error', 'Failed to get ID token from Google');
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Error', 'Sign in is in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Play Services not available');
      } else {
        Alert.alert('Error', error.message || 'Google Sign-In failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Welcome to Accentify</Text>
        <Text style={styles.subtitle}>Sign in or continue with a quick option</Text>

        <View style={styles.emailPasswordContainer}>
          <CustomInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            leftIcon={<FontAwesome5 name="envelope" size={18} color={colors.primary} />}
          />
          <CustomInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={<FontAwesome5 name="lock" size={18} color={colors.primary} />}
          />
        </View>

        <View style={styles.socialButtonsContainer}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <View style={[styles.socialIconWrap, styles.googleIconWrap]}>
                  <FontAwesome5 name="google" size={18} color="#4285F4" />
                </View>
                <Text style={styles.socialLabel}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton}>
            <View style={styles.socialIconWrap}>
              <FontAwesome5 name="apple" size={18} color="#111111" />
            </View>
            <Text style={styles.socialLabel}>Continue with Apple</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.signInButtonContainer}>
          <CustomButton
            title="Sign In with Your Account →"
            onPress={handleSignInWithAccount}
            variant="primary"
            style={styles.primaryCta}
            textStyle={styles.primaryCtaText}
          />
        </View>

        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signUpLink}>SIGN UP</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
  },
  socialButtonsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 12,
  },
  socialIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
  },
  googleIconWrap: {
    backgroundColor: '#E8F0FE',
  },
  socialLabel: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  signInButtonContainer: {
    marginBottom: 32,
  },
  primaryCta: {
    height: 60,
  },
  primaryCtaText: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 13,
    color: colors.text,
  },
  signUpLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  emailPasswordContainer: {
    gap: 12,
    marginBottom: 24,
  },
});

export default LoginScreen;
