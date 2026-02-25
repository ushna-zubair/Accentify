import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import CustomButton from '../../components/CustomButton';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'TwoFactorAuth'>;

const TwoFactorAuthScreen: React.FC<Props> = ({ navigation, route }) => {
  const { profile, appPin, biometricsEnabled, learningGoals, nativeLanguage, englishLevel } = route.params;
  const { completeOnboarding } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      // FINAL STEP: Write the complete user document to Firestore
      // This calls setDoc with the full payload matching the required schema
      await completeOnboarding({
        profile,
        security: {
          appPin: appPin,
          biometricsEnabled: biometricsEnabled,
          twoFactorEnabled: twoFactorEnabled,
        },
        studyPlan: {
          learningGoals: learningGoals,
          nativeLanguage: nativeLanguage,
          englishLevel: englishLevel,
        },
      });

      // After completeOnboarding sets the role to 'learner',
      // AppNavigator automatically switches from AuthNavigator to LearnerNavigator
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
        <FontAwesome5 name="shield-alt" size={60} color={colors.primary} />
        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>Add an extra layer of security to your account.</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Enable 2FA</Text>
          <Switch
            value={twoFactorEnabled}
            onValueChange={setTwoFactorEnabled}
            trackColor={{ false: colors.inputBorder, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        <View style={styles.buttonContainer}>
          <CustomButton
            title="Complete Setup"
            onPress={handleContinue}
            loading={loading}
          />
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  buttonContainer: {
    width: '100%',
  },
});

export default TwoFactorAuthScreen;
