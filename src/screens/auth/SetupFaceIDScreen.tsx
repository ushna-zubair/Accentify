import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import CustomButton from '../../components/CustomButton';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetupFaceID'>;

const SetupFaceIDScreen: React.FC<Props> = ({ navigation, route }) => {
  const { profile, appPin, learningGoals, nativeLanguage, englishLevel } = route.params;

  const handleEnable = () => {
    // Navigate to TwoFactorAuth with biometrics enabled
    navigation.navigate('TwoFactorAuth', { profile, appPin, learningGoals, nativeLanguage, englishLevel, biometricsEnabled: true });
  };

  const handleSkip = () => {
    // Navigate to TwoFactorAuth with biometrics disabled
    navigation.navigate('TwoFactorAuth', { profile, appPin, learningGoals, nativeLanguage, englishLevel, biometricsEnabled: false });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <FontAwesome5 name="id-badge" size={60} color={colors.primary} />
        <Text style={styles.title}>Set Up Face ID</Text>
        <Text style={styles.subtitle}>Enable Face ID for quick and secure access.</Text>

        <View style={styles.buttonContainer}>
          <CustomButton title="Enable Face ID" onPress={handleEnable} />
        </View>
        <Text style={styles.skip} onPress={handleSkip}>Skip for now</Text>
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
    marginBottom: 12,
  },
  skip: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default SetupFaceIDScreen;
