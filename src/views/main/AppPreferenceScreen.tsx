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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../theme/typography';
import { useAppPreference } from '../../context/AppPreferenceContext';
import { useAppTheme, type ThemeColors, type ThemeFontSizes } from '../../hooks/useAppTheme';
import { ThemeOption, AccentColor, FontSizeOption, SettingsStackParamList } from '../../models';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const isWeb = Platform.OS === 'web';

// ------- Constants -------
const THEME_OPTIONS: ThemeOption[] = ['Light', 'Dark'];
const ACCENT_OPTIONS: AccentColor[] = ['Lavender', 'Orange', 'Blue'];
const FONT_SIZE_OPTIONS: FontSizeOption[] = ['Small', 'Medium', 'Large'];

/** Preview accent colors for the color-picker pills */
const ACCENT_PILL_COLORS: Record<AccentColor, string> = {
  Lavender: '#3F66FB',
  Orange: '#FD8E39',
  Blue: '#4285F4',
};

// ------- Sub-components -------

interface SectionCardProps {
  children: React.ReactNode;
  tc: ThemeColors;
}

const SectionCard: React.FC<SectionCardProps> = ({ children, tc }) => (
  <View
    style={[
      styles.card,
      { backgroundColor: tc.surface, borderColor: tc.accent },
    ]}
  >
    {children}
  </View>
);

interface CollapsibleHeaderProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  tc: ThemeColors;
  fs: ThemeFontSizes;
}

const CollapsibleHeader: React.FC<CollapsibleHeaderProps> = ({
  title,
  expanded,
  onToggle,
  tc,
  fs,
}) => (
  <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
    <Text style={[styles.sectionTitle, { color: tc.text, fontSize: fs.subtitle }]}>{title}</Text>
    <Ionicons
      name={expanded ? 'chevron-up' : 'chevron-down'}
      size={24}
      color={tc.text}
    />
  </TouchableOpacity>
);

// Radio circle (filled or outline, colored border)
interface RadioCircleProps {
  selected: boolean;
  color?: string;
}

const RadioCircle: React.FC<RadioCircleProps> = ({ selected, color = '#333' }) => (
  <View style={[styles.radioOuter, { borderColor: color }]}>
    {selected && <View style={[styles.radioInner, { backgroundColor: color }]} />}
  </View>
);

// Font-size preview text
interface FontPreviewProps {
  tc: ThemeColors;
  fs: ThemeFontSizes;
}

const FontPreview: React.FC<FontPreviewProps> = ({ tc, fs }) => (
  <View style={[styles.previewBox, { backgroundColor: tc.surfaceAlt, borderColor: tc.divider }]}>
    <Text style={[styles.previewTitle, { color: tc.text, fontSize: fs.title }]}>Title</Text>
    <Text style={[styles.previewBody, { color: tc.text, fontSize: fs.body }]}>
      Body text preview
    </Text>
    <Text style={[styles.previewCaption, { color: tc.textLight, fontSize: fs.caption }]}>
      Caption text
    </Text>
  </View>
);

// ------- Main Screen -------
type Props = NativeStackScreenProps<SettingsStackParamList, 'AppPreferences'>;

const AppPreferenceScreen: React.FC<Props> = ({ navigation }) => {
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

  const { colors: tc, fontSizes: fs, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const isWide = isWeb && width >= 700;

  const [themeExpanded, setThemeExpanded] = useState(true);
  const [colorExpanded, setColorExpanded] = useState(true);
  const [accessibilityExpanded, setAccessibilityExpanded] = useState(true);

  const toggleSection = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter((prev) => !prev);
  };

  const Container = isWide ? View : SafeAreaView;

  return (
    <Container style={[styles.safeArea, { backgroundColor: tc.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          isWide && { maxWidth: 680, alignSelf: 'center' as any, width: '100%' as any, paddingHorizontal: 32, paddingTop: 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={tc.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: tc.text, fontSize: fs.title }]}>App Preference</Text>
        </View>

        {/* Theme Settings */}
        <SectionCard tc={tc}>
          <CollapsibleHeader
            title="Theme Settings"
            expanded={themeExpanded}
            onToggle={() => toggleSection(setThemeExpanded)}
            tc={tc}
            fs={fs}
          />
          {themeExpanded && (
            <View style={styles.sectionBody}>
              <Text style={[styles.subtitle, { color: tc.textLight, fontSize: fs.label }]}>
                Choose Your Theme
              </Text>
              <View style={styles.optionsColumn}>
                {THEME_OPTIONS.map((option) => {
                  const isSelected = theme === option;
                  const isOptionDark = option === 'Dark';
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.themeOption,
                        {
                          backgroundColor: isOptionDark ? tc.text : tc.surface,
                          borderWidth: isOptionDark ? 0 : 1.5,
                          borderColor: isOptionDark ? 'transparent' : tc.text,
                        },
                      ]}
                      onPress={() => setTheme(option)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.themeOptionText,
                          { color: isOptionDark ? tc.surface : tc.text, fontSize: fs.body },
                        ]}
                      >
                        {option}
                      </Text>
                      <RadioCircle
                        selected={isSelected}
                        color={isOptionDark ? tc.surface : tc.text}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </SectionCard>

        {/* Color Settings */}
        <SectionCard tc={tc}>
          <CollapsibleHeader
            title="Color Settings"
            expanded={colorExpanded}
            onToggle={() => toggleSection(setColorExpanded)}
            tc={tc}
            fs={fs}
          />
          {colorExpanded && (
            <View style={styles.sectionBody}>
              <Text style={[styles.subtitle, { color: tc.textLight, fontSize: fs.label }]}>
                Choose Your Accent
              </Text>
              <View style={styles.optionsColumn}>
                {ACCENT_OPTIONS.map((option) => {
                  const isSelected = accentColor === option;
                  const bg = ACCENT_PILL_COLORS[option];
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.accentOption, { backgroundColor: bg }]}
                      onPress={() => setAccentColor(option)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.accentOptionText, { fontSize: fs.body }]}>
                        {option}
                      </Text>
                      <RadioCircle selected={isSelected} color="#FFFFFF" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </SectionCard>

        {/* Accessibility (Font Size + High Contrast) */}
        <SectionCard tc={tc}>
          <CollapsibleHeader
            title="Accessibility"
            expanded={accessibilityExpanded}
            onToggle={() => toggleSection(setAccessibilityExpanded)}
            tc={tc}
            fs={fs}
          />
          {accessibilityExpanded && (
            <View style={styles.sectionBody}>
              <Text style={[styles.subtitle, { color: tc.textLight, fontSize: fs.label }]}>
                Font Size
              </Text>
              <View style={styles.fontSizeRow}>
                {FONT_SIZE_OPTIONS.map((option) => {
                  const isSelected = fontSize === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.fontSizeButton,
                        {
                          backgroundColor: isSelected ? tc.accent : tc.divider,
                        },
                      ]}
                      onPress={() => setFontSize(option)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.fontSizeText,
                          {
                            color: isSelected ? tc.textOnAccent : tc.text,
                            fontSize: fs.label,
                          },
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Live preview */}
              <FontPreview tc={tc} fs={fs} />

              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: tc.text, fontSize: fs.body }]}>
                  High Contrast Mode
                </Text>
                <Switch
                  value={highContrastMode}
                  onValueChange={setHighContrastMode}
                  trackColor={{ false: tc.disabled, true: tc.accent }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={tc.disabled}
                />
              </View>
            </View>
          )}
        </SectionCard>
      </ScrollView>
    </Container>
  );
};

// ------- Styles -------
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
  },
  // Card
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
  },
  sectionBody: {
    marginTop: 8,
  },
  subtitle: {
    fontFamily: fonts.regular,
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
  themeOptionText: {
    fontFamily: fonts.semiBold,
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
    fontFamily: fonts.semiBold,
    color: '#FFFFFF',
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
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  fontSizeText: {
    fontFamily: fonts.semiBold,
  },
  // Preview box
  previewBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },
  previewTitle: {
    fontFamily: fonts.bold,
  },
  previewBody: {
    fontFamily: fonts.regular,
  },
  previewCaption: {
    fontFamily: fonts.regular,
  },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  toggleLabel: {
    fontFamily: fonts.semiBold,
  },
});

export default AppPreferenceScreen;
