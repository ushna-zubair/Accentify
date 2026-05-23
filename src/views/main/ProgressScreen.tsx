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
  Polyline,
  Line,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
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
} from '../../models';
import type { LevelUpProgress } from '../../services/levelService';

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

// ─── Level Badge ───
const LevelBadge: React.FC<{
  progress: LevelUpProgress | null;
  r: ResponsiveValues;
  tc: ThemeColors;
}> = ({ progress, r, tc }) => {
  const current = progress?.currentLevel ?? 'A2';
  const next = progress?.nextLevel ?? null;
  const promoted = progress?.promoted ?? false;
  return (
    <View
      style={[
        levelStyles.wrapper,
        {
          marginHorizontal: r.s(20),
          marginTop: r.vs(12),
          borderRadius: r.ms(16),
          padding: r.ms(14),
          backgroundColor: tc.surface,
          borderColor: tc.cardBorder,
        },
        cardShadow as any,
      ]}
    >
      <View
        style={[
          levelStyles.pill,
          { backgroundColor: tc.accentMuted, paddingHorizontal: r.s(14), paddingVertical: r.vs(8), borderRadius: r.ms(12) },
        ]}
      >
        <Text style={[levelStyles.pillText, { fontSize: r.ms(22, 0.3), color: tc.accent }]}>
          {current}
        </Text>
      </View>
      <View style={levelStyles.right}>
        <Text style={[levelStyles.heading, { fontSize: r.ms(13, 0.3), color: tc.textLight }]}>
          {promoted ? 'Just promoted to' : 'Your level'}
        </Text>
        <Text style={[levelStyles.subText, { fontSize: r.ms(13, 0.3), color: tc.text }]}>
          {next ? `Next: ${next}` : 'Top level reached'}
        </Text>
      </View>
    </View>
  );
};

const levelStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
  },
  pill: { alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: fonts.bold },
  right: { flex: 1 },
  heading: { fontFamily: fonts.medium },
  subText: { fontFamily: fonts.semiBold, marginTop: 2 },
});

// ─── Next-Level Progress (per-criterion bars) ───
interface CriterionRow {
  label: string;
  current: number;
  required: number;
  unit?: string;
  /** When true the bar fills as required→current ratio of % (e.g. avg score). */
  isPercent?: boolean;
}

const NextLevelProgress: React.FC<{
  progress: LevelUpProgress;
  r: ResponsiveValues;
  tc: ThemeColors;
}> = ({ progress, r, tc }) => {
  const rows: CriterionRow[] = [
    {
      label: 'Stretch vocab mastered',
      current: progress.stretchVocabMastered,
      required: progress.stretchVocabRequired,
    },
    {
      label: 'Word pronunciation avg',
      current: progress.wordPronAvg,
      required: progress.wordPronRequired,
      unit: '%',
      isPercent: true,
    },
    {
      label: 'Sentence pronunciation avg',
      current: progress.sentencePronAvg,
      required: progress.sentencePronRequired,
      unit: '%',
      isPercent: true,
    },
    {
      label: 'Active days (last 30)',
      current: progress.activeDays,
      required: progress.activeDaysRequired,
    },
  ];

  return (
    <View style={nlpStyles.container}>
      {rows.map((row) => {
        const pct =
          row.required <= 0 ? 0 : Math.min(100, Math.round((row.current / row.required) * 100));
        const done = row.current >= row.required;
        const color = done ? CHART.green : CHART.blue;
        return (
          <View key={row.label} style={nlpStyles.row}>
            <View style={nlpStyles.labelRow}>
              <Text
                style={[nlpStyles.label, { fontSize: r.ms(11, 0.3), color: tc.textLight }]}
                numberOfLines={1}
              >
                {row.label}
              </Text>
              <Text style={[nlpStyles.value, { fontSize: r.ms(11, 0.3), color: tc.text }]}>
                {row.current}
                {row.unit ?? ''} / {row.required}
                {row.unit ?? ''}
              </Text>
            </View>
            <View
              style={[
                nlpStyles.track,
                { height: r.ms(8), borderRadius: r.ms(4), backgroundColor: tc.surfaceAlt },
              ]}
            >
              <View
                style={[
                  nlpStyles.fill,
                  {
                    backgroundColor: color,
                    width: `${pct}%` as any,
                    height: r.ms(8),
                    borderRadius: r.ms(4),
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
      {progress.daysSinceLastChange !== null && progress.daysSinceLastChange < progress.cooldownRequired && (
        <Text style={[nlpStyles.cooldown, { color: tc.textMuted, fontSize: r.ms(10, 0.3) }]}>
          Cooldown: {progress.daysSinceLastChange}/{progress.cooldownRequired} days since last change
        </Text>
      )}
      {progress.eligible && progress.promoted && (
        <Text style={[nlpStyles.cooldown, { color: tc.success, fontSize: r.ms(10, 0.3) }]}>
          You just leveled up. Keep going!
        </Text>
      )}
    </View>
  );
};

const nlpStyles = StyleSheet.create({
  container: { gap: 10 },
  row: { gap: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontFamily: fonts.medium, flex: 1 },
  value: { fontFamily: fonts.semiBold },
  track: { width: '100%' },
  fill: {},
  cooldown: { fontFamily: fonts.regular, marginTop: 4 },
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
    levelProgress,
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
  const chartHeight = r.ms(110);
  const lineChartWidth = cardInnerWidth;

  // Memoized chart data
  const pronunciationBars = useMemo(() => {
    if (!currentWeek) return [];
    const p = currentWeek.pronunciation;
    // Only show metrics the pronunciation API actually returns.
    // Smoothness/Rhythm were synthetic — removed until the model exposes them.
    return [
      { label: 'Overall', value: p.rhythmAndTone, color: CHART.green },
      { label: 'Word Accuracy', value: p.soundAccuracy, color: CHART.orange },
      { label: 'Clarity', value: p.clarity, color: CHART.red },
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

        {/* ── Level Badge (drives the new level-up flow) ── */}
        <LevelBadge progress={levelProgress} r={r} tc={tc} />

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
            {/* Progress to next level — driven by levelService snapshot */}
            {levelProgress && (
              <View style={[styles.card, { borderRadius: r.ms(16), padding: cardInnerPad, backgroundColor: tc.surface, borderColor: tc.cardBorder }, cardShadow as any]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconCircle, { width: r.ms(30), height: r.ms(30), borderRadius: r.ms(8), backgroundColor: tc.accentMuted }]}>
                    <Ionicons name="trophy-outline" size={r.ms(16)} color={tc.accent} />
                  </View>
                  <Text style={[styles.cardTitle, { fontSize: r.ms(14, 0.3), color: tc.text }]}>
                    {levelProgress.nextLevel
                      ? `Progress to ${levelProgress.nextLevel}`
                      : 'You are at the top level'}
                  </Text>
                </View>
                {levelProgress.nextLevel ? (
                  <NextLevelProgress progress={levelProgress} r={r} tc={tc} />
                ) : (
                  <Text style={{ color: tc.textLight, fontSize: r.ms(12, 0.3), fontFamily: fonts.regular }}>
                    Keep practicing to stay sharp — there's no higher CEFR band.
                  </Text>
                )}
              </View>
            )}

            {/* Pronunciation – full width */}
            <View style={[styles.card, { borderRadius: r.ms(16), padding: cardInnerPad, marginTop: r.vs(12), backgroundColor: tc.surface, borderColor: tc.cardBorder }, cardShadow as any]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconCircle, { width: r.ms(30), height: r.ms(30), borderRadius: r.ms(8) }]}>
                  <Ionicons name="mic-outline" size={r.ms(16)} color={CHART.red} />
                </View>
                <Text style={[styles.cardTitle, { fontSize: r.ms(14, 0.3), color: tc.text }]}>Pronunciation</Text>
              </View>
              <HBarChart data={pronunciationBars} r={r} tc={tc} />
            </View>

            {/* Vocabulary Growth – full width */}
            <View style={[styles.card, { borderRadius: r.ms(16), padding: cardInnerPad, marginTop: r.vs(12), backgroundColor: tc.surface, borderColor: tc.cardBorder }, cardShadow as any]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconCircle, { width: r.ms(30), height: r.ms(30), borderRadius: r.ms(8), backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="trending-up" size={r.ms(16)} color={CHART.teal} />
                </View>
                <Text style={[styles.cardTitle, { fontSize: r.ms(14, 0.3), color: tc.text }]}>Vocab Growth</Text>
              </View>
              <MiniLineChart
                data={currentWeek.vocabularyGrowth}
                height={chartHeight}
                width={lineChartWidth}
                tc={tc}
              />
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
