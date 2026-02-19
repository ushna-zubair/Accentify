import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import CustomButton from '../../components/CustomButton';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [method, setMethod] = useState<'email' | 'sms'>('email');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <FontAwesome5 name="mobile-alt" size={52} color={colors.primary} />
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>Select which contact method you want to reset your password</Text>

        <TouchableOpacity
          style={[styles.methodCard, method === 'email' && styles.methodCardSelected]}
          onPress={() => setMethod('email')}
        >
          <View style={styles.methodIconWrapper}>
            <FontAwesome5 name="envelope" size={20} color={colors.primary} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Via Email</Text>
            <Text style={styles.methodText}>user@example.com</Text>
          </View>
          <View style={styles.radioCircle}>
            {method === 'email' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.methodCard, method === 'sms' && styles.methodCardSelected]}
          onPress={() => setMethod('sms')}
        >
          <View style={styles.methodIconWrapper}>
            <FontAwesome5 name="sms" size={20} color={colors.primary} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Via SMS</Text>
            <Text style={styles.methodText}>+1 *** *** 4232</Text>
          </View>
          <View style={styles.radioCircle}>
            {method === 'sms' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <CustomButton title="Continue" onPress={() => navigation.navigate('OTPVerification')} />
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
    marginBottom: 28,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 14,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  methodCardSelected: {
    borderColor: colors.primary,
  },
  methodIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  methodText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  buttonContainer: {
    marginTop: 24,
    width: '100%',
  },
});

export default ForgotPasswordScreen;
