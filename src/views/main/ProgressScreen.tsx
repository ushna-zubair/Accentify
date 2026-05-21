import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import Svg, {
  Circle as SvgCircle,
  G,
  Polyline,
  Line,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
  Path,
} from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { fonts } from '../../theme/typography';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { useProgressController } from '../../controllers/useProgressController';
import { useResponsive, type ResponsiveValues } from '../../utils/responsive';
import type {
  LessonDay,
  VocabularyGrowthPoint,
  OverallPerformance,
} from '../../models';

// ═══════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════

const CHART = {
  red: '#E94F54',
  orange: '#FD8E39',
  yellow: '#F3BB1B',
  green: '#3DC13C',
  blue: '#3F66FB',
  pink: '#FE7F9C',
  teal: '#2DD4BF',
  purple: '#8B5CF6',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ═══════════════════════════════════════════════
//  SHADOW HELPER
// ═══════════════════════════════════════════════

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 3 },
  default: {},
});

// ═══════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════

// ─── Section Header ───
const SectionHeader: React.FC<{
  icon: string;
  iconSet?: 'ion' | 'mci';
  title: string;
  r: ResponsiveValues;
  tc: ThemeColors;
  right?: React.ReactNode;
}> = ({ icon, iconSet = 'ion', title, r, tc, right }) => (
  <View style={[secStyles.row, { paddingHorizontal: r.s(20), marginTop: r.vs(20), marginBottom: r.vs(10) }]}>
    <View style={secStyles.left}>
      <View style={[secStyles.iconPill, { width: r.ms(28), height: r.ms(28), borderRadius: r.ms(8), backgroundColor: tc.accentMuted }]}>
        {iconSet === 'ion' ? (
          <Ionicons name={icon as any} size={r.ms(15)} color={tc.accent} />
        ) : (
          <MaterialCommunityIcons name={icon as any} size={r.ms(15)} color={tc.accent} />
        )}
      </View>
      <Text style={[secStyles.title, { fontSize: r.ms(17, 0.3), color: tc.text }]}>{title}</Text>
    </View>
    {right}
  </View>
);

const secStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconPill: { alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold },
});

// ─── Day Streak Banner ───
const DayStreakBanner: React.FC<{ streak: number; r: ResponsiveValues; tc: ThemeColors }> = ({ streak, r, tc }) => {
  return (
    <View style={[dsBannerStyles.wrapper, { marginHorizontal: r.s(20), marginTop: r.vs(16), borderRadius: r.ms(16), padding: r.ms(16), backgroundColor: tc.accent }]}>
      <View style={dsBannerStyles.left}>
        <View style={[dsBannerStyles.fireCircle, { width: r.ms(56), height: r.ms(56), borderRadius: r.ms(28) }]}>
          <Svg width={r.ms(30)} height={r.ms(30)} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 2C12 2 7 7 7 12C7 14 8 16 10 17.5V21H14V17.5C16 16 17 14 17 12C17 7 12 2 12 2Z"
              fill="#FFFFFF"
              stroke="#FFFFFF"
              strokeWidth={0.5}
            />
            <SvgCircle cx={12} cy={11} r={2} fill={tc.accentLight} />
            <Path d="M7 12C5 13 4 15 4 15L7 14Z" fill="#FFFFFF" />
            <Path d="M17 12C19 13 20 15 20 15L17 14Z" fill="#FFFFFF" />
          </Svg>
        </View>
        <View style={dsBannerStyles.textCol}>
          <Text style={[dsBannerStyles.count, { fontSize: r.ms(28, 0.3) }]}>{streak}</Text>
          <Text style={[dsBannerStyles.label, { fontSize: r.ms(13, 0.3) }]}>Day Streak</Text>
        </View>
      </View>
      <View style={[dsBannerStyles.badge, { borderRadius: r.ms(12), paddingHorizontal: r.s(12), paddingVertical: r.vs(4), backgroundColor: tc.warningBg }]}>
        <Ionicons name="flame" size={r.ms(14)} color={tc.warningDeep} />
        <Text style={[dsBannerStyles.badgeText, { fontSize: r.ms(11, 0.3), color: tc.warningDeep }]}>Keep it up!</Text>
      </View>
    </View>
  );
};

const dsBannerStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...cardShadow,
  } as any,
  left: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  fireCircle: { backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  textCol: {},
  count: { fontFamily: fonts.bold, color: '#FFFFFF', lineHeight: 34 },
  label: { fontFamily: fonts.medium, color: 'rgba(255,255,255,0.85)' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontFamily: fonts.semiBold },
});

// ─── Lesson Day Item ───
const LessonDayItem: React.FC<{ item: LessonDay; isActive: boolean; r: ResponsiveValues; tc: ThemeColors }> = ({
  item,
  isActive,
  r,
  tc,
}) => {
  const statusCfg: Record<LessonDay['status'], { icon: string; bg: string; border: string }> = {
    completed: { icon: 'checkmark', bg: tc.success, border: tc.success },
    in_progress: { icon: 'play', bg: tc.accent, border: tc.accent },
    upcoming: { icon: 'time-outline', bg: tc.surfaceAlt, border: tc.cardBorder },
  };
  const cfg = statusCfg[item.status];
  const circleSize = r.ms(42);
  const iconColor = item.status === 'upcoming' ? tc.textMuted : tc.white;
  const dayName = DAY_NAMES[item.day] ?? '';

  return (
    <View style={[ldStyles.wrapper, { width: r.ms(54) }]}>
      <Text style={[ldStyles.dayName, { fontSize: r.ms(11, 0.3), color: tc.textLight }, isActive && { color: tc.accent, fontFamily: fonts.semiBold }]}>
        {dayName}
      </Text>
      <View
        style={[
          ldStyles.circle,
          {
            backgroundColor: cfg.bg,
            borderColor: cfg.border,
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
          },
          isActive && { borderColor: tc.accent, borderWidth: 2.5 },
        ]}
      >
        <Ionicons name={cfg.icon as any} size={r.ms(18, 0.3)} color={iconColor} />
      </View>
      {isActive && <View style={[ldStyles.activeDot, { width: r.ms(5), height: r.ms(5), borderRadius: r.ms(3), marginTop: r.vs(4), backgroundColor: tc.accent }]} />}
    </View>
  );
};

const ldStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 6 },
  dayName: { fontFamily: fonts.medium },
  circle: { justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  activeDot: {},
});

// ─── Horizontal Bar Chart (modern style for small cards) ───
interface HBarChartProps {
  data: { label: string; value: number; color: string }[];
  r: ResponsiveValues;
  tc: ThemeColors;
}

const HBarChart: React.FC<HBarChartProps> = ({ data, r, tc }) => {
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={hbarStyles.container}>
      {data.map((item) => {
        const pct = Math.round((item.value / maxVal) * 100);
        return (
          <View key={item.label} style={hbarStyles.row}>
            <Text style={[hbarStyles.label, { fontSize: r.ms(10, 0.3), width: r.ms(64, 0.3), color: tc.textLight }]} numberOfLines={1}>
              {item.label}
            </Text>
            <View style={[hbarStyles.track, { height: r.ms(8), borderRadius: r.ms(4), backgroundColor: tc.surfaceAlt }]}>
              <View
                style={[
                  hbarStyles.fill,
                  {
                    backgroundColor: item.color,
                    width: `${pct}%` as any,
                    height: r.ms(8),
                    borderRadius: r.ms(4),
                  },
                ]}
              />
            </View>
            <Text style={[hbarStyles.pct, { fontSize: r.ms(10, 0.3), width: r.ms(30, 0.3), color: tc.text }]}>
              {item.value}%
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const hbarStyles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontFamily: fonts.medium },
  track: { flex: 1 },
  fill: {},
  pct: { fontFamily: fonts.semiBold, textAlign: 'right' },
});

// ─── Mini Line Chart (Vocabulary Growth) ───
interface MiniLineChartProps {
  data: VocabularyGrowthPoint[];
  height?: number;
  width: number;
  tc: ThemeColors;
}

const MiniLineChart: React.FC<MiniLineChartProps> = ({
  data,
  height = 120,
  width,
  tc,
}) => {
  if (data.length < 2 || width <= 0) return null;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const padding = Math.max(14, width * 0.08);
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;

  const coords = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * usableW,
    y: padding + usableH - (d.value / maxVal) * usableH,
    value: d.value,
  }));

  const points = coords.map((c) => `${c.x},${c.y}`).join(' ');

  const firstX = coords[0].x;
  const lastX = coords[coords.length - 1].x;
  const bottomY = padding + usableH;
  const fillPath = `${firstX},${bottomY} ${points} ${lastX},${bottomY}`;

  const dotRadius = Math.max(3, width * 0.018);

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tc.accent} stopOpacity="0.18" />
            <Stop offset="1" stopColor={tc.accent} stopOpacity="0.02" />
          </SvgLinearGradient>
        </Defs>
        {[0, 0.5, 1].map((pct) => {
          const y = padding + usableH * (1 - pct);
          return (
            <Line
              key={pct}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke={tc.divider}
              strokeWidth={0.5}
              strokeDasharray="4,3"
            />
          );
        })}
        <Polyline points={fillPath} fill="url(#areaGrad)" stroke="none" />
        <Polyline points={points} fill="none" stroke={tc.accent} strokeWidth={2} strokeLinejoin="round" />
        {coords.map((c, i) => (
          <React.Fragment key={i}>
            <SvgCircle cx={c.x} cy={c.y} r={dotRadius + 2} fill={tc.surface} />
            <SvgCircle cx={c.x} cy={c.y} r={dotRadius} fill={tc.accent} />
          </React.Fragment>
        ))}
      </Svg>
      <View style={[mlcStyles.axisRow, { paddingHorizontal: padding }]}>
        {data.map((d) => (
          <Text key={d.label} style={[mlcStyles.axisLabel, { color: tc.textMuted }]}>
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
    marginTop: 4,
  },
  axisLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
  },
});

// ─── Donut Chart (Overall Performance) ───
interface DonutProps {
  performance: OverallPerformance;
  size: number;
  r: ResponsiveValues;
  tc: ThemeColors;
}

const DonutChart: React.FC<DonutProps> = ({ performance, size, r, tc }) => {
  const segments = [
    { label: 'Accuracy', value: performance.speechAccuracy, color: CHART.green },
    { label: 'Fluency', value: performance.speechFluency, color: CHART.blue },
    { label: 'Consistency', value: performance.speechConsistency, color: CHART.purple },
  ];

  const strokeWidth = Math.max(10, size * 0.16);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const avg = Math.round(total / segments.length);

  let accumulated = 0;

  return (
    <View style={donutStyles.wrapper}>
      <View style={donutStyles.chartCenter}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <SvgCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={tc.surfaceAlt}
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
          <SvgText
            x={size / 2}
            y={size / 2 - 1}
            textAnchor="middle"
            fontFamily={fonts.bold}
            fontSize={Math.max(12, size * 0.16)}
            fill={tc.text}
          >
            {avg}%
          </SvgText>
          <SvgText
            x={size / 2}
            y={size / 2 + Math.max(8, size * 0.1)}
            textAnchor="middle"
            fontFamily={fonts.regular}
            fontSize={Math.max(6, size * 0.07)}
            fill={tc.textLight}
          >
            avg score
          </SvgText>
        </Svg>
      </View>

      {/* Legend */}
      <View style={donutStyles.legend}>
        {segments.map((seg) => (
          <View key={seg.label} style={donutStyles.legendRow}>
            <View style={[donutStyles.dot, { backgroundColor: seg.color, width: r.ms(6), height: r.ms(6), borderRadius: r.ms(3) }]} />
            <Text style={[donutStyles.legendLabel, { fontSize: r.ms(9, 0.3), color: tc.textLight }]} numberOfLines={1}>
              {seg.label}
            </Text>
            <Text style={[donutStyles.legendVal, { fontSize: r.ms(9, 0.3), color: tc.text }]}>{seg.value}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const donutStyles = StyleSheet.create({
  wrapper: { flexDirection: 'column', alignItems: 'center', gap: 6 },
  chartCenter: { alignItems: 'center' },
  legend: { width: '100%', gap: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: {},
  legendLabel: { fontFamily: fonts.regular, flex: 1 },
  legendVal: { fontFamily: fonts.semiBold },
});

// ─── Week Pill Selector ───
const WeekSelector: React.FC<{
  weekLabel: string;
  weekDateLabel: string;
  selectedWeekIndex: number;
  totalWeeks: number;
  selectWeek: (i: number) => void;
  r: ResponsiveValues;
  tc: ThemeColors;
}> = ({ weekLabel, weekDateLabel, selectedWeekIndex, totalWeeks, selectWeek, r, tc }) => (
  <View style={[wsStyles.row, { paddingHorizontal: r.s(20), marginBottom: r.vs(12) }]}>
    <View>
      <Text style={[wsStyles.weekText, { fontSize: r.ms(15, 0.3), color: tc.text }]}>{weekLabel}</Text>
      <Text style={[wsStyles.dateText, { fontSize: r.ms(11, 0.3), color: tc.textLight }]}>{weekDateLabel}</Text>
    </View>
    {totalWeeks > 1 && (
      <View style={[wsStyles.nav, { borderRadius: r.ms(10), paddingHorizontal: r.s(4), paddingVertical: r.vs(2), backgroundColor: tc.surfaceAlt }]}>
        <TouchableOpacity
          onPress={() => selectWeek(selectedWeekIndex - 1)}
          disabled={selectedWeekIndex === 0}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[wsStyles.navBtn, { width: r.ms(30), height: r.ms(30), borderRadius: r.ms(8) }]}
        >
          <Ionicons
            name="chevron-back"
            size={r.ms(16)}
            color={selectedWeekIndex === 0 ? tc.disabled : tc.accent}
          />
        </TouchableOpacity>
        <Text style={[wsStyles.navIndex, { fontSize: r.ms(11, 0.3), color: tc.textLight }]}>
          {selectedWeekIndex + 1}/{totalWeeks}
        </Text>
        <TouchableOpacity
          onPress={() => selectWeek(selectedWeekIndex + 1)}
          disabled={selectedWeekIndex === totalWeeks - 1}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[wsStyles.navBtn, { width: r.ms(30), height: r.ms(30), borderRadius: r.ms(8) }]}
        >
          <Ionicons
            name="chevron-forward"
            size={r.ms(16)}
            color={selectedWeekIndex === totalWeeks - 1 ? tc.disabled : tc.accent}
          />
        </TouchableOpacity>
      </View>
    )}
  </View>
);

const wsStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekText: { fontFamily: fonts.semiBold },
  dateText: { fontFamily: fonts.regular, marginTop: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  navBtn: { alignItems: 'center', justifyContent: 'center' },
  navIndex: { fontFamily: fonts.medium, minWidth: 30, textAlign: 'center' },
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
    fetchProgress,
  } = useProgressController();
  const { handleScroll } = useTabBarScroll();
  const r = useResponsive();
  const { colors: tc } = useAppTheme();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProgress();
    setRefreshing(false);
  }, [fetchProgress]);

  // Responsive layout helpers
  const hPad = r.s(20);
  const fullCardWidth = r.width - hPad * 2;
  const cardInnerPad = r.ms(14);
  const cardInnerWidth = fullCardWidth - cardInnerPad * 2;
  const halfCardWidth = (r.width - hPad * 2 - r.s(12)) / 2;
  const halfCardInner = halfCardWidth - cardInnerPad * 2;
  const chartHeight = r.ms(110);
  const donutSize = r.ms(70, 0.4);

  // Memoized chart data
  const pronunciationBars = useMemo(() => {
    if (!currentWeek) return [];
    const p = currentWeek.pronunciation;
    return [
      { label: 'Clarity', value: p.clarity, color: CHART.red },
      { label: 'Sound Acc.', value: p.soundAccuracy, color: CHART.orange },
      { label: 'Smoothness', value: p.smoothness, color: CHART.yellow },
      { label: 'Rhythm', value: p.rhythmAndTone, color: CHART.green },
    ];
  }, [currentWeek]);

  const conversationBars = useMemo(() => {
    if (!currentWeek) return [];
    const c = currentWeek.conversation;
    return [
      { label: 'Fluency', value: c.fluency, color: CHART.green },
      { label: 'Vocabulary', value: c.vocabulary, color: CHART.orange },
      { label: 'Grammar', value: c.grammarUsage, color: CHART.red },
      { label: 'Turn-Taking', value: c.turnTaking, color: CHART.yellow },
    ];
  }, [currentWeek]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: tc.background }]}>
        <ActivityIndicator size="large" color={tc.accent} />
        <Text style={[styles.loadingText, { fontSize: r.ms(14, 0.3), marginTop: r.vs(12), color: tc.textLight }]}>
          Loading your progress…
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: tc.background }]} edges={['top']}>
      {/* Screen Title */}
      <View style={[styles.screenHeader, { paddingHorizontal: r.s(20), paddingTop: r.vs(8), paddingBottom: r.vs(4) }]}>
        <Text style={[styles.screenTitle, { fontSize: r.ms(26, 0.3), color: tc.text }]}>Progress</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: r.vs(120) }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.accent} />}
      >
        {/* ── Streak Banner ── */}
        <DayStreakBanner streak={progressData.dayStreak} r={r} tc={tc} />

        {/* ── Lesson Days ── */}
        <SectionHeader icon="calendar-outline" title="This Week" r={r} tc={tc} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.lessonDayList, { paddingHorizontal: r.s(20), gap: r.s(10) }]}
        >
          {progressData.lessonDays.map((item) => (
            <LessonDayItem
              key={item.id}
              item={item}
              isActive={item.status === 'in_progress'}
              r={r}
              tc={tc}
            />
          ))}
        </ScrollView>

        {/* ── Weekly Progress ── */}
        <SectionHeader
          icon="bar-chart-outline"
          title="Weekly Progress"
          r={r}
          tc={tc}
        />
        <WeekSelector
          weekLabel={weekLabel}
          weekDateLabel={weekDateLabel}
          selectedWeekIndex={selectedWeekIndex}
          totalWeeks={progressData.weeks.length}
          selectWeek={selectWeek}
          r={r}
          tc={tc}
        />

        {/* ── Cards ── */}
        {currentWeek && (
          <View style={[styles.cardsContainer, { paddingHorizontal: hPad }]}>
            {/* Pronunciation – full width */}
            <View style={[styles.card, { borderRadius: r.ms(16), padding: cardInnerPad, backgroundColor: tc.surface, borderColor: tc.cardBorder }, cardShadow as any]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconCircle, { width: r.ms(30), height: r.ms(30), borderRadius: r.ms(8) }]}>
                  <Ionicons name="mic-outline" size={r.ms(16)} color={CHART.red} />
                </View>
                <Text style={[styles.cardTitle, { fontSize: r.ms(14, 0.3), color: tc.text }]}>Pronunciation</Text>
              </View>
              <HBarChart data={pronunciationBars} r={r} tc={tc} />
            </View>

            {/* Conversation – full width */}
            <View style={[styles.card, { borderRadius: r.ms(16), padding: cardInnerPad, marginTop: r.vs(12), backgroundColor: tc.surface, borderColor: tc.cardBorder }, cardShadow as any]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconCircle, { width: r.ms(30), height: r.ms(30), borderRadius: r.ms(8), backgroundColor: '#EBF5FF' }]}>
                  <Ionicons name="chatbubbles-outline" size={r.ms(16)} color={CHART.blue} />
                </View>
                <Text style={[styles.cardTitle, { fontSize: r.ms(14, 0.3), color: tc.text }]}>Conversation</Text>
              </View>
              <HBarChart data={conversationBars} r={r} tc={tc} />
            </View>

            {/* Bottom row: Vocabulary + Overall in 2 cols */}
            <View style={[styles.halfRow, { marginTop: r.vs(12), gap: r.s(12) }]}>
              {/* Vocabulary Growth */}
              <View style={[styles.card, { width: halfCardWidth, borderRadius: r.ms(16), padding: cardInnerPad, backgroundColor: tc.surface, borderColor: tc.cardBorder }, cardShadow as any]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconCircle, { width: r.ms(24), height: r.ms(24), borderRadius: r.ms(6), backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="trending-up" size={r.ms(13)} color={CHART.teal} />
                  </View>
                  <Text style={[styles.cardTitleSm, { fontSize: r.ms(12, 0.3), color: tc.text }]}>Vocab Growth</Text>
                </View>
                <MiniLineChart
                  data={currentWeek.vocabularyGrowth}
                  height={chartHeight}
                  width={halfCardInner}
                  tc={tc}
                />
              </View>

              {/* Overall Performance */}
              <View style={[styles.card, { width: halfCardWidth, borderRadius: r.ms(16), padding: cardInnerPad, backgroundColor: tc.surface, borderColor: tc.cardBorder }, cardShadow as any]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconCircle, { width: r.ms(24), height: r.ms(24), borderRadius: r.ms(6), backgroundColor: '#F5F3FF' }]}>
                    <Ionicons name="pie-chart-outline" size={r.ms(13)} color={CHART.purple} />
                  </View>
                  <Text style={[styles.cardTitleSm, { fontSize: r.ms(12, 0.3), color: tc.text }]}>Performance</Text>
                </View>
                <DonutChart performance={currentWeek.overallPerformance} size={donutSize} r={r} tc={tc} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {},
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fonts.medium,
  },

  // ─── Screen Header ───
  screenHeader: {},
  screenTitle: {
    fontFamily: fonts.bold,
  },

  // ─── Lesson Days ───
  lessonDayList: {
    flexDirection: 'row',
    paddingBottom: 4,
  },

  // ─── Cards ───
  cardsContainer: {},
  halfRow: {
    flexDirection: 'row',
  },
  card: {
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardIconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fonts.semiBold,
  },
  cardTitleSm: {
    fontFamily: fonts.semiBold,
  },
});

export default ProgressScreen;
