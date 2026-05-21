import React, { useState , useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../models';
import CustomInput from '../../components/CustomInput';
import { resetPassword } from '../../services/passwordResetService';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'CreateNewPassword'>;

const CreateNewPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { uid, sessionToken } = route.params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain an uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain a lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain a number';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return '';
  };

  const handleContinue = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await resetPassword(uid, sessionToken, password);
      Alert.alert('Success', 'Your password has been updated. Please log in with your new password.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
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
          <Text style={styles.headerTitle}>Create New Password</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Shield Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.shieldOuter}>
            <View style={styles.shieldInner}>
              <FontAwesome5 name="lock" size={36} color={tc.accentLight} />
            </View>
          </View>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>Create Your New Password</Text>

        {/* Password Inputs */}
        <View style={styles.inputsContainer}>
          <CustomInput
            placeholder="Password"
            value={password}
            onChangeText={(text) => { setPassword(text); setError(''); }}
            secureTextEntry
            leftIcon={<FontAwesome5 name="lock" size={16} color={tc.textMuted} />}
          />
          <CustomInput
            placeholder="Password"
            value={confirmPassword}
            onChangeText={(text) => { setConfirmPassword(text); setError(''); }}
            secureTextEntry
            leftIcon={<FontAwesome5 name="lock" size={16} color={tc.textMuted} />}
            error={error}
          />
        </View>

        {/* Continue Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.continueButton, isLoading && { opacity: 0.7 }]}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={tc.white} />
            ) : (
              <>
                <Text style={styles.continueButtonText}>Continue</Text>
                <View style={styles.arrowCircle}>
                  <FontAwesome5 name="arrow-right" size={14} color={tc.accent} />
                </View>
              </>
            )}
          </TouchableOpacity>
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
  },
  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  /* ── Illustration ── */
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 28,
  },
  shieldOuter: {
    width: 140,
    height: 160,
    backgroundColor: tc.accentDark,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // Shield-like shape approximation with border radii
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    shadowColor: tc.accentDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  shieldInner: {
    width: 110,
    height: 128,
    backgroundColor: tc.accent,
    borderRadius: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: tc.accentLight,
  },
  /* ── Subtitle ── */
  subtitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: tc.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  /* ── Inputs ── */
  inputsContainer: {
    width: '100%',
    gap: 8,
  },
  /* ── Continue Button ── */
  bottomContainer: {
    marginTop: 'auto',
    paddingBottom: 32,
    paddingTop: 20,
    alignItems: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tc.accent,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 12,
    minWidth: 200,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tc.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CreateNewPasswordScreen;
