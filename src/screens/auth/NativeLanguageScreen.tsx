import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'NativeLanguage'>;

type Language = {
  code: string;
  name: string;
  nativeName: string;
};

// Common languages list — covers >95% of users avoiding a network call
const LANGUAGES: Language[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'zh', name: 'Chinese (Mandarin)', nativeName: '中文' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
];

const NativeLanguageScreen: React.FC<Props> = ({ navigation, route }) => {
  const { profile, learningGoals } = route.params;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return LANGUAGES;
    const q = searchQuery.trim().toLowerCase();
    return LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(q) || lang.nativeName.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleNext = () => {
    if (!selectedLanguage) {
      Alert.alert('Select Language', 'Please select your native language.');
      return;
    }
    navigation.navigate('EnglishLevel', {
      profile,
      learningGoals,
      nativeLanguage: selectedLanguage.name,
    });
  };

  const handleSkip = () => {
    navigation.navigate('EnglishLevel', {
      profile,
      learningGoals,
      nativeLanguage: '',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header with Skip */}
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <FontAwesome5 name="search" size={14} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          <TouchableOpacity>
            <FontAwesome5 name="microphone" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title}>Select Your Native Language</Text>
        <Text style={styles.subtitle}>
          We'll use this to support translations and recommend lessons
        </Text>

        {/* Language Selector */}
        <TouchableOpacity
          style={styles.languagePicker}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.languagePickerText,
              !selectedLanguage && styles.languagePickerPlaceholder,
            ]}
          >
            {selectedLanguage ? selectedLanguage.name : 'Select Language'}
          </Text>
          <FontAwesome5 name="chevron-down" size={12} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Language Picker Modal */}
        <Modal
          visible={pickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Language</Text>

              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search language"
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />

              <FlatList
                data={filteredLanguages}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      selectedLanguage?.code === item.code && styles.languageOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedLanguage(item);
                      setPickerVisible(false);
                      setSearchQuery('');
                    }}
                  >
                    <View>
                      <Text style={styles.languageOptionName}>{item.name}</Text>
                      <Text style={styles.languageOptionNative}>{item.nativeName}</Text>
                    </View>
                    {selectedLanguage?.code === item.code && (
                      <FontAwesome5 name="check" size={14} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />

              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => {
                  setPickerVisible(false);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.nextButton, !selectedLanguage && styles.nextButtonDisabled]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>Next</Text>
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
    paddingTop: 16,
    paddingBottom: 20,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: 28,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    height: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'left',
    lineHeight: 18,
    marginBottom: 28,
  },
  languagePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
  },
  languagePickerText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  languagePickerPlaceholder: {
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '90%',
    maxHeight: '75%',
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  modalSearchInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBg,
    paddingHorizontal: 12,
    marginBottom: 12,
    color: colors.text,
    fontSize: 14,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  languageOptionSelected: {
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  languageOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  languageOptionNative: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalClose: {
    marginTop: 12,
    alignSelf: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  bottomContainer: {
    marginTop: 'auto',
    paddingBottom: 32,
    paddingTop: 20,
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 12,
    minWidth: 160,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
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

export default NativeLanguageScreen;
