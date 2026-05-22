/**
 * TutorScreen — AI voice-chat with the Accentify tutor.
 *
 * Replaces the previous lesson-catalog UI. Users tap the big mic, speak a
 * sentence, and the tutor replies with both text and synthesized speech
 * (auto-played). Calls /conversation/audio via `useTutorChatController`.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import {
  useTutorChatController,
  type TutorMessage,
  type TutorPhase,
} from '../../controllers/useTutorChatController';

const { width: SCREEN_W } = Dimensions.get('window');

// ═══════════════════════════════════════════════
//  TUTOR MASCOT (matches Wavy Chat aesthetic)
// ═══════════════════════════════════════════════

const TutorAvatar: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 44 44">
    <Circle cx={22} cy={26} r={16} fill="#8B6FAE" />
    <Circle cx={22} cy={22} r={14} fill="#A78BC4" />
    <Circle cx={16} cy={19} r={2.5} fill="#FFFFFF" />
    <Circle cx={28} cy={19} r={2.5} fill="#FFFFFF" />
    <Path
      d="M18 26 Q22 30 26 26"
      stroke="#FFFFFF"
      strokeWidth={1.5}
      fill="none"
      strokeLinecap="round"
    />
  </Svg>
);

// ═══════════════════════════════════════════════
//  CHAT BUBBLE
// ═══════════════════════════════════════════════

interface BubbleProps {
  message: TutorMessage;
  onReplay: (id: string) => void;
  speakingMessageId: string | null;
}

const ChatBubble: React.FC<BubbleProps> = ({ message, onReplay, speakingMessageId }) => {
  const isTutor = message.role === 'tutor';
  const isSpeaking = speakingMessageId === message.id;
  return (
    <View>
      <Text
        style={[
          styles.roleLabel,
          isTutor ? styles.roleLabelLeft : styles.roleLabelRight,
        ]}
      >
        {isTutor ? 'Tutor' : 'You'}
      </Text>
      <View
        style={[
          styles.bubbleRow,
          isTutor ? styles.bubbleRowLeft : styles.bubbleRowRight,
        ]}
      >
        {isTutor && (
          <View style={{ marginRight: 8 }}>
            <TutorAvatar size={28} />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isTutor ? styles.bubbleTutor : styles.bubbleUser,
          ]}
        >
          <Text style={styles.bubbleText}>{message.text}</Text>
          {isTutor && message.audioUri && (
            <TouchableOpacity
              style={styles.replayBtn}
              onPress={() => onReplay(message.id)}
              activeOpacity={0.6}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons
                name={isSpeaking ? 'volume-high' : 'play-circle'}
                size={18}
                color="rgba(255,255,255,0.95)"
              />
              <Text style={styles.replayLabel}>
                {isSpeaking ? 'Playing…' : 'Replay'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════
//  THINKING DOTS (animated; shown while waiting on the model)
// ═══════════════════════════════════════════════

const ThinkingDots: React.FC = () => {
  const dots = useRef(
    Array.from({ length: 3 }, () => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(d, { toValue: 1, duration: 360, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 360, useNativeDriver: true }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.thinkingRow}>
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={[styles.thinkingDot, { opacity: d, transform: [{ scale: d }] }]}
        />
      ))}
    </View>
  );
};

// ═══════════════════════════════════════════════
//  WAVEFORM (during recording)
// ═══════════════════════════════════════════════

const Waveform: React.FC<{ active: boolean }> = ({ active }) => {
  const bars = useRef(
    Array.from({ length: 18 }, () => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    if (!active) {
      bars.forEach((b) => b.setValue(0.3));
      return;
    }
    const anims = bars.map((b) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(b, {
            toValue: 0.5 + Math.random() * 0.5,
            duration: 220 + Math.random() * 240,
            useNativeDriver: false,
          }),
          Animated.timing(b, {
            toValue: 0.2 + Math.random() * 0.2,
            duration: 220 + Math.random() * 240,
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [active]);

  return (
    <View style={styles.waveformRow}>
      {bars.map((b, i) => {
        const height = b.interpolate({
          inputRange: [0, 1],
          outputRange: [4, 26],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.waveformBar,
              { height, backgroundColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.35)' },
            ]}
          />
        );
      })}
    </View>
  );
};

// ═══════════════════════════════════════════════
//  STATUS HINT (above mic)
// ═══════════════════════════════════════════════

function statusLabel(phase: TutorPhase, recordingMs: number): string {
  switch (phase) {
    case 'recording': {
      const s = Math.floor(recordingMs / 1000);
      const ms = Math.floor((recordingMs % 1000) / 100);
      return `Recording • ${s}.${ms}s`;
    }
    case 'processing':
      return 'Thinking…';
    case 'speaking':
      return 'Tutor is speaking…';
    case 'error':
      return 'Something went wrong';
    case 'idle':
    default:
      return 'Tap the mic to talk';
  }
}

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

// Bottom tab bar geometry from AppNavigator's CustomTabBar:
//   wrapper height = 56 (bar) + max(insets.bottom, 6) + 12 (gap)
const TAB_BAR_BASE = 56 + 12;

const TutorScreen: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const dyn = useMemo(() => dynStyles(tc), [tc]);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  // Extra space below the mic so the tab bar (positioned absolute over the
  // screen) doesn't cover it.
  const tabBarClearance = TAB_BAR_BASE + Math.max(insets.bottom, 6) + 8;

  const {
    messages,
    phase,
    error,
    recordingDuration,
    playingMessageId,
    toggleMic,
    replayMessage,
    dismissError,
    clearChat,
  } = useTutorChatController();

  const handleClearChat = useCallback(() => {
    Alert.alert(
      'Clear chat?',
      'This will remove your conversation with the tutor on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearChat().catch(() => {});
          },
        },
      ],
    );
  }, [clearChat]);

  // Auto-scroll on new messages / phase changes.
  useEffect(() => {
    const t = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      150,
    );
    return () => clearTimeout(t);
  }, [messages.length, phase]);

  // Pulse the mic while recording.
  const micScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (phase === 'recording') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(micScale, {
            toValue: 1.12,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(micScale, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    } else {
      micScale.setValue(1);
    }
    return () => {
      loop?.stop();
    };
  }, [phase]);

  // Bubble showing "Playing…" is the one whose audio is actually playing,
  // not necessarily the most-recent tutor reply.
  const speakingMessageId = phase === 'speaking' ? playingMessageId : null;

  const micIcon =
    phase === 'recording' ? 'stop' : phase === 'speaking' ? 'mic' : 'mic';
  const micDisabled = phase === 'processing';

  return (
    <SafeAreaView style={dyn.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={dyn.header}>
        <View style={dyn.headerCenter}>
          <TutorAvatar size={32} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={dyn.headerTitle}>Tutor</Text>
            <Text style={dyn.headerSub}>AI voice tutor</Text>
          </View>
          <TouchableOpacity
            style={dyn.clearBtn}
            onPress={handleClearChat}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Clear chat"
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesArea}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            onReplay={replayMessage}
            speakingMessageId={speakingMessageId}
          />
        ))}

        {phase === 'processing' && (
          <View style={styles.typingRow}>
            <Text style={styles.typingLabel}>Tutor</Text>
            <View style={styles.typingBubble}>
              <ThinkingDots />
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Error toast ── */}
      {error && (
        <TouchableOpacity
          style={dyn.errorBar}
          onPress={dismissError}
          activeOpacity={0.85}
        >
          <Ionicons name="alert-circle" size={16} color="#FFFFFF" />
          <Text style={dyn.errorText} numberOfLines={3}>
            {error}
          </Text>
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      )}

      {/* ── Bottom control bar ── */}
      <View style={[dyn.controlBar, { paddingBottom: tabBarClearance }]}>
        <Text style={dyn.statusText}>{statusLabel(phase, recordingDuration)}</Text>
        <Waveform active={phase === 'recording'} />

        <Animated.View style={{ transform: [{ scale: micScale }] }}>
          <TouchableOpacity
            onPress={toggleMic}
            disabled={micDisabled}
            activeOpacity={0.75}
            style={[
              dyn.micBtn,
              {
                backgroundColor:
                  phase === 'recording'
                    ? '#E94F54'
                    : micDisabled
                      ? 'rgba(255,255,255,0.2)'
                      : '#FFFFFF',
                opacity: micDisabled ? 0.6 : 1,
              },
            ]}
          >
            <Ionicons
              name={micIcon as any}
              size={30}
              color={phase === 'recording' ? '#FFFFFF' : '#5B3E9E'}
            />
          </TouchableOpacity>
        </Animated.View>

        <Text style={dyn.hintText}>
          {phase === 'idle'
            ? 'Speak naturally — full sentences work best.'
            : phase === 'recording'
              ? 'Tap again to stop and send.'
              : phase === 'speaking'
                ? 'Tap mic to interrupt and reply.'
                : ' '}
        </Text>
      </View>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════
//  STATIC STYLES
// ═══════════════════════════════════════════════

const styles = StyleSheet.create({
  messagesArea: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },

  roleLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 3,
    marginTop: 10,
  },
  roleLabelLeft: {
    textAlign: 'left',
    marginLeft: 36,
  },
  roleLabelRight: {
    textAlign: 'right',
    marginRight: 4,
  },

  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-end',
  },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },

  bubble: {
    maxWidth: SCREEN_W * 0.72,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleTutor: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#3F66FB',
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },

  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 2,
  },
  replayLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.95)',
    marginLeft: 4,
    letterSpacing: 0.3,
  },

  typingRow: { marginTop: 8 },
  typingLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 3,
    marginLeft: 36,
  },
  typingBubble: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginLeft: 34,
  },
  typingDots: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 3,
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  thinkingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },

  waveformRow: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 3,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
});

// ═══════════════════════════════════════════════
//  DYNAMIC STYLES (theme-aware)
// ═══════════════════════════════════════════════

const dynStyles = (_tc: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#5B3E9E',
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'web' ? 16 : 8,
      paddingBottom: 14,
      backgroundColor: '#6B4EAB',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.12)',
    },
    headerCenter: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: {
      fontFamily: fonts.bold,
      fontSize: 17,
      color: '#FFFFFF',
    },
    headerSub: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: 'rgba(255,255,255,0.6)',
    },
    clearBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.10)',
    },
    errorBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E94F54',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
    },
    errorText: {
      flex: 1,
      fontFamily: fonts.medium,
      fontSize: 13,
      color: '#FFFFFF',
    },
    controlBar: {
      backgroundColor: '#6B4EAB',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.12)',
      paddingHorizontal: 16,
      paddingTop: 14,
      // paddingBottom set inline (tabBarClearance) so the mic clears the tab bar.
      alignItems: 'center',
    },
    statusText: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: 'rgba(255,255,255,0.75)',
      marginBottom: 8,
    },
    micBtn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 6,
    },
    hintText: {
      marginTop: 10,
      fontFamily: fonts.regular,
      fontSize: 11,
      color: 'rgba(255,255,255,0.65)',
      minHeight: 14,
    },
  });

export default TutorScreen;
