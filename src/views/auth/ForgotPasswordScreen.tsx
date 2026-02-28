import React, { useEffect, useState , useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../models';
import { lookupUser, sendOTP, LookupUserResult } from '../../services/passwordResetService';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { email } = route.params;

  const [method, setMethod] = useState<'email' | 'sms'>('email');
  const [lookupData, setLookupData] = useState<LookupUserResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  // Look up user on mount to get masked contacts
  useEffect(() => {
    if (!email) {
      setError('Please go back and enter your email address.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await lookupUser(email);
        if (!cancelled) setLookupData(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? 'Unable to look up account.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [email]);

  const handleContinue = async () => {
    if (!lookupData) return;

    if (method === 'sms' && !lookupData.hasPhone) {
      Alert.alert('No Phone Number', 'There is no phone number on file for this account. Please use email instead.');
      return;
    }

    setIsSending(true);
    try {
      await sendOTP(lookupData.uid, method);
      const maskedContact =
        method === 'email' ? lookupData.maskedEmail : lookupData.maskedPhone ?? '';
      navigation.navigate('OTPVerification', {
        uid: lookupData.uid,
        method,
        maskedContact,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to send code. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header with back arrow and title */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={18} color={tc.text} />
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
                <FontAwesome5 name="lock" size={22} color={tc.white} />
              </View>
            </View>
            {/* Chat bubble */}
            <View style={styles.chatBubble}>
              <FontAwesome5 name="comment-dots" size={16} color={tc.white} />
            </View>
          </View>
        </View>

        {/* Loading / Error */}
        {isLoading && (
          <View style={styles.centeredMessage}>
            <ActivityIndicator size="large" color={tc.accent} />
            <Text style={styles.subtitle}>Looking up your account…</Text>
          </View>
        )}

        {!isLoading && !!error && (
          <View style={styles.centeredMessage}>
            <FontAwesome5 name="exclamation-circle" size={32} color={tc.error} />
            <Text style={[styles.subtitle, { color: tc.error, marginTop: 12 }]}>{error}</Text>
          </View>
        )}

        {!isLoading && !error && lookupData && (
          <>
            {/* Subtitle */}
            <Text style={styles.subtitle}>Choose a way to reset your password</Text>

            {/* Via Email card */}
            <TouchableOpacity
              style={[styles.methodCard, method === 'email' && styles.methodCardSelected]}
              onPress={() => setMethod('email')}
              activeOpacity={0.7}
            >
              <View style={styles.methodIconWrapper}>
                <FontAwesome5 name="envelope" size={18} color={tc.accent} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodLabel}>Via Email</Text>
                <Text style={styles.methodValue}>{lookupData.maskedEmail}</Text>
              </View>
            </TouchableOpacity>

            {/* Via SMS card */}
            <TouchableOpacity
              style={[
                styles.methodCard,
                method === 'sms' && styles.methodCardSelected,
                !lookupData.hasPhone && styles.methodCardDisabled,
              ]}
              onPress={() => lookupData.hasPhone && setMethod('sms')}
              activeOpacity={lookupData.hasPhone ? 0.7 : 1}
            >
              <View style={styles.methodIconWrapper}>
                <FontAwesome5 name="comment-alt" size={18} color={lookupData.hasPhone ? tc.accent : tc.textMuted} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodLabel}>Via SMS</Text>
                <Text style={styles.methodValue}>
                  {lookupData.hasPhone ? lookupData.maskedPhone : 'No phone on file'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Continue button */}
            <View style={styles.bottomContainer}>
              <TouchableOpacity
                style={[styles.continueButton, isSending && { opacity: 0.7 }]}
                onPress={handleContinue}
                activeOpacity={0.8}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={tc.white} />
                ) : (
                  <>
                    <Text style={styles.continueButtonText}>Continue</Text>
                    <View style={styles.arrowCircle}>
                      <FontAwesome5 name="arrow-right" size={14} color={tc.accent} />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
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
    backgroundColor: '#FFBFCE',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneScreen: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: tc.accentMuted,
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
    backgroundColor: tc.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: tc.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tc.white,
    borderWidth: 1.5,
    borderColor: tc.inputBorder,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 14,
  },
  methodCardSelected: {
    borderColor: tc.accent,
    backgroundColor: tc.accentMuted,
  },
  methodCardDisabled: {
    opacity: 0.5,
  },
  centeredMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  methodIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: tc.inputBg,
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
    color: tc.textMuted,
    marginBottom: 3,
  },
  methodValue: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: tc.text,
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
    backgroundColor: tc.accent,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 12,
    minWidth: 180,
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

export default ForgotPasswordScreen;
