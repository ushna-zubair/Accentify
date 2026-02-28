import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useAccessibility } from '../../context/AccessibilityContext';
import { ColorBlindMode, FontStyleOption, SettingsStackParamList } from '../../models';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const COLOR_BLIND_OPTIONS: ColorBlindMode[] = ['None', 'Deuteranope', 'Protanope', 'Tritanope'];
const FONT_STYLE_OPTIONS: FontStyleOption[] = ['Standard', 'Bold', 'Extra Bold (Dyslexia Friendly)', 'Italic'];

interface SectionCardProps {
  children: React.ReactNode;
  tc: ThemeColors;
}

const SectionCard: React.FC<SectionCardProps> = ({ children, tc }) => (
  <View style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.accent }]}>{children}</View>
);

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  tc: ThemeColors;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, value, onValueChange, tc }) => (
  <View style={styles.toggleRow}>
    <Text style={[styles.toggleLabel, { color: tc.text }]}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: tc.disabled, true: tc.accent }}
      thumbColor={tc.white}
      ios_backgroundColor={tc.disabled}
    />
  </View>
);

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  fontWeight?: 'normal' | 'bold' | '800';
  fontStyle?: 'normal' | 'italic';
  tc: ThemeColors;
}

const OptionButton: React.FC<OptionButtonProps> = ({
  label,
  selected,
  onPress,
  fontWeight = 'normal',
  fontStyle = 'normal',
  tc,
}) => (
  <TouchableOpacity
    style={[styles.optionButton, { backgroundColor: tc.divider }, selected && { backgroundColor: tc.accentLight }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text
      style={[
        styles.optionText,
        { color: tc.text },
        selected && { fontFamily: fonts.semiBold, color: tc.white },
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
  const { colors: tc } = useAppTheme();

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: tc.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={tc.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: tc.text }]}>Accessibility</Text>
        </View>

        {/* Text to Speech */}
        <SectionCard tc={tc}>
          <Text style={[styles.sectionTitle, { color: tc.text }]}>Text to Speech</Text>
          <ToggleRow
            label="Enable Text to Speech"
            value={textToSpeech}
            onValueChange={setTextToSpeech}
            tc={tc}
          />
        </SectionCard>

        {/* Color Blind */}
        <SectionCard tc={tc}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection(setColorBlindExpanded)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Color Blind</Text>
            <Ionicons
              name={colorBlindExpanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={tc.text}
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
                  tc={tc}
                />
              ))}
            </View>
          )}
        </SectionCard>

        {/* Font Style */}
        <SectionCard tc={tc}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection(setFontStyleExpanded)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Font Style</Text>
            <Ionicons
              name={fontStyleExpanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={tc.text}
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
                  tc={tc}
                />
              ))}
            </View>
          )}
        </SectionCard>

        {/* Display Preferences */}
        <SectionCard tc={tc}>
          <Text style={[styles.sectionTitle, { color: tc.text }]}>Display Preferences</Text>
          <ToggleRow label="Transcript" value={transcript} onValueChange={setTranscript} tc={tc} />
          <ToggleRow
            label="Reduce Animation"
            value={reduceAnimation}
            onValueChange={setReduceAnimation}
            tc={tc}
          />
          <ToggleRow
            label="High Contrast Mode"
            value={highContrastMode}
            onValueChange={setHighContrastMode}
            tc={tc}
          />
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
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
  },
  optionsContainer: {
    marginTop: 12,
    gap: 8,
  },
  optionButton: {
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  optionText: {
    fontFamily: fonts.regular,
    fontSize: 16,
  },
});

export default AccessibilityScreen;
