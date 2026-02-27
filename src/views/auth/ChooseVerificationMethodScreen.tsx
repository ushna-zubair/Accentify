import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../models';
import { useAuth } from '../../context/AuthContext';
import colors from '../../theme/colors';
import { fonts } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'ChooseVerificationMethod'>;

type VerificationMethod = 'email' | 'authenticator' | 'pin';

const ChooseVerificationMethodScreen: React.FC<Props> = ({ navigation, route }) => {
  const { profile, appPin, biometricsEnabled, learningGoals, nativeLanguage, englishLevel } = route.params;
  const { completeOnboarding } = useAuth();
  const [selected, setSelected] = useState<VerificationMethod>('authenticator');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (selected === 'authenticator') {
      navigation.navigate('SetupAuthenticator', {
        profile,
        appPin,
        biometricsEnabled,
        learningGoals,
        nativeLanguage,
        englishLevel,
      });
      return;
    }

    setLoading(true);
    try {
      await completeOnboarding({
        profile,
        security: {
          appPin: appPin,
          biometricsEnabled: biometricsEnabled,
          twoFactorEnabled: true,
        },
        studyPlan: {
          learningGoals: learningGoals,
          nativeLanguage: nativeLanguage,
          englishLevel: englishLevel,
        },
      });

      Alert.alert('Success', 'Your account is all set! Welcome to Accentify.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const methods: { key: VerificationMethod; label: string }[] = [
    { key: 'email', label: 'Email Verification' },
    { key: 'authenticator', label: 'Authenticator App' },
    { key: 'pin', label: 'Pin Code (Not Recommended)' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Verification Method</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Select how you'd like to secure your{'\n'}
          <Text style={styles.accentifyText}>Accentify</Text> account.
        </Text>

        {/* Method Options */}
        <View style={styles.methodsContainer}>
          {methods.map((method) => {
            const isSelected = selected === method.key;
            return (
              <TouchableOpacity
                key={method.key}
                style={[styles.methodButton, isSelected && styles.methodButtonSelected]}
                onPress={() => setSelected(method.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.methodText, isSelected && styles.methodTextSelected]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Warning Text */}
        <Text style={styles.warningText}>
          If you lose access to your authenticator,{'\n'}make sure you have an alternate method{'\n'}saved.
        </Text>

        {/* Continue Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
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
    fontSize: 16,
    color: colors.text,
  },
  /* ── Subtitle ── */
  subtitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 32,
    marginBottom: 32,
  },
  accentifyText: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  /* ── Methods ── */
  methodsContainer: {
    gap: 14,
    marginBottom: 32,
  },
  methodButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
  },
  methodButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  methodText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  methodTextSelected: {
    color: colors.white,
  },
  /* ── Warning ── */
  warningText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  /* ── Continue Button ── */
  bottomContainer: {
    marginTop: 'auto',
    paddingBottom: 32,
    paddingTop: 20,
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
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
});

export default ChooseVerificationMethodScreen;
