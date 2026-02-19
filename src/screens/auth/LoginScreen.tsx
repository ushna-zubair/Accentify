import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import CustomButton from '../../components/CustomButton';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
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

        {/* Welcome Title */}
        <Text style={styles.title}>Welcome to Accentify</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Sign in or continue with a quick option
        </Text>

        {/* Social Login Buttons */}
        <View style={styles.socialButtonsContainer}>
          <TouchableOpacity style={styles.socialButton}>
            <Text style={styles.socialIcon}>G</Text>
            <Text style={styles.socialText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton}>
            <Text style={styles.socialIcon}>🍎</Text>
            <Text style={styles.socialText}>Continue with Apple</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        {/* Sign In Button */}
        <TouchableOpacity
          style={styles.signInButtonContainer}
          onPress={() => navigation.navigate('CreateProfile')}
          activeOpacity={0.8}
        >
          <Text style={styles.signInButtonText}>Sign In with Your Account</Text>
          <Text style={styles.arrowIcon}>→</Text>
        </TouchableOpacity>

        {/* Sign Up Link */}
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Don't have an Account? </Text>
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
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 30,
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
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  socialButtonsContainer: {
    gap: 12,
    marginBottom: 20,
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
  socialIcon: {
    fontSize: 20,
    fontWeight: '600',
  },
  socialText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.inputBorder,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  signInButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  arrowIcon: {
    fontSize: 20,
    color: colors.white,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: colors.textLight,
  },
  signUpLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
});

export default LoginScreen;
