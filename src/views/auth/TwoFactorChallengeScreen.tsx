/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Muhammad Ali
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

/**
 * TwoFactorChallengeScreen — post-login TOTP challenge.
 *
 * Shown by AppNavigator when `pendingTotpChallenge` is true on AuthContext.
 * The user has already authenticated with Firebase, but cannot reach the main
 * app until they prove possession of their authenticator app.
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { verifyTotpCode } from '../../services/twoFactorService';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';

const isWeb = Platform.OS === 'web';

const showAlert = (title: string, msg: string) => {
  if (isWeb) window.alert(`${title}\n${msg}`);
  else Alert.alert(title, msg);
};

const TwoFactorChallengeScreen: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { clearTotpChallenge, signOut } = useAuth();

  const [code, setCode] = useState('');
  const [working, setWorking] = useState(false);

  const onSubmit = useCallback(async () => {
    if (!/^\d{6}$/.test(code)) {
      showAlert('Invalid code', 'Enter the 6-digit code from your authenticator app.');
      return;
    }
    setWorking(true);
    try {
      await verifyTotpCode(code);
      await clearTotpChallenge();
    } catch (e: any) {
      showAlert('Verification failed', e?.message ?? 'Try again.');
    } finally {
      setWorking(false);
    }
  }, [code, clearTotpChallenge]);

  const onCancel = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // sign-out will trigger AppNavigator to swap back to AuthNavigator
    }
  }, [signOut]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={56} color={tc.accent} />
        </View>

        <Text style={styles.title}>Verify Your Identity</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code from your authenticator app to continue.
        </Text>

        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          placeholder="123456"
          placeholderTextColor={tc.textMuted}
          maxLength={6}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.primaryBtn, (working || code.length !== 6) && styles.btnDisabled]}
          onPress={onSubmit}
          disabled={working || code.length !== 6}
        >
          {working ? (
            <ActivityIndicator color={tc.white} />
          ) : (
            <Text style={styles.primaryBtnText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel and sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (tc: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: tc.background },
    container: { flex: 1, padding: 24, justifyContent: 'center' },
    iconCircle: {
      alignSelf: 'center',
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: tc.accentLight + '40',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: 24,
      color: tc.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: tc.textLight,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 28,
    },
    codeInput: {
      backgroundColor: tc.surface,
      borderColor: tc.inputBorder,
      borderWidth: 1.5,
      borderRadius: 12,
      paddingVertical: 14,
      fontSize: 22,
      fontFamily: fonts.bold,
      letterSpacing: 6,
      textAlign: 'center',
      color: tc.text,
      marginBottom: 20,
    },
    primaryBtn: {
      backgroundColor: tc.accent,
      borderRadius: 28,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryBtnText: { fontFamily: fonts.bold, fontSize: 16, color: tc.white },
    btnDisabled: { opacity: 0.5 },
    cancelBtn: { paddingVertical: 18, alignItems: 'center' },
    cancelText: { fontFamily: fonts.semiBold, color: tc.textLight, fontSize: 14 },
  });

export default TwoFactorChallengeScreen;
