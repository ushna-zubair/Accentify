import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../models';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetupFaceID'>;

const SetupFaceIDScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { profile, appPin, learningGoals, nativeLanguage, englishLevel } = route.params;

  const handleEnable = () => {
    navigation.navigate('TwoFactorAuth', { profile, appPin, learningGoals, nativeLanguage, englishLevel, biometricsEnabled: true });
  };

  const handleSkip = () => {
    navigation.navigate('TwoFactorAuth', { profile, appPin, learningGoals, nativeLanguage, englishLevel, biometricsEnabled: false });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={18} color={tc.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Setup FaceID</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Add FaceID to Make your Account more{'\n'}Secure against unauthorized access on{'\n'}your device.
        </Text>

        {/* Face ID Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.faceFrame}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Face icon */}
            <View style={styles.faceInner}>
              {/* Eyes */}
              <View style={styles.eyesRow}>
                <View style={styles.eye} />
                <View style={styles.eye} />
              </View>
              {/* Nose */}
              <View style={styles.nose} />
              {/* Mouth */}
              <View style={styles.mouth} />
            </View>
          </View>
        </View>

        {/* Privacy Note */}
        <Text style={styles.privacyNote}>
          FaceID data is stored on your device and{'\n'}not linked to your account.
        </Text>

        {/* Bottom Buttons */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleEnable}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <View style={styles.arrowCircle}>
              <FontAwesome5 name="arrow-right" size={14} color={tc.accent} />
            </View>
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
  /* ── Description ── */
  description: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: tc.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 24,
    marginBottom: 32,
  },
  /* ── Illustration ── */
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  faceFrame: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: tc.text,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 16,
  },
  faceInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyesRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 12,
  },
  eye: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tc.text,
  },
  nose: {
    width: 6,
    height: 16,
    borderRadius: 3,
    backgroundColor: tc.text,
    marginBottom: 10,
  },
  mouth: {
    width: 30,
    height: 14,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderColor: tc.text,
  },
  /* ── Privacy Note ── */
  privacyNote: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: tc.textLight,
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
    backgroundColor: tc.white,
    borderRadius: 999,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: tc.inputBorder,
  },
  skipButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: tc.text,
  },
  continueButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tc.accent,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
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

export default SetupFaceIDScreen;
