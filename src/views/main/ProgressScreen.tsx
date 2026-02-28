import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Svg, {
  Rect,
  Circle as SvgCircle,
  G,
  Polyline,
  Line,
  Text as SvgText,
  Path,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { useProgressController } from '../../controllers/useProgressController';
import type {
  LessonDay,
  VocabularyGrowthPoint,
  OverallPerformance,
} from '../../models';

const { width: SCREEN_W } = Dimensions.get('window');

// ═══════════════════════════════════════════════
//  CHART COLORS
// ═══════════════════════════════════════════════

const CHART = {
  red: '#E94F54',
  orange: '#FD8E39',
  yellow: '#F3BB1B',
  green: '#3DC13C',
  blue: '#3F66FB',
  pink: '#FE7F9C',
};

// ═══════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════

// ─── Day Streak Rocket ───
const DayStreak: React.FC<{ streak: number }> = ({ streak }) => (
  <View style={styles.streakContainer}>
    <View style={styles.rocketCircle}>
      {/* Rocket SVG icon */}
      <Svg width={50} height={50} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2C12 2 7 7 7 12C7 14 8 16 10 17.5V21H14V17.5C16 16 17 14 17 12C17 7 12 2 12 2Z"
          fill={colors.text}
          stroke={colors.text}
          strokeWidth={0.5}
        />
        <Path
          d="M10 21H14V22H10V21Z"
          fill={colors.text}
        />
        <SvgCircle cx={12} cy={11} r={2} fill={colors.primaryLight} />
        <Path
          d="M7 12C5 13 4 15 4 15L7 14Z"
          fill={colors.text}
        />
        <Path
          d="M17 12C19 13 20 15 20 15L17 14Z"
          fill={colors.text}
        />
      </Svg>
      <View style={styles.streakBadge}>
        <Text style={styles.streakBadgeText}>{streak}</Text>
      </View>
    </View>
    <Text style={styles.streakLabel}>Day Streak</Text>
  </View>
);

// ─── Lesson Day Item ───
const STATUS_ICON: Record<LessonDay['status'], { icon: string; bg: string }> = {
  completed: { icon: 'checkmark-circle', bg: colors.primary },
  in_progress: { icon: 'time', bg: colors.primary },
  upcoming: { icon: 'time-outline', bg: colors.primaryMuted },
};

const STATUS_LABEL: Record<LessonDay['status'], string> = {
  completed: 'Completed',
  in_progress: 'In\nprogress',
  upcoming: 'Upcoming',
};

/** Get the label for a lesson day — special 'Tomorrow' label for the day after in-progress */
const getLessonLabel = (item: LessonDay, allDays: LessonDay[]): string => {
  if (item.status !== 'upcoming') return STATUS_LABEL[item.status];
  const activeIndex = allDays.findIndex((d) => d.status === 'in_progress');
  if (activeIndex >= 0) {
    const itemIndex = allDays.findIndex((d) => d.id === item.id);
    if (itemIndex === activeIndex + 1) return 'Tomorrow';
  }
  return 'Upcoming';
};

const LessonDayItem: React.FC<{ item: LessonDay; allDays: LessonDay[] }> = ({ item, allDays }) => {
  const cfg = STATUS_ICON[item.status];
  const label = getLessonLabel(item, allDays);
  return (
    <View style={styles.lessonDay}>
      <View style={[styles.lessonDayCircle, { backgroundColor: cfg.bg }]}>
        <Ionicons
          name={cfg.icon as any}
          size={24}
          color={colors.white}
        />
      </View>
      <Text
        style={[
          styles.lessonDayLabel,
          item.status === 'in_progress' && styles.lessonDayLabelActive,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
};

// ─── Mini Grouped Bar Chart (for Pronunciation / Conversation) ───
interface GroupedBarProps {
  data: { label: string; value: number; color: string }[];
  height?: number;
}

const GroupedBarChart: React.FC<GroupedBarProps> = ({ data, height = 110 }) => {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 22;
  const gap = 18;
  const totalWidth = data.length * (barWidth + gap) - gap;

  return (
    <View style={gbcStyles.container}>
      <Svg width={totalWidth + 20} height={height + 4}>
        {data.map((item, i) => {
          const x = 10 + i * (barWidth + gap);
          const h = (item.value / maxVal) * (height - 10);
          return (
            <Rect
              key={item.label}
              x={x}
              y={height - h}
              width={barWidth}
              height={h}
              rx={4}
              fill={item.color}
            />
          );
        })}
      </Svg>
      <View style={[gbcStyles.labelsRow, { width: totalWidth + 20 }]}>
        {data.map((item, i) => (
          <Text
            key={item.label}
            style={[
              gbcStyles.label,
              {
                width: barWidth + gap,
                left: i * (barWidth + gap),
              },
            ]}
            numberOfLines={2}
          >
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const gbcStyles = StyleSheet.create({
  container: { alignItems: 'center', marginTop: 6 },
  labelsRow: { flexDirection: 'row', marginTop: 4, position: 'relative', height: 28 },
  label: {
    fontFamily: fonts.regular,
    fontSize: 8,
    color: colors.textLight,
    textAlign: 'center',
    position: 'absolute',
  },
});

// ─── Mini Line Chart (for Vocabulary Growth) ───
interface MiniLineChartProps {
  data: VocabularyGrowthPoint[];
  height?: number;
  width?: number;
}

const MiniLineChart: React.FC<MiniLineChartProps> = ({
  data,
  height = 120,
  width = 220,
}) => {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const padding = 16;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;

  const points = data
    .map((d, i) => {
      const x = padding + (i / (data.length - 1)) * usableW;
      const y = padding + usableH - (d.value / maxVal) * usableH;
      return `${x},${y}`;
    })
    .join(' ');

  const coords = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * usableW,
    y: padding + usableH - (d.value / maxVal) * usableH,
  }));

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padding + usableH * (1 - pct);
          return (
            <Line
              key={pct}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke={colors.divider}
              strokeWidth={0.5}
            />
          );
        })}
        <Polyline
          points={points}
          fill="none"
          stroke={colors.text}
          strokeWidth={1.5}
        />
        {coords.map((c, i) => (
          <SvgCircle key={i} cx={c.x} cy={c.y} r={2.5} fill={colors.text} />
        ))}
      </Svg>
      {/* Axis labels */}
      <View style={mlcStyles.axisRow}>
        {data.map((d) => (
          <Text key={d.label} style={mlcStyles.axisLabel}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const mlcStyles = StyleSheet.create({
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 2,
  },
  axisLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: colors.textMuted,
  },
});

// ─── Mini Donut (for Overall Performance) ───
interface MiniDonutProps {
  performance: OverallPerformance;
  size?: number;
}

const MiniDonut: React.FC<MiniDonutProps> = ({ performance, size = 80 }) => {
  const segments = [
    { label: 'Speech Accuracy', value: performance.speechAccuracy, color: CHART.green },
    { label: 'Speech Fluency', value: performance.speechFluency, color: CHART.blue },
    {
      label: 'Speech Consistency',
      value: performance.speechConsistency,
      color: CHART.pink,
    },
  ];

  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  let accumulated = 0;

  return (
    <View style={mdStyles.container}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <SvgCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.divider}
            strokeWidth={strokeWidth}
          />
          {segments.map((seg) => {
            const pct = seg.value / total;
            const dashLen = pct * circumference;
            const offset = -accumulated * circumference;
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
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            );
          })}
        </G>
        {/* Center percentage */}
        <SvgText
          x={size / 2}
          y={size / 2 - 6}
          textAnchor="middle"
          fontFamily={fonts.bold}
          fontSize={11}
          fill={colors.text}
        >
          {segments[0].value}%
        </SvgText>
        <SvgText
          x={size / 2}
          y={size / 2 + 8}
          textAnchor="middle"
          fontFamily={fonts.regular}
          fontSize={7}
          fill={colors.textLight}
        >
          {`${segments[1].value}%  ${segments[2].value}%`}
        </SvgText>
      </Svg>

      {/* Legend */}
      <View style={mdStyles.legend}>
        {segments.map((seg) => (
          <View key={seg.label} style={mdStyles.legendItem}>
            <View style={[mdStyles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={mdStyles.legendLabel} numberOfLines={1}>
              {seg.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const mdStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legend: { flex: 1, gap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontFamily: fonts.regular, fontSize: 9, color: colors.textLight, flexShrink: 1 },
});

// ═══════════════════════════════════════════════
//  PROGRESS SCREEN
// ═══════════════════════════════════════════════

const ProgressScreen: React.FC = () => {
  const {
    progressData,
    loading,
    currentWeek,
    weekLabel,
    weekDateLabel,
    selectedWeekIndex,
    selectWeek,
  } = useProgressController();

  // Memoized chart data
  const pronunciationBars = useMemo(() => {
    if (!currentWeek) return [];
    const p = currentWeek.pronunciation;
    return [
      { label: 'Clarity', value: p.clarity, color: CHART.red },
      { label: 'Sound\nAccuracy', value: p.soundAccuracy, color: CHART.orange },
      { label: 'Smooth-\nness', value: p.smoothness, color: CHART.yellow },
      { label: 'Rhythm &\nTone', value: p.rhythmAndTone, color: CHART.green },
    ];
  }, [currentWeek]);

  const conversationBars = useMemo(() => {
    if (!currentWeek) return [];
    const c = currentWeek.conversation;
    return [
      { label: 'Fluency', value: c.fluency, color: CHART.green },
      { label: 'Vocabu-\nlary', value: c.vocabulary, color: CHART.orange },
      { label: 'Gram-\nmar', value: c.grammarUsage, color: CHART.red },
      { label: 'Turn-\nTaking', value: c.turnTaking, color: CHART.yellow },
    ];
  }, [currentWeek]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Day Streak ── */}
      <DayStreak streak={progressData.dayStreak} />

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Lesson Days Scroll ── */}
      <FlatList
        data={progressData.lessonDays}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LessonDayItem item={item} allDays={progressData.lessonDays} />
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.lessonDayList}
        style={styles.lessonDayScroll}
      />

      {/* ── Weekly Progress Header ── */}
      <View style={styles.weeklyHeader}>
        <Text style={styles.weeklyTitle}>Weekly Progress</Text>
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>{weekDateLabel}</Text>
          <Ionicons name="caret-down" size={10} color={colors.primary} />
        </View>
      </View>

      {/* ── Week Selector ── */}
      <View style={styles.weekRow}>
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        {progressData.weeks.length > 1 && (
          <View style={styles.weekNav}>
            <TouchableOpacity
              onPress={() => selectWeek(selectedWeekIndex - 1)}
              disabled={selectedWeekIndex === 0}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={
                  selectedWeekIndex === 0 ? colors.disabled : colors.primary
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => selectWeek(selectedWeekIndex + 1)}
              disabled={selectedWeekIndex === progressData.weeks.length - 1}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={
                  selectedWeekIndex === progressData.weeks.length - 1
                    ? colors.disabled
                    : colors.primary
                }
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Cards Grid ── */}
      {currentWeek && (
        <View style={styles.cardsGrid}>
          {/* Pronunciation Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pronunciation</Text>
            <GroupedBarChart data={pronunciationBars} height={100} />
          </View>

          {/* Conversation Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Conversation</Text>
            <GroupedBarChart data={conversationBars} height={100} />
          </View>

          {/* Vocabulary Growth Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Vocabulary growth</Text>
            <MiniLineChart
              data={currentWeek.vocabularyGrowth}
              height={100}
              width={SCREEN_W / 2 - 50}
            />
          </View>

          {/* Overall Performance Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Overall Performance</Text>
            <MiniDonut performance={currentWeek.overallPerformance} size={80} />
          </View>
        </View>
      )}
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════

const styles = StyleSheet.create({
  // ─── Layout ───
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Day Streak ───
  streakContainer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  rocketCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakBadge: {
    position: 'absolute',
    bottom: -4,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  streakBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.white,
  },
  streakLabel: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    marginTop: 10,
  },

  // ─── Divider ───
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 20,
    marginVertical: 8,
  },

  // ─── Lesson Days ───
  lessonDayScroll: {
    marginVertical: 8,
  },
  lessonDayList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  lessonDay: {
    alignItems: 'center',
    width: 60,
  },
  lessonDayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  lessonDayLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textLight,
    textAlign: 'center',
  },
  lessonDayLabelActive: {
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },

  // ─── Weekly Header ───
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 10,
  },
  weeklyTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dateBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.primary,
  },

  // ─── Week Row ───
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  weekLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textLight,
  },
  weekNav: {
    flexDirection: 'row',
    gap: 8,
  },

  // ─── Cards Grid ───
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
  },
  cardTitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 6,
  },
});

export default ProgressScreen;
