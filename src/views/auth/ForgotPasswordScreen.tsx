import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../models';
import colors from '../../theme/colors';
import { fonts } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [method, setMethod] = useState<'email' | 'sms'>('email');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header with back arrow and title */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationBg}>
            {/* Phone body */}
            <View style={styles.phoneBody}>
              <View style={styles.phoneScreen}>
                <FontAwesome5 name="lock" size={22} color={colors.white} />
              </View>
            </View>
            {/* Chat bubble */}
            <View style={styles.chatBubble}>
              <FontAwesome5 name="comment-dots" size={16} color={colors.white} />
            </View>
          </View>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>Choose a way to reset your password</Text>

        {/* Via Email card */}
        <TouchableOpacity
          style={[styles.methodCard, method === 'email' && styles.methodCardSelected]}
          onPress={() => setMethod('email')}
          activeOpacity={0.7}
        >
          <View style={styles.methodIconWrapper}>
            <FontAwesome5 name="envelope" size={18} color={colors.primary} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodLabel}>Via Email</Text>
            <Text style={styles.methodValue}>YusufArslanOsmanoglu@gmail.com</Text>
          </View>
        </TouchableOpacity>

        {/* Via SMS card */}
        <TouchableOpacity
          style={[styles.methodCard, method === 'sms' && styles.methodCardSelected]}
          onPress={() => setMethod('sms')}
          activeOpacity={0.7}
        >
          <View style={styles.methodIconWrapper}>
            <FontAwesome5 name="comment-alt" size={18} color={colors.primary} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodLabel}>Via SMS</Text>
            <Text style={styles.methodValue}>(+61) 678 789 432</Text>
          </View>
        </TouchableOpacity>

        {/* Continue button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate('OTPVerification')}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <View style={styles.arrowCircle}>
              <FontAwesome5 name="arrow-right" size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>
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
  },
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
    color: colors.text,
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  illustrationBg: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  phoneBody: {
    width: 90,
    height: 130,
    backgroundColor: colors.accentPink600,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneScreen: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBubble: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success600,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 14,
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary500,
  },
  methodIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 3,
  },
  methodValue: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
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
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 12,
    minWidth: 180,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.white,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ForgotPasswordScreen;
