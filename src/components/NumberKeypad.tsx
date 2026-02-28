import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useAppTheme, type ThemeColors } from '../hooks/useAppTheme';
import { fonts } from '../theme/typography';

/** Standard 1-9, empty/0/backspace layout */
const KEYPAD_KEYS = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  '',  '0', 'backspace',
] as const;

type KeypadSize = 'normal' | 'compact';

interface NumberKeypadProps {
  /** Called with the digit string ('0'–'9') or 'backspace' */
  onKeyPress: (key: string) => void;
  /** Visual density — 'normal' (default) or 'compact' */
  size?: KeypadSize;
  /** Optional extra style for the container */
  style?: object;
}

/**
 * Shared numeric keypad used across PIN, OTP, and authenticator screens.
 */
const NumberKeypad: React.FC<NumberKeypadProps> = ({
  onKeyPress,
  size = 'normal',
  style,
}) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const isCompact = size === 'compact';
  const buttonHeight = isCompact ? 44 : 56;
  const iconSize = isCompact ? 16 : 20;
  const textSize = isCompact ? 18 : 24;

  return (
    <View style={[styles.container, style]}>
      {KEYPAD_KEYS.map((key, idx) => {
        const isEmpty = key === '';
        return (
          <TouchableOpacity
            key={`${key}-${idx}`}
            style={[styles.button, { height: buttonHeight }]}
            onPress={() => onKeyPress(key)}
            activeOpacity={isEmpty ? 1 : 0.5}
            disabled={isEmpty}
            accessibilityRole="button"
            accessibilityLabel={
              key === 'backspace' ? 'Delete' : key === '' ? undefined : `Digit ${key}`
            }
          >
            {key === 'backspace' ? (
              <FontAwesome5 name="backspace" size={iconSize} color={tc.text} />
            ) : (
              <Text style={[styles.text, { fontSize: textSize }]}>{key}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  button: {
    width: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  text: {
    fontFamily: fonts.medium,
    color: tc.text,
  },
});

export default NumberKeypad;
