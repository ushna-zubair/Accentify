import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetYourFingerprint'>;

const SetYourFingerprintScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <FontAwesome5 name="chevron-left" size={16} color={colors.text} />
          <Text style={styles.headerTitle}>Set Your Fingerprint</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <FontAwesome5 name="user" size={46} color={colors.primary} />
          </View>
        </View>
        <Text style={styles.cardTitle}>Congratulations</Text>
        <Text style={styles.cardSubtitle}>Your account is ready to use.</Text>
        <Text style={styles.cardSubtitle}>Welcome aboard!</Text>

        <View style={styles.loaderDots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.skipButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.continueButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.continueText}>Continue</Text>
          <View style={styles.continueIcon}>
            <FontAwesome5 name="arrow-right" size={12} color={colors.primary} />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6E6A80',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    marginTop: 40,
    marginHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#F4F8FF',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFE6D1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#FFD54F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textLight,
  },
  loaderDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 18,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 'auto',
    marginBottom: 24,
  },
  skipButton: {
    flex: 1,
    marginRight: 12,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#5D5870',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: '#B9B4CC',
    fontWeight: '700',
  },
  continueButton: {
    flex: 1.4,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  continueText: {
    color: colors.white,
    fontWeight: '700',
  },
  continueIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SetYourFingerprintScreen;
