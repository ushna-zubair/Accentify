import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle as SvgCircle, G, Text as SvgText } from 'react-native-svg';

interface BubbleData {
  label: string;
  subLabel: string;
  value: number;
  color: string;
  size: number;
}

interface PerformanceBubblesProps {
  data: BubbleData[];
}

const PerformanceBubbles: React.FC<PerformanceBubblesProps> = ({ data }) => {
  const svgWidth = 280;
  const svgHeight = 220;

  // Positions for overlapping bubble layout
  const positions = [
    { cx: 100, cy: 80 },   // top center
    { cx: 170, cy: 120 },  // right
    { cx: 80, cy: 160 },   // bottom left
  ];

  return (
    <View style={styles.container}>
      <Svg width={svgWidth} height={svgHeight}>
        {data.map((item, i) => {
          const pos = positions[i] || { cx: 140, cy: 110 };
          const r = item.size / 2;
          return (
            <G key={item.label}>
              <SvgCircle
                cx={pos.cx}
                cy={pos.cy}
                r={r}
                fill={item.color}
                opacity={0.9}
              />
              <SvgText
                x={pos.cx}
                y={pos.cy - 10}
                textAnchor="middle"
                fill="#FFFFFF"
                fontWeight="700"
                fontSize={18}
              >
                {item.value}%
              </SvgText>
              <SvgText
                x={pos.cx}
                y={pos.cy + 8}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize={9}
                fontWeight="500"
              >
                {item.label}
              </SvgText>
              <SvgText
                x={pos.cx}
                y={pos.cy + 20}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize={9}
                fontWeight="500"
              >
                {item.subLabel}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PerformanceBubbles;
