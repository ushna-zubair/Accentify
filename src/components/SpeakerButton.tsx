/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Muhammad Ali
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useAppTheme } from '../hooks/useAppTheme';

interface SpeakerButtonProps {
  text: string;
  rate?: number;
  language?: string;
  size?: number;
  style?: ViewStyle;
}

/**
 * Plays the given text using device TTS (expo-speech). Used in the
 * pronunciation screens so the learner can hear the reference word/sentence
 * before recording. Falls back silently if the platform refuses to speak
 * (e.g. unsupported web voice).
 */
export const SpeakerButton: React.FC<SpeakerButtonProps> = ({
  text,
  rate = 0.85,
  language = 'en-US',
  size = 20,
  style,
}) => {
  const { colors: tc } = useAppTheme();
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      Speech.stop().catch(() => undefined);
    };
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        btn: {
          width: size + 16,
          height: size + 16,
          borderRadius: (size + 16) / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tc.accentMuted,
        },
      }),
    [tc, size],
  );

  const onPress = async () => {
    if (!text?.trim()) return;
    try {
      const isSpeaking = await Speech.isSpeakingAsync().catch(() => false);
      if (isSpeaking) {
        await Speech.stop().catch(() => undefined);
        setSpeaking(false);
        return;
      }
      setSpeaking(true);
      Speech.speak(text, {
        language,
        rate,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    } catch {
      setSpeaking(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.btn, style]}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={`Play pronunciation of ${text}`}
    >
      <Ionicons name={speaking ? 'volume-mute' : 'volume-high'} size={size} color={tc.accent} />
    </TouchableOpacity>
  );
};

export default SpeakerButton;
