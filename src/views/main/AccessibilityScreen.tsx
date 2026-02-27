import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { useAccessibility } from '../../context/AccessibilityContext';
import { ColorBlindMode, FontStyleOption, SettingsStackParamList } from '../../models';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLOR_BLIND_OPTIONS: ColorBlindMode[] = ['None', 'Deuteranope', 'Protanope', 'Tritanope'];
const FONT_STYLE_OPTIONS: FontStyleOption[] = ['Standard', 'Bold', 'Extra Bold (Dyslexia Friendly)', 'Italic'];

interface SectionCardProps {
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ children }) => (
  <View style={styles.card}>{children}</View>
);

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, value, onValueChange }) => (
  <View style={styles.toggleRow}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.switchTrack, true: colors.primary }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.switchTrack}
    />
  </View>
);

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  fontWeight?: 'normal' | 'bold' | '800';
  fontStyle?: 'normal' | 'italic';
}

const OptionButton: React.FC<OptionButtonProps> = ({
  label,
  selected,
  onPress,
  fontWeight = 'normal',
  fontStyle = 'normal',
}) => (
  <TouchableOpacity
    style={[styles.optionButton, selected && styles.optionButtonSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text
      style={[
        styles.optionText,
        selected && styles.optionTextSelected,
        { fontWeight, fontStyle },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

type Props = NativeStackScreenProps<SettingsStackParamList, 'Accessibility'>;

const AccessibilityScreen: React.FC<Props> = ({ navigation }) => {
  const {
    textToSpeech,
    setTextToSpeech,
    colorBlindMode,
    setColorBlindMode,
    fontStyle,
    setFontStyle,
    transcript,
    setTranscript,
    reduceAnimation,
    setReduceAnimation,
    highContrastMode,
    setHighContrastMode,
  } = useAccessibility();

  const [colorBlindExpanded, setColorBlindExpanded] = useState(true);
  const [fontStyleExpanded, setFontStyleExpanded] = useState(true);

  const toggleSection = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter((prev) => !prev);
  };

  const getFontWeight = (option: FontStyleOption): 'normal' | 'bold' | '800' => {
    switch (option) {
      case 'Bold':
        return 'bold';
      case 'Extra Bold (Dyslexia Friendly)':
        return '800';
      default:
        return 'normal';
    }
  };

  const getFontStyleProp = (option: FontStyleOption): 'normal' | 'italic' => {
    return option === 'Italic' ? 'italic' : 'normal';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Accessibility</Text>
        </View>

        {/* Text to Speech */}
        <SectionCard>
          <Text style={styles.sectionTitle}>Text to Speech</Text>
          <ToggleRow
            label="Enable Text to Speech"
            value={textToSpeech}
            onValueChange={setTextToSpeech}
          />
        </SectionCard>

        {/* Color Blind */}
        <SectionCard>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection(setColorBlindExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>Color Blind</Text>
            <Ionicons
              name={colorBlindExpanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          {colorBlindExpanded && (
            <View style={styles.optionsContainer}>
              {COLOR_BLIND_OPTIONS.map((option) => (
                <OptionButton
                  key={option}
                  label={option}
                  selected={colorBlindMode === option}
                  onPress={() => setColorBlindMode(option)}
                />
              ))}
            </View>
          )}
        </SectionCard>

        {/* Font Style */}
        <SectionCard>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection(setFontStyleExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>Font Style</Text>
            <Ionicons
              name={fontStyleExpanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          {fontStyleExpanded && (
            <View style={styles.optionsContainer}>
              {FONT_STYLE_OPTIONS.map((option) => (
                <OptionButton
                  key={option}
                  label={option}
                  selected={fontStyle === option}
                  onPress={() => setFontStyle(option)}
                  fontWeight={getFontWeight(option)}
                  fontStyle={getFontStyleProp(option)}
                />
              ))}
            </View>
          )}
        </SectionCard>

        {/* Display Preferences */}
        <SectionCard>
          <Text style={styles.sectionTitle}>Display Preferences</Text>
          <ToggleRow label="Transcript" value={transcript} onValueChange={setTranscript} />
          <ToggleRow
            label="Reduce Animation"
            value={reduceAnimation}
            onValueChange={setReduceAnimation}
          />
          <ToggleRow
            label="High Contrast Mode"
            value={highContrastMode}
            onValueChange={setHighContrastMode}
          />
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  toggleLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  optionsContainer: {
    marginTop: 12,
    gap: 8,
  },
  optionButton: {
    backgroundColor: colors.divider,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
  },
  optionTextSelected: {
    fontFamily: fonts.semiBold,
    color: colors.white,
  },
});

export default AccessibilityScreen;
