import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { fonts } from '../../../theme/typography';
import { useAppTheme, type ThemeColors } from '../../../hooks/useAppTheme';

interface BarChartProps {
  data: { label: string; thisWeek: number; lastWeek: number }[];
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, height = 180 }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const CHART_COLORS = {
    thisWeek: tc.accent,
    lastWeek: tc.accentMuted,
  };
  const maxVal = Math.max(...data.flatMap((d) => [d.thisWeek, d.lastWeek]), 1);
  const barWidth = 14;
  const gap = 6;
  const groupWidth = barWidth * 2 + gap;
  const groupGap = 24;
  const chartWidth = data.length * (groupWidth + groupGap) - groupGap;

  return (
    <View>
      <Svg width={chartWidth + 20} height={height + 30}>
        {data.map((item, i) => {
          const x = i * (groupWidth + groupGap) + 10;
          const h1 = (item.thisWeek / maxVal) * height;
          const h2 = (item.lastWeek / maxVal) * height;
          return (
            <React.Fragment key={item.label}>
              <Rect
                x={x}
                y={height - h1}
                width={barWidth}
                height={h1}
                rx={4}
                fill={CHART_COLORS.thisWeek}
              />
              <Rect
                x={x + barWidth + gap}
                y={height - h2}
                width={barWidth}
                height={h2}
                rx={4}
                fill={CHART_COLORS.lastWeek}
              />
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={styles.labelsRow}>
        {data.map((item, i) => (
          <Text
            key={item.label}
            style={[
              styles.label,
              {
                width: groupWidth + groupGap,
                left: i * (groupWidth + groupGap),
              },
            ]}
          >
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  labelsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: tc.textMuted,
    textAlign: 'center',
    position: 'absolute',
  },
});

export default BarChart;
