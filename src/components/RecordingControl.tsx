import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { fonts } from '../theme/typography';

export type RecordingPhase = 'idle' | 'recording' | 'processing' | 'result';

interface RecordingControlProps {
  phase: RecordingPhase;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
}

const formatMmSs = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Single combined mic-with-waveform control used across all pronunciation
 * exercises. Replaces the previously disconnected waveform-bar + mic-button
 * pair. Maintains its own duration timer internally so the parent screen
 * isn't re-rendered every 100ms while recording.
 */
export const RecordingControl: React.FC<RecordingControlProps> = ({
  phase,
  disabled,
  onStart,
  onStop,
}) => {
  const { colors: tc } = useAppTheme();
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const [elapsed, setElapsed] = useState(0);

  const isRecording = phase === 'recording';
  const isProcessing = phase === 'processing';
  const isResult = phase === 'result';
  const isIdle = phase === 'idle';

  useEffect(() => {
    if (!isRecording) {
      ringScale.setValue(1);
      ringOpacity.setValue(0.6);
      return;
    }
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringScale, {
            toValue: 1.4,
            duration: 1100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 1100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording, ringScale, ringOpacity]);

  useEffect(() => {
    if (!isRecording) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [isRecording]);

  const label = useMemo(() => {
    if (isProcessing) return 'Analyzing…';
    if (isResult) return 'Tap to try again';
    if (isRecording) return `Listening — tap to stop · ${formatMmSs(elapsed)}`;
    return 'Tap the mic to speak';
  }, [isProcessing, isResult, isRecording, elapsed]);

  const onPress = () => {
    if (disabled || isProcessing) return;
    if (isRecording) {
      onStop();
    } else {
      onStart();
    }
  };

  const buttonBg = isRecording ? tc.error : tc.accent;
  const ringColor = isRecording ? tc.error : tc.accent;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 12,
        },
        label: {
          fontFamily: fonts.medium,
          fontSize: 14,
          color: tc.textLight,
          marginBottom: 14,
          textAlign: 'center',
        },
        labelEmphasis: {
          color: isRecording ? tc.error : tc.text,
        },
        micWrap: {
          width: 110,
          height: 110,
          alignItems: 'center',
          justifyContent: 'center',
        },
        ring: {
          position: 'absolute',
          width: 110,
          height: 110,
          borderRadius: 55,
          borderWidth: 2,
          borderColor: ringColor,
        },
        button: {
          width: 80,
          height: 80,
          borderRadius: 40,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: buttonBg,
          shadowColor: buttonBg,
          shadowOpacity: 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        },
        buttonDisabled: {
          opacity: 0.5,
        },
      }),
    [tc, isRecording, buttonBg, ringColor],
  );

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <Text
        style={[
          styles.label,
          (isRecording || isProcessing) && styles.labelEmphasis,
        ]}
      >
        {label}
      </Text>

      <View style={styles.micWrap}>
        {isRecording && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              },
            ]}
          />
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          disabled={disabled || isProcessing}
          accessibilityRole="button"
          accessibilityLabel={
            isRecording ? 'Stop recording' : 'Start recording'
          }
          style={[
            styles.button,
            (disabled || isProcessing) && styles.buttonDisabled,
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={tc.white} />
          ) : (
            <Ionicons
              name={isRecording ? 'stop' : isResult ? 'refresh' : 'mic'}
              size={34}
              color={tc.white}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RecordingControl;
