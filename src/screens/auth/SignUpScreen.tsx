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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import CustomInput from '../../components/CustomInput';
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
      Alert.alert('Error', 'Please agree to Terms & Conditions');
      return;
    }

    // TODO: Implement Firebase authentication
    setLoading(true);
    try {
      // Placeholder for sign up logic
      Alert.alert('Success', 'Account created! (Firebase auth not configured yet)');
      navigation.navigate('CreateProfile');
    } catch (error) {
      Alert.alert('Error', 'Sign up failed');
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
        {/* Logo */}
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Title */}
        <Text style={styles.title}>Create your Accentify Account</Text>

        {/* Email Input */}
        <CustomInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          leftIcon={<Text style={styles.icon}>✉️</Text>}
        />

        {/* Password Input */}
        <CustomInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          leftIcon={<Text style={styles.icon}>🔐</Text>}
        />

        {/* Terms & Conditions Checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setAgreeToTerms(!agreeToTerms)}
        >
          <View
            style={[
              styles.checkbox,
              agreeToTerms && styles.checkboxChecked,
            ]}
          >
            {agreeToTerms && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
          <Text style={styles.checkboxText}>Agree to Terms & Conditions</Text>
        </TouchableOpacity>

        {/* Sign Up Button */}
        <TouchableOpacity
          style={styles.signUpButtonContainer}
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.signUpButtonText}>Sign Up</Text>
          <Text style={styles.arrowIcon}>→</Text>
        </TouchableOpacity>

        {/* Or Continue With */}
        <Text style={styles.orContinueText}>Or Continue With</Text>

        {/* Social Buttons */}
        <View style={styles.socialButtonsContainer}>
          <TouchableOpacity style={styles.socialButtonSmall}>
            <Text style={styles.socialIconLarge}>G</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButtonSmall}>
            <Text style={styles.socialIconLarge}>🍎</Text>
          </TouchableOpacity>
        </View>

        {/* Sign In Link */}
        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>Don't have an Account? </Text>
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
  icon: {
    fontSize: 18,
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
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  signUpButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 24,
    marginBottom: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  arrowIcon: {
    fontSize: 20,
    color: colors.white,
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
  socialIconLarge: {
    fontSize: 24,
    fontWeight: '600',
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
