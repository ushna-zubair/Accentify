import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import colors from '../../theme/colors';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';

type Props = NativeStackScreenProps<AuthStackParamList, 'CreateNewPassword'>;

const CreateNewPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain an uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain a lowercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain a number';
    }
    return '';
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (text) {
      const error = validatePassword(text);
      setPasswordError(error);
    } else {
      setPasswordError('');
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (text && password && text !== password) {
      setConfirmPasswordError('Passwords do not match');
    } else if (text && password && text === password) {
      setConfirmPasswordError('');
    }
  };

  const handleContinue = () => {
    const passwordValidation = validatePassword(password);
    
    if (!password) {
      setPasswordError('Password is required');
      return;
    }
    
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      return;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }

    navigation.navigate('SetupPin');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Create New Password</Text>
          </TouchableOpacity>
        </View>

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.shieldIllustration}>
            <Text style={styles.shieldIcon}>🛡️</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Create Your New Password</Text>
        </View>

        {/* Password Inputs */}
        <View style={styles.inputsContainer}>
          <CustomInput
            placeholder="Password"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry={!showPassword}
            leftIcon={<Text style={styles.icon}>🔐</Text>}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Text>{showPassword ? '👁️' : '👁️'}</Text>
              </TouchableOpacity>
            }
            error={passwordError}
          />

          <CustomInput
            placeholder="Password"
            value={confirmPassword}
            onChangeText={handleConfirmPasswordChange}
            secureTextEntry={!showConfirmPassword}
            leftIcon={<Text style={styles.icon}>🔐</Text>}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Text>{showConfirmPassword ? '👁️' : '👁️'}</Text>
              </TouchableOpacity>
            }
            error={confirmPasswordError}
          />
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <CustomButton
          title="Continue →"
          onPress={handleContinue}
          variant="primary"
        />
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
    paddingBottom: 100,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  shieldIllustration: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#E8D5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldIcon: {
    fontSize: 60,
  },
  titleSection: {
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 24,
  },
  inputsContainer: {
    gap: 16,
  },
  icon: {
    fontSize: 18,
  },
  eyeIcon: {
    padding: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
});

export default CreateNewPasswordScreen;
