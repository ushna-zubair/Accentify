import React, { useState , useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Circle as SvgCircle, G } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useInsightsController, ENGLISH_LEVELS } from '../../controllers';
import type {
  LessonDay,
  PronunciationMetrics,
  ConversationMetrics,
  OverallPerformance,
  EnglishLevel,
} from '../../models';

// ═══════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════

// ─── Lesson Status Icon ───
const LessonIcon: React.FC<{ item: LessonDay }> = ({ item }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const STATUS_CONFIG = {
    completed: { bg: tc.accent, icon: 'checkmark-circle' as const, iconColor: tc.white },
    in_progress: { bg: '#2D2D3A', icon: 'time' as const, iconColor: tc.white },
    upcoming: { bg: tc.accentMuted, icon: 'rocket' as const, iconColor: tc.accent },
  };
  const cfg = STATUS_CONFIG[item.status];
  return (
    <View style={styles.lessonIconWrapper}>
      <View style={[styles.lessonIconCircle, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.iconColor} />
      </View>
      <Text style={styles.lessonStatusLabel}>
        {item.status === 'completed'
          ? 'Completed'
          : item.status === 'in_progress'
            ? 'in progress'
            : 'Upcoming'}
      </Text>
    </View>
  );
};

// ─── Metric Bar Chart (4 bars with labels) ───
interface MetricBar {
  label: string;
  value: number;
  color: string;
}

const MetricBarChart: React.FC<{ title: string; bars: MetricBar[] }> = ({ title, bars }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const chartHeight = 110;
  const barWidth = 28;
  const gap = 16;
  const totalWidth = bars.length * barWidth + (bars.length - 1) * gap;

  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricCardTitle}>{title}</Text>
      <View style={styles.metricChartContainer}>
        <Svg width={totalWidth + 10} height={chartHeight + 6}>
          {bars.map((bar, i) => {
            const h = (bar.value / maxVal) * chartHeight;
            const x = i * (barWidth + gap) + 5;
            return (
              <Rect
                key={bar.label}
                x={x}
                y={chartHeight - h}
                width={barWidth}
                height={h}
                rx={4}
                fill={bar.color}
              />
            );
          })}
        </Svg>
        <View style={[styles.metricLabelsRow, { width: totalWidth + 10 }]}>
          {bars.map((bar) => (
            <Text
              key={bar.label}
              style={[styles.metricBarLabel, { width: barWidth + gap - 2 }]}
              numberOfLines={2}
            >
              {bar.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

// ─── Overall Performance Donut ───
const PerformanceDonut: React.FC<{ performance: OverallPerformance }> = ({ performance }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const size = 150;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const total =
    performance.speechAccuracy + performance.speechFluency + performance.speechConsistency || 100;

  const segments = [
    { label: 'Speech Accuracy', value: performance.speechAccuracy, color: '#C6E34E' },
    { label: 'Speech Fluency', value: performance.speechFluency, color: tc.accent },
    { label: 'Speech Consistency', value: performance.speechConsistency, color: '#E74C6F' },
  ];

  let accumulated = 0;

  return (
    <View style={styles.donutContainer}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <SvgCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tc.divider}
            strokeWidth={strokeWidth}
          />
          {segments.map((seg) => {
            const pct = seg.value / total;
            const dashLength = pct * circumference;
            const dashOffset = -accumulated * circumference;
            accumulated += pct;
            return (
              <SvgCircle
                key={seg.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            );
          })}
        </G>
      </Svg>
      {/* Center Label */}
      <View style={styles.donutCenter}>
        <Text style={styles.donutCenterValue}>{performance.speechAccuracy}%</Text>
      </View>
      {/* Legend */}
      <View style={styles.donutLegend}>
        {segments.map((seg) => (
          <View key={seg.label} style={styles.donutLegendItem}>
            <View style={[styles.donutLegendDot, { backgroundColor: seg.color }]} />
            <Text style={styles.donutLegendText}>{seg.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Level Picker Modal ───
const LevelPickerModal: React.FC<{
  visible: boolean;
  selected: EnglishLevel;
  onSelect: (level: EnglishLevel) => void;
  onClose: () => void;
}> = ({ visible, selected, onSelect, onClose }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  return (
  <Modal visible={visible} transparent animationType="slide">
    <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.pickerContent}>
        <Text style={styles.pickerTitle}>Set English Level</Text>
        {ENGLISH_LEVELS.map((lvl) => (
          <TouchableOpacity
            key={lvl}
            style={[styles.pickerOption, selected === lvl && styles.pickerOptionSelected]}
            onPress={() => onSelect(lvl)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pickerOptionText,
                selected === lvl && styles.pickerOptionTextSelected,
              ]}
            >
              {lvl}
            </Text>
            {selected === lvl && (
              <Ionicons name="checkmark-circle" size={20} color={tc.accent} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  </Modal>
  );
};

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const PRONUNCIATION_COLORS = ['#E74C3C', '#2ECC71', '#F1C40F', '#E67E22'];
const CONVERSATION_COLORS = ['#2ECC71', '#F1C40F', '#E67E22', '#E74C3C'];

const AdminInsightsScreen: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const navigation = useNavigation();
  const {
    insightsData,
    loading,
    error,
    searchId,
    setSearchId,
    fetchUserInsights,
    updateUserLevel,
  } = useInsightsController();

  const [levelModalVisible, setLevelModalVisible] = useState(false);

  const handleSearch = () => fetchUserInsights(searchId);

  const handleLevelSelect = (level: EnglishLevel) => {
    updateUserLevel(level);
    setLevelModalVisible(false);
  };

  // Map metrics to bar data
  const pronunciationBars: MetricBar[] = insightsData.weeklyProgress
    ? [
        { label: 'Clarity', value: insightsData.weeklyProgress.pronunciation.clarity, color: PRONUNCIATION_COLORS[0] },
        { label: 'Sound\nAccuracy', value: insightsData.weeklyProgress.pronunciation.soundAccuracy, color: PRONUNCIATION_COLORS[1] },
        { label: 'Rhythm &\nTempo', value: insightsData.weeklyProgress.pronunciation.rhythmAndTone, color: PRONUNCIATION_COLORS[2] },
        { label: 'Smoothness', value: insightsData.weeklyProgress.pronunciation.smoothness, color: PRONUNCIATION_COLORS[3] },
      ]
    : [];

  const conversationBars: MetricBar[] = insightsData.weeklyProgress
    ? [
        { label: 'Fluency', value: insightsData.weeklyProgress.conversation.fluency, color: CONVERSATION_COLORS[0] },
        { label: 'Vocabulary', value: insightsData.weeklyProgress.conversation.vocabulary, color: CONVERSATION_COLORS[1] },
        { label: 'Grammar\nUsage', value: insightsData.weeklyProgress.conversation.grammarUsage, color: CONVERSATION_COLORS[2] },
        { label: 'Turn-Taking', value: insightsData.weeklyProgress.conversation.turnTaking, color: CONVERSATION_COLORS[3] },
      ]
    : [];

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={tc.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Insights</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── User ID Search ── */}
        <View style={styles.userIdSection}>
          <Text style={styles.userIdLabel}>User ID:</Text>
          <View style={styles.userIdInputRow}>
            <TextInput
              style={styles.userIdInput}
              placeholder="Enter user ID"
              placeholderTextColor={tc.textMuted}
              value={searchId}
              onChangeText={setSearchId}
              keyboardType="default"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Ionicons name="search" size={18} color={tc.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Loading / Error ── */}
        {loading && (
          <ActivityIndicator
            size="large"
            color={tc.accent}
            style={{ marginVertical: 32 }}
          />
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* ── Content (only once we have a userId) ── */}
        {!!insightsData.userId && !loading && (
          <>
            {/* ── Weekly Progress Insight ── */}
            <View style={styles.weeklyHeader}>
              <Text style={styles.weeklyTitle}>Weekly Progress Insight</Text>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeText}>{insightsData.weekLabel}</Text>
                <Ionicons name="chevron-down" size={14} color={tc.text} />
              </View>
            </View>

            {/* ── Lesson Day Icons ── */}
            <View style={styles.divider} />
            <FlatList
              horizontal
              data={insightsData.lessonDays}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <LessonIcon item={item} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.lessonDayList}
            />

            {/* ── Overall Performance ── */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>Overall Performance</Text>
              <PerformanceDonut performance={insightsData.weeklyProgress.overallPerformance} />
            </View>

            {/* ── Pronunciation & Conversation Cards ── */}
            <View style={styles.metricsRow}>
              <MetricBarChart title="Pronunciation" bars={pronunciationBars} />
              <MetricBarChart title="Conversation" bars={conversationBars} />
            </View>

            {/* ── Set Level ── */}
            <View style={styles.setLevelSection}>
              <Text style={styles.setLevelTitle}>Set Level</Text>
              <TouchableOpacity
                style={styles.levelDropdown}
                onPress={() => setLevelModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.levelDropdownText}>{insightsData.currentLevel}</Text>
                <Ionicons name="chevron-down" size={20} color={tc.text} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Level Picker ── */}
      <LevelPickerModal
        visible={levelModalVisible}
        selected={insightsData.currentLevel}
        onSelect={handleLevelSelect}
        onClose={() => setLevelModalVisible(false)}
      />
    </View>
  );
};

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tc.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: tc.text,
  },
  headerSpacer: {
    width: 32,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // User ID
  userIdSection: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  userIdLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: tc.text,
    marginBottom: 8,
  },
  userIdInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
  },
  userIdInput: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: tc.text,
    backgroundColor: tc.accentMuted,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    textAlign: 'center',
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tc.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  errorText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: tc.error,
    textAlign: 'center',
    marginVertical: 12,
  },

  // Weekly header
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weeklyTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: tc.text,
    flex: 1,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tc.accentMuted,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  dateBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: tc.text,
  },

  divider: {
    height: 1,
    backgroundColor: tc.divider,
    marginBottom: 12,
  },

  // Lesson day icons
  lessonDayList: {
    paddingBottom: 16,
    gap: 12,
  },
  lessonIconWrapper: {
    alignItems: 'center',
    width: 68,
  },
  lessonIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  lessonStatusLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: tc.textLight,
    textAlign: 'center',
  },

  // Overall Performance
  sectionCard: {
    backgroundColor: tc.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tc.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  sectionCardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: tc.textLight,
    marginBottom: 8,
  },

  // Donut
  donutContainer: {
    alignItems: 'center',
  },
  donutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenterValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: tc.text,
  },
  donutLegend: {
    marginTop: 12,
    gap: 6,
    alignSelf: 'flex-end',
    paddingRight: 4,
  },
  donutLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  donutLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  donutLegendText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: tc.textLight,
  },

  // Metric Cards Row
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FDE8F0',
    borderRadius: 14,
    padding: 12,
    paddingBottom: 8,
  },
  metricCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: tc.text,
    marginBottom: 10,
  },
  metricChartContainer: {
    alignItems: 'center',
  },
  metricLabelsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  metricBarLabel: {
    fontFamily: fonts.regular,
    fontSize: 8,
    color: tc.textLight,
    textAlign: 'center',
  },

  // Set Level
  setLevelSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  setLevelTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: tc.text,
    marginBottom: 10,
  },
  levelDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tc.accentMuted,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 10,
    width: '70%',
  },
  levelDropdownText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: tc.text,
  },

  // Level Picker Modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: tc.overlay,
    justifyContent: 'flex-end',
  },
  pickerContent: {
    backgroundColor: tc.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  pickerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: tc.text,
    marginBottom: 16,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  pickerOptionSelected: {
    backgroundColor: tc.accentMuted,
  },
  pickerOptionText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: tc.text,
  },
  pickerOptionTextSelected: {
    fontFamily: fonts.semiBold,
    color: tc.accent,
  },
});

export default AdminInsightsScreen;
