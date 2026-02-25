import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'CreateNewPassword'>;

const CreateNewPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

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

  const handleContinue = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    Alert.alert('Success', 'Password updated');
    navigation.navigate('SetupPin');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <FontAwesome5 name="shield-alt" size={48} color={colors.primary} />
        <Text style={styles.title}>Create New Password</Text>
        <Text style={styles.subtitle}>Your new password must be different from previous passwords.</Text>

        <CustomInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          leftIcon={<FontAwesome5 name="lock" size={18} color={colors.primary} />}
        />
        <CustomInput
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          leftIcon={<FontAwesome5 name="lock" size={18} color={colors.primary} />}
          error={error}
        />

        <View style={styles.buttonContainer}>
          <CustomButton title="Continue" onPress={handleContinue} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 16,
  },
});

export default CreateNewPasswordScreen;
