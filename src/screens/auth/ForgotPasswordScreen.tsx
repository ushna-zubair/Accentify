import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import colors from '../../theme/colors';
import CustomButton from '../../components/CustomButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

type ResetMethod = 'email' | 'sms';

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedMethod, setSelectedMethod] = useState<ResetMethod>('email');

  const handleContinue = () => {
    navigation.navigate('OTPVerification');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Forgot Password</Text>
          </TouchableOpacity>
        </View>

        {/* Illustration Placeholder */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustration}>
            <Text style={styles.illustrationText}>📱💬</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Choose a way to reset your password</Text>
        </View>

        {/* Method Options */}
        <View style={styles.methodsContainer}>
          {/* Email Option */}
          <TouchableOpacity
            style={[
              styles.methodOption,
              selectedMethod === 'email' && styles.methodOptionSelected,
            ]}
            onPress={() => setSelectedMethod('email')}
          >
            <View style={styles.methodContent}>
              <View
                style={[
                  styles.methodIcon,
                  selectedMethod === 'email' && styles.methodIconSelected,
                ]}
              >
                <Text style={styles.icon}>✉️</Text>
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodLabel}>Via Email</Text>
                <Text style={styles.methodValue}>YunArianDamamoglu@gmail.com</Text>
              </View>
            </View>
            {selectedMethod === 'email' && <View style={styles.radioButton} />}
          </TouchableOpacity>

          {/* SMS Option */}
          <TouchableOpacity
            style={[
              styles.methodOption,
              selectedMethod === 'sms' && styles.methodOptionSelected,
            ]}
            onPress={() => setSelectedMethod('sms')}
          >
            <View style={styles.methodContent}>
              <View
                style={[
                  styles.methodIcon,
                  selectedMethod === 'sms' && styles.methodIconSelected,
                ]}
              >
                <Text style={styles.icon}>📱</Text>
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodLabel}>Via SMS</Text>
                <Text style={styles.methodValue}>(+1) 570-789-432</Text>
              </View>
            </View>
            {selectedMethod === 'sms' && <View style={styles.radioButton} />}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <CustomButton title="Continue →" onPress={handleContinue} variant="primary" />
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
    paddingBottom: 80,
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
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#FFE4E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  illustrationText: {
    fontSize: 50,
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
  methodsContainer: {
    gap: 12,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  methodOptionSelected: {
    backgroundColor: '#F8F0FF',
    borderColor: colors.primary,
  },
  methodContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconSelected: {
    backgroundColor: '#E8D5F2',
  },
  icon: {
    fontSize: 24,
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  methodValue: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
});

export default ForgotPasswordScreen;
