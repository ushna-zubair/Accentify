import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!agreeToTerms) {
      Alert.alert('Error', 'Please agree to Terms and Conditions');
      return;
    }

    setLoading(true);
    try {
      // Create the Firebase Auth account only
      // The full Firestore document is written at END of onboarding (TwoFactorAuth screen)
      await createUserWithEmailAndPassword(auth, email, password);

      Alert.alert('Success', 'Account created! Let\'s set up your profile.');
      navigation.navigate('CreateProfile');
    } catch (error: any) {
      // Handle specific Firebase Auth error codes
      let message = 'Sign up failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered. Please sign in instead.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      }
      Alert.alert('Sign Up Error', message);
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
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Create your Accentify Account</Text>

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

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setAgreeToTerms(!agreeToTerms)}
        >
          <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
            {agreeToTerms && <FontAwesome5 name="check" size={12} color={colors.white} />}
          </View>
          <Text style={styles.checkboxText}>Agree to Terms and Conditions</Text>
        </TouchableOpacity>

        <View style={styles.signUpButtonContainer}
        >
          <CustomButton
            title="Sign Up"
            onPress={handleSignUp}
            loading={loading}
            variant="primary"
          />
        </View>

        <Text style={styles.orContinueText}>Or continue with</Text>

        <View style={styles.socialButtonsContainer}>
          <TouchableOpacity style={styles.socialButtonSmall}>
            <FontAwesome5 name="google" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButtonSmall}>
            <FontAwesome5 name="apple" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signInLink}>SIGN IN</Text>
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
    paddingVertical: 20,
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 32,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  signUpButtonContainer: {
    marginTop: 24,
    marginBottom: 28,
  },
  orContinueText: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 28,
  },
  socialButtonSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 20,
  },
  signInText: {
    fontSize: 14,
    color: colors.textLight,
  },
  signInLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
});

export default SignUpScreen;
