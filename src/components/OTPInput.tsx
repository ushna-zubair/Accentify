import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import colors from '../theme/colors';

interface OTPInputProps {
  length?: number;
  value: string[];
  onChange: (otp: string[]) => void;
}

const OTPInput: React.FC<OTPInputProps> = ({ length = 6, value, onChange }) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const inputs = useRef<Array<TextInput | null>>([]);

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...value];
    newOtp[index] = cleaned;
    onChange(newOtp);

    if (cleaned && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!value[index] && index > 0) {
        const newOtp = [...value];
        newOtp[index - 1] = '';
        onChange(newOtp);
        inputs.current[index - 1]?.focus();
      }
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }, (_, i) => (
        <TextInput
          key={i}
          ref={(ref) => {
            inputs.current[i] = ref;
          }}
          style={[
            styles.box,
            focusedIndex === i && styles.focusedBox,
            value[i] ? styles.filledBox : null,
          ]}
          value={value[i] || ''}
          onChangeText={(text) => handleChange(text, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          onFocus={() => setFocusedIndex(i)}
          onBlur={() => setFocusedIndex(-1)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          textAlign="center"
          caretHidden
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  box: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  focusedBox: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  filledBox: {
    borderColor: colors.primaryLight,
  },
});

export default OTPInput;
