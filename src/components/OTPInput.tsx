import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';

interface OTPInputProps {
  value: string[];
}

const OTPInput: React.FC<OTPInputProps> = ({ value }) => {
  return (
    <View style={styles.container}>
      {value.map((digit, index) => (
        <View key={index} style={[styles.box, digit && styles.boxFilled]}>
          <Text style={styles.boxText}>{digit}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
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
    borderColor: colors.inputBorder,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: colors.primary,
  },
  boxText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
});

export default OTPInput;
