import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme, type ThemeColors } from '../hooks/useAppTheme';
import { fonts } from '../theme/typography';

interface OTPInputProps {
  value: string[];
}

const OTPInput: React.FC<OTPInputProps> = ({ value }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel={`OTP code: ${value.join('')}`}>
      {value.map((digit, index) => (
        <View key={index} style={[styles.box, digit && styles.boxFilled]} accessibilityLabel={`Digit ${index + 1}: ${digit || 'empty'}`}>
          <Text style={styles.boxText}>{digit}</Text>
        </View>
      ))}
    </View>
  );
};

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  box: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: tc.inputBorder,
    backgroundColor: tc.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: tc.accent,
  },
  boxText: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: tc.text,
  },
});

export default OTPInput;
