import React, { useState, useMemo } from 'react';
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
import {
  useAppPreference,
  ThemeOption,
  AccentColor,
  FontSizeOption,
} from '../../context/AppPreferenceContext';

// ------- Constants -------
const THEME_OPTIONS: ThemeOption[] = ['Light', 'Dark'];
const ACCENT_OPTIONS: AccentColor[] = ['Lavender', 'Orange', 'Blue'];
const FONT_SIZE_OPTIONS: FontSizeOption[] = ['Small', 'Medium', 'Large'];

const ACCENT_COLORS: Record<AccentColor, string> = {
  Lavender: '#6B2FD9',
  Orange: '#F59E0B',
  Blue: '#3B82F6',
};

// ------- Sub-components -------

interface SectionCardProps {
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ children }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  return <View style={styles.card}>{children}</View>;
};

interface CollapsibleHeaderProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
}

const CollapsibleHeader: React.FC<CollapsibleHeaderProps> = ({ title, expanded, onToggle }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  return (
    <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Ionicons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={24}
        color={tc.text}
      />
    </TouchableOpacity>
  );
};

// Radio circle (filled or outline, colored border)
interface RadioCircleProps {
  selected: boolean;
  color?: string;
}

const RadioCircle: React.FC<RadioCircleProps> = ({ selected, color }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const resolvedColor = color ?? tc.text;
  return (
    <View style={[styles.radioOuter, { borderColor: resolvedColor }]}>
      {selected && <View style={[styles.radioInner, { backgroundColor: resolvedColor }]} />}
    </View>
  );
};

// ------- Main Screen -------
const AppPreferenceScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    fontSize,
    setFontSize,
    highContrastMode,
    setHighContrastMode,
  } = useAppPreference();

  const [themeExpanded, setThemeExpanded] = useState(true);
  const [colorExpanded, setColorExpanded] = useState(true);
  const [accessibilityExpanded, setAccessibilityExpanded] = useState(true);

  const toggleSection = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter((prev) => !prev);
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
            <Ionicons name="arrow-back" size={28} color={tc.text} />
          </TouchableOpacity>
          <Text style={styles.title}>App Preference</Text>
        </View>

        {/* Theme Settings */}
        <SectionCard>
          <CollapsibleHeader
            title="Theme Settings"
            expanded={themeExpanded}
            onToggle={() => toggleSection(setThemeExpanded)}
          />
          {themeExpanded && (
            <View style={styles.sectionBody}>
              <Text style={styles.subtitle}>Choose Your Theme</Text>
              <View style={styles.optionsColumn}>
                {THEME_OPTIONS.map((option) => {
                  const isSelected = theme === option;
                  const isDark = option === 'Dark';
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.themeOption,
                        isDark && styles.themeOptionDark,
                        !isDark && styles.themeOptionLight,
                      ]}
                      onPress={() => setTheme(option)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.themeOptionText,
                          isDark && styles.themeOptionTextDark,
                        ]}
                      >
                        {option}
                      </Text>
                      <RadioCircle
                        selected={isSelected}
                        color={isDark ? tc.white : tc.text}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </SectionCard>

        {/* Color Settings */}
        <SectionCard>
          <CollapsibleHeader
            title="Color Settings"
            expanded={colorExpanded}
            onToggle={() => toggleSection(setColorExpanded)}
          />
          {colorExpanded && (
            <View style={styles.sectionBody}>
              <Text style={styles.subtitle}>Choose Your Accent</Text>
              <View style={styles.optionsColumn}>
                {ACCENT_OPTIONS.map((option) => {
                  const isSelected = accentColor === option;
                  const bg = ACCENT_COLORS[option];
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.accentOption, { backgroundColor: bg }]}
                      onPress={() => setAccentColor(option)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.accentOptionText}>{option}</Text>
                      <RadioCircle
                        selected={isSelected}
                        color={tc.white}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </SectionCard>

        {/* Accessibility (Font Size + High Contrast) */}
        <SectionCard>
          <CollapsibleHeader
            title="Accessibility"
            expanded={accessibilityExpanded}
            onToggle={() => toggleSection(setAccessibilityExpanded)}
          />
          {accessibilityExpanded && (
            <View style={styles.sectionBody}>
              <Text style={styles.subtitle}>Font Size</Text>
              <View style={styles.fontSizeRow}>
                {FONT_SIZE_OPTIONS.map((option) => {
                  const isSelected = fontSize === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.fontSizeButton,
                        isSelected && styles.fontSizeButtonSelected,
                      ]}
                      onPress={() => setFontSize(option)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.fontSizeText,
                          isSelected && styles.fontSizeTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>High Contrast Mode</Text>
                <Switch
                  value={highContrastMode}
                  onValueChange={setHighContrastMode}
                  trackColor={{ false: '#D1D5DB', true: tc.accent }}
                  thumbColor={tc.white}
                  ios_backgroundColor="#D1D5DB"
                />
              </View>
            </View>
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
};

// ------- Styles -------
const createStyles = (tc: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tc.background,
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
    fontSize: 28,
    fontWeight: '700',
    color: tc.text,
  },
  // Card
  card: {
    backgroundColor: tc.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: tc.accent,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: tc.text,
  },
  sectionBody: {
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: tc.text,
    marginBottom: 10,
  },
  optionsColumn: {
    gap: 8,
  },
  // Theme options
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  themeOptionLight: {
    backgroundColor: tc.white,
    borderWidth: 1.5,
    borderColor: tc.text,
  },
  themeOptionDark: {
    backgroundColor: tc.text,
  },
  themeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: tc.text,
  },
  themeOptionTextDark: {
    color: tc.white,
  },
  // Accent options
  accentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  accentOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: tc.white,
  },
  // Radio
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  // Font size
  fontSizeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  fontSizeButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  fontSizeButtonSelected: {
    backgroundColor: tc.accent,
  },
  fontSizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: tc.text,
  },
  fontSizeTextSelected: {
    color: tc.white,
  },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: tc.text,
  },
});

export default AppPreferenceScreen;
