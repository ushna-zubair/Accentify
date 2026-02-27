import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../models';
import { useAuth } from '../../context/AuthContext';
import NumberKeypad from '../../components/NumberKeypad';
import { useCodeInput } from '../../hooks/useCodeInput';
import colors from '../../theme/colors';
import { fonts } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetupAuthenticator'>;

const CODE_LENGTH = 6;

const SetupAuthenticatorScreen: React.FC<Props> = ({ navigation, route }) => {
  const { profile, appPin, biometricsEnabled, learningGoals, nativeLanguage, englishLevel } = route.params;
  const { completeOnboarding } = useAuth();
  const { code, handleKeyPress, isComplete, value: codeValue } = useCodeInput(CODE_LENGTH);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!isComplete) {
      Alert.alert('Error', 'Please enter the full 6-digit code.');
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

  // Generate a fake QR code pattern using View boxes
  const qrSize = 180;
  const cellSize = 6;
  const gridCount = Math.floor(qrSize / cellSize);

  // Deterministic pseudo-random pattern for QR look
  const qrCells: boolean[][] = [];
  for (let r = 0; r < gridCount; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < gridCount; c++) {
      // Fixed finder patterns (top-left, top-right, bottom-left corners)
      const inTLFinder = r < 7 && c < 7;
      const inTRFinder = r < 7 && c >= gridCount - 7;
      const inBLFinder = r >= gridCount - 7 && c < 7;

      if (inTLFinder || inTRFinder || inBLFinder) {
        const localR = inTLFinder ? r : inTRFinder ? r : r - (gridCount - 7);
        const localC = inTLFinder ? c : inTRFinder ? c - (gridCount - 7) : c;
        // Finder pattern: border, then white, then center
        if (localR === 0 || localR === 6 || localC === 0 || localC === 6) {
          row.push(true);
        } else if (localR === 1 || localR === 5 || localC === 1 || localC === 5) {
          row.push(false);
        } else {
          row.push(true);
        }
      } else {
        // Pseudo-random data pattern
        row.push(((r * 7 + c * 13 + r * c) % 3) === 0);
      }
    }
    qrCells.push(row);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Set Up Your Authenticator App</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Step 1 */}
        <Text style={styles.stepText}>
          Step 1: Download Google or Microsoft{'\n'}Authenticator from the App Store
        </Text>

        {/* Step 2 */}
        <Text style={styles.stepText}>
          Step 2: Scan the QR code below to add your{'\n'}
          <Text style={styles.accentifyText}>Accentify</Text> account
        </Text>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <View style={[styles.qrCode, { width: qrSize, height: qrSize }]}>
            {qrCells.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.qrRow}>
                {row.map((filled, colIndex) => (
                  <View
                    key={colIndex}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: filled ? colors.text : colors.white,
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Step 3 */}
        <Text style={styles.stepText}>
          Step 3: Enter code as shown on the{'\n'}application
        </Text>

        {/* Code Input Boxes */}
        <View style={styles.codeRow}>
          {code.map((digit, index) => (
            <View
              key={index}
              style={[styles.codeBox, digit !== '' && styles.codeBoxFilled]}
            >
              <Text style={styles.codeDigit}>{digit}</Text>
            </View>
          ))}
        </View>

        {/* Hidden keypad - using TextInput approach or simple tap boxes */}
        {/* We'll use a simple approach: tap on the code area to show a basic keypad row */}
        <NumberKeypad onKeyPress={handleKeyPress} size="compact" style={styles.miniKeypad} />

        {/* Warning */}
        <Text style={styles.warningText}>
          Make sure your device time is set correctly{'\n'}to avoid verification errors.
        </Text>

        {/* Continue Button */}
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
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
    fontSize: 15,
    color: colors.text,
  },
  /* ── Steps ── */
  stepText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  accentifyText: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  /* ── QR Code ── */
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    alignSelf: 'center',
  },
  qrCode: {
    flexDirection: 'column',
    overflow: 'hidden',
  },
  qrRow: {
    flexDirection: 'row',
  },
  /* ── Code Input ── */
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  codeBox: {
    width: 46,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primary500,
  },
  codeDigit: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  /* ── Mini Keypad ── */
  miniKeypad: {
    marginTop: 4,
    marginBottom: 12,
  },
  /* ── Warning ── */
  warningText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  /* ── Continue Button ── */
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

export default SetupAuthenticatorScreen;
