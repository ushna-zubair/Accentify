import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle as SvgCircle, G } from 'react-native-svg';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  tooltipLabel?: string;
  tooltipSub?: string;
  tooltipValue?: string;
}

const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  size = 180,
  strokeWidth = 28,
  tooltipLabel,
  tooltipSub,
  tooltipValue,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let accumulated = 0;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background track */}
          <SvgCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
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

      {/* Center tooltip */}
      {tooltipLabel && (
        <View style={[styles.tooltip, { top: size * 0.18, right: -20 }]}>
          <Text style={styles.tooltipTitle}>{tooltipLabel}</Text>
          {tooltipSub && <Text style={styles.tooltipSub}>{tooltipSub}</Text>}
          {tooltipValue && <Text style={styles.tooltipValue}>{tooltipValue}</Text>}
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendRow}>
        {segments.map((seg) => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <View key={seg.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
              <View>
                <Text style={styles.legendLabel}>{seg.label}</Text>
                <Text style={styles.legendPct}>{pct}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 130,
  },
  tooltipTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  tooltipSub: {
    color: '#D1D5DB',
    fontSize: 11,
    marginTop: 2,
  },
  tooltipValue: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  legendPct: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A2E',
  },
});

export default DonutChart;
