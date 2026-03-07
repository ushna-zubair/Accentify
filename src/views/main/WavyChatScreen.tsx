/**
 * WavyChatScreen
 *
 * A full-screen AI chat experience with Wavy — accessible from the Home tab.
 * Uses the same useWavyChatController that powers the in-exercise overlay.
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useTabBarVisibility } from '../../context/TabBarVisibilityContext';
import {
  useWavyChatController,
  type WavyChatMessage,
} from '../../controllers/useWavyChatController';

const { width: SCREEN_W } = Dimensions.get('window');

// ═══════════════════════════════════════════════
//  CHAT BUBBLE
// ═══════════════════════════════════════════════

const ChatBubble: React.FC<{ message: WavyChatMessage; tc: ThemeColors }> = ({ message, tc }) => {
  const isWavy = message.role === 'wavy';
  return (
    <View>
      <Text
        style={[
          styles.roleLabel,
          isWavy ? styles.roleLabelLeft : styles.roleLabelRight,
        ]}
      >
        {isWavy ? 'Wavy' : 'You'}
      </Text>
      <View
        style={[
          styles.bubbleRow,
          isWavy ? styles.bubbleRowLeft : styles.bubbleRowRight,
        ]}
      >
        {isWavy && (
          <Svg width={28} height={28} viewBox="0 0 44 44" style={{ marginRight: 8 }}>
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
        )}
        <View
          style={[
            styles.bubble,
            isWavy ? styles.bubbleWavy : styles.bubbleUser,
          ]}
        >
          <Text style={styles.bubbleText}>{message.text}</Text>
        </View>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const WavyChatScreen: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const chatScrollRef = useRef<ScrollView>(null);

  // Hide bottom tab bar
  const { translateY } = useTabBarVisibility();
  useFocusEffect(
    useCallback(() => {
      Animated.timing(translateY, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return () => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      };
    }, [translateY]),
  );

  const {
    messages,
    inputText,
    setInputText,
    isTyping,
    sendMessage,
  } = useWavyChatController('general', '');

  // Auto-scroll on new messages
  useEffect(() => {
    const t = setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 200);
    return () => clearTimeout(t);
  }, [messages.length, isTyping]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage();
    Keyboard.dismiss();
  };

  return (
    <View style={[dynStyles(tc).container]}>
      {/* ── Header ── */}
      <View
        style={[
          dynStyles(tc).header,
          { paddingTop: Platform.OS === 'web' ? 16 : insets.top + 8 },
        ]}
      >
        <TouchableOpacity
          style={dynStyles(tc).backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={dynStyles(tc).headerCenter}>
          <Svg width={32} height={32} viewBox="0 0 44 44">
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
          <View style={{ marginLeft: 10 }}>
            <Text style={dynStyles(tc).headerTitle}>Wavy</Text>
            <Text style={dynStyles(tc).headerSub}>AI Language Assistant</Text>
          </View>
        </View>

        {/* spacer for symmetry */}
        <View style={{ width: 40 }} />
      </View>

      {/* ── Messages ── */}
      <ScrollView
        ref={chatScrollRef}
        style={styles.messagesArea}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} tc={tc} />
        ))}
        {isTyping && (
          <View style={styles.typingRow}>
            <Text style={styles.typingLabel}>Wavy</Text>
            <View style={styles.typingBubble}>
              <Text style={styles.typingDots}>...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Input ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View
          style={[
            dynStyles(tc).inputRow,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <TextInput
            style={dynStyles(tc).textInput}
            placeholder="Ask Wavy anything..."
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            selectionColor="rgba(255,255,255,0.6)"
            multiline
          />
          <TouchableOpacity
            onPress={handleSend}
            activeOpacity={0.6}
            style={dynStyles(tc).sendBtn}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

// ═══════════════════════════════════════════════
//  STATIC STYLES (message bubbles, shared)
// ═══════════════════════════════════════════════

const styles = StyleSheet.create({
  // Messages
  messagesArea: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },

  // Role label
  roleLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
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

  // Bubble row
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-end',
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },

  // Bubble
  bubble: {
    maxWidth: SCREEN_W * 0.7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleWavy: {
    backgroundColor: 'rgba(255,255,255,0.15)',
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

  // Typing indicator
  typingRow: {
    marginTop: 8,
  },
  typingLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 3,
    marginLeft: 36,
  },
  typingBubble: {
    backgroundColor: 'rgba(255,255,255,0.15)',
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
});

// ═══════════════════════════════════════════════
//  DYNAMIC STYLES (theme-aware)
// ═══════════════════════════════════════════════

const dynStyles = (tc: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#5B3E9E',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 14,
      backgroundColor: '#6B4EAB',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.12)',
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
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
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.12)',
      backgroundColor: '#6B4EAB',
    },
    textInput: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)',
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontFamily: fonts.regular,
      fontSize: 15,
      color: '#FFFFFF',
      minHeight: 44,
      maxHeight: 120,
    },
    sendBtn: {
      marginLeft: 10,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 22,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 0,
    },
  });

export default WavyChatScreen;
