import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'TwoFactorAuth'>;

const TwoFactorAuthScreen: React.FC<Props> = ({ navigation, route }) => {
  const { profile, appPin, biometricsEnabled, learningGoals, nativeLanguage, englishLevel } = route.params;
  const { completeOnboarding } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleContinue = () => {
    navigation.navigate('ChooseVerificationMethod', {
      profile,
      appPin,
      biometricsEnabled,
      learningGoals,
      nativeLanguage,
      englishLevel,
    });
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await completeOnboarding({
        profile,
        security: {
          appPin: appPin,
          biometricsEnabled: biometricsEnabled,
          twoFactorEnabled: false,
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>Enable Two Factor Authentication</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Secure your account with Two-Factor{'\n'}Authentication
        </Text>

        {/* Lock & Key Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationBg}>
            {/* Key */}
            <View style={styles.keyContainer}>
              <View style={styles.keyHead}>
                <View style={styles.keyHole} />
              </View>
              <View style={styles.keyShaft} />
              <View style={styles.keyTeeth1} />
              <View style={styles.keyTeeth2} />
            </View>
            {/* Lock */}
            <View style={styles.lockBody}>
              <View style={styles.lockShackle} />
              <View style={styles.lockKeyhole} />
            </View>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Add an extra layer of security to your{'\n'}account. You'll use both your password{'\n'}and a verification method to log in safely.
        </Text>

        {/* Bottom Buttons */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Text style={styles.skipButtonText}>Skip</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Text style={styles.continueButtonText}>Continue</Text>
                <View style={styles.arrowCircle}>
                  <FontAwesome5 name="arrow-right" size={14} color={colors.primary} />
                </View>
              </>
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
  /* ── Title ── */
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    paddingTop: 24,
    marginBottom: 20,
    lineHeight: 32,
  },
  /* ── Subtitle ── */
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  /* ── Illustration ── */
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  illustrationBg: {
    width: 180,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  /* Key */
  keyContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    transform: [{ rotate: '-45deg' }],
    zIndex: 2,
  },
  keyHead: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 4,
    borderColor: '#D4A843',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyHole: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4A843',
  },
  keyShaft: {
    width: 4,
    height: 50,
    backgroundColor: '#D4A843',
    marginLeft: 13,
    marginTop: -2,
  },
  keyTeeth1: {
    width: 10,
    height: 4,
    backgroundColor: '#D4A843',
    marginLeft: 17,
    marginTop: -16,
  },
  keyTeeth2: {
    width: 8,
    height: 4,
    backgroundColor: '#D4A843',
    marginLeft: 17,
    marginTop: 4,
  },
  /* Lock */
  lockBody: {
    width: 72,
    height: 56,
    backgroundColor: '#5BBCB3',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  lockShackle: {
    position: 'absolute',
    top: -24,
    width: 36,
    height: 30,
    borderWidth: 5,
    borderColor: '#5BBCB3',
    borderBottomWidth: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  lockKeyhole: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3D9B91',
    marginTop: 4,
  },
  /* ── Description ── */
  description: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  /* ── Bottom Buttons ── */
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingBottom: 32,
    gap: 16,
  },
  skipButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  continueButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
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

export default TwoFactorAuthScreen;
