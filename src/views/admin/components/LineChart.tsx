/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Manan Anghan
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle as SvgCircle, Line } from 'react-native-svg';
import { fonts } from '../../../theme/typography';
import { useAppTheme, type ThemeColors } from '../../../hooks/useAppTheme';

interface LineChartProps {
  thisWeek: number[];
  lastWeek: number[];
  labels: string[];
  height?: number;
  width?: number;
}

const LineChart: React.FC<LineChartProps> = ({
  thisWeek,
  lastWeek,
  labels,
  height = 120,
  width = 240,
}) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const LINE_COLORS = {
    thisWeek: tc.accent,
    lastWeek: tc.disabled,
  };
  const hasData = (thisWeek?.length ?? 0) > 0 || (lastWeek?.length ?? 0) > 0;
  const maxVal = Math.max(...(thisWeek ?? []), ...(lastWeek ?? []), 1);
  const padding = 20;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  // Divisor guard — `length - 1` is zero for single-point series and -1 for empty.
  const xStep = (data: number[]) => (data.length > 1 ? usableWidth / (data.length - 1) : 0);

  const toPoints = (data: number[]) => {
    if (!data?.length) return '';
    const step = xStep(data);
    return data
      .map((v, i) => {
        const x = padding + i * step;
        const y = padding + usableHeight - (v / maxVal) * usableHeight;
        return `${x},${y}`;
      })
      .join(' ');
  };

  const toCoords = (data: number[]) => {
    if (!data?.length) return [];
    const step = xStep(data);
    return data.map((v, i) => ({
      x: padding + i * step,
      y: padding + usableHeight - (v / maxVal) * usableHeight,
    }));
  };

  const thisWeekCoords = toCoords(thisWeek);

  if (!hasData) {
    return (
      <View style={[styles.emptyWrap, { width, height }]}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padding + usableHeight * (1 - pct);
          return (
            <Line
              key={pct}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke={tc.surfaceAlt}
              strokeWidth={1}
            />
          );
        })}

        {/* Last week line (dashed) */}
        <Polyline
          points={toPoints(lastWeek)}
          fill="none"
          stroke={LINE_COLORS.lastWeek}
          strokeWidth={2}
          strokeDasharray="5,5"
        />

        {/* This week line */}
        <Polyline
          points={toPoints(thisWeek)}
          fill="none"
          stroke={LINE_COLORS.thisWeek}
          strokeWidth={2.5}
        />

        {/* Dots for this week */}
        {thisWeekCoords.map((coord, i) => (
          <SvgCircle key={i} cx={coord.x} cy={coord.y} r={3.5} fill={LINE_COLORS.thisWeek} />
        ))}
      </Svg>

      {/* X-axis labels */}
      <View style={[styles.labelsRow, { width, paddingHorizontal: padding }]}>
        {labels.map((label) => (
          <Text key={label} style={styles.label}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const createStyles = (tc: ThemeColors) =>
  StyleSheet.create({
    labelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    label: {
      fontFamily: fonts.regular,
      fontSize: 10,
      color: tc.textMuted,
    },
    emptyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: tc.textMuted,
    },
  });

export default LineChart;
