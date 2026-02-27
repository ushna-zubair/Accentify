import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle as SvgCircle, Line } from 'react-native-svg';

interface LineChartProps {
  thisWeek: number[];
  lastWeek: number[];
  labels: string[];
  height?: number;
  width?: number;
}

const LINE_COLORS = {
  thisWeek: '#6B2FD9',
  lastWeek: '#D1D5DB',
};

const LineChart: React.FC<LineChartProps> = ({
  thisWeek,
  lastWeek,
  labels,
  height = 120,
  width = 240,
}) => {
  const maxVal = Math.max(...thisWeek, ...lastWeek, 1);
  const padding = 20;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const toPoints = (data: number[]) =>
    data
      .map((v, i) => {
        const x = padding + (i / (data.length - 1)) * usableWidth;
        const y = padding + usableHeight - (v / maxVal) * usableHeight;
        return `${x},${y}`;
      })
      .join(' ');

  const toCoords = (data: number[]) =>
    data.map((v, i) => ({
      x: padding + (i / (data.length - 1)) * usableWidth,
      y: padding + usableHeight - (v / maxVal) * usableHeight,
    }));

  const thisWeekCoords = toCoords(thisWeek);

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
              stroke="#F3F4F6"
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
          <SvgCircle
            key={i}
            cx={coord.x}
            cy={coord.y}
            r={3.5}
            fill={LINE_COLORS.thisWeek}
          />
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

const styles = StyleSheet.create({
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  label: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});

export default LineChart;
