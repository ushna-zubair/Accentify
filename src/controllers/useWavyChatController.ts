import { useState, useCallback, useRef } from 'react';
import {
  doc,
  setDoc,
  collection,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// ═══════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════

export interface WavyChatMessage {
  id: string;
  role: 'wavy' | 'user';
  text: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════
//  PHONETIC MAP
// ═══════════════════════════════════════════════

const PHONETIC_MAP: Record<string, string> = {
  play: 'pley',
  soccer: 'sah-ker',
  friends: 'frendz',
  but: 'buht',
  games: 'gaymz',
  staying: 'stay-ing',
  ended: 'en-ded',
  video: 'vih-dee-oh',
  study: 'stuh-dee',
  exam: 'ig-zam',
  watching: 'wah-ching',
  favorite: 'fay-vuh-ruht',
  evening: 'eev-ning',
  planned: 'pland',
  morning: 'mor-ning',
  sleeping: 'slee-ping',
  science: 'sy-uhns',
  project: 'prah-jekt',
  saturday: 'sa-ter-day',
  afternoon: 'af-ter-noon',
  library: 'ly-breh-ree',
  hannah: 'ha-nuh',
  finish: 'fi-nish',
  working: 'wer-king',
  sophie: 'soh-fee',
  wanted: 'wahn-ted',
  series: 'seer-eez',
  joe: 'joh',
  went: 'went',
  home: 'hohm',
  spent: 'spent',
};

// ═══════════════════════════════════════════════
//  AI RESPONSE LOGIC
// ═══════════════════════════════════════════════

/** Normalize a word for lookup */
const normalize = (w: string): string =>
  w.toLowerCase().replace(/[^a-z']/g, '');

/** Break a word into syllables (simple heuristic) */
const breakIntoSyllables = (word: string): string => {
  const n = normalize(word);
  if (PHONETIC_MAP[n]) return PHONETIC_MAP[n];

  // Fallback: simple syllable split for unknown words
  const vowels = 'aeiouy';
  let result = '';
  let prevVowel = false;
  for (let i = 0; i < n.length; i++) {
    const isV = vowels.includes(n[i]);
    if (isV && prevVowel) {
      result += n[i];
    } else if (isV && !prevVowel && result.length > 0) {
      result += '-' + n[i];
    } else {
      result += n[i];
    }
    prevVowel = isV;
  }
  return result;
};

type ConversationState =
  | 'greeting'
  | 'awaiting_issue'
  | 'awaiting_word'
  | 'helping'
  | 'general';

/**
 * Generate Wavy's response based on user input and conversation state,
 * using the current sentence context for intelligent help.
 */
const generateWavyResponse = (
  userText: string,
  state: ConversationState,
  _currentSentence: string,
): { reply: string; nextState: ConversationState } => {
  const lower = userText.toLowerCase().trim();

  // Greeting / initial state
  if (state === 'greeting') {
    if (
      lower.includes('stuck') ||
      lower.includes('help') ||
      lower.includes('can\'t') ||
      lower.includes('cant') ||
      lower.includes('difficult') ||
      lower.includes('hard')
    ) {
      return {
        reply: 'Which word do you need help with specifically?',
        nextState: 'awaiting_word',
      };
    }
    if (lower.includes('pronounce') || lower.includes('pronunciation')) {
      return {
        reply: 'Which word do you need help with specifically?',
        nextState: 'awaiting_word',
      };
    }
    return {
      reply:
        "I can help you with pronunciation! Tell me which word you're struggling with, or say \"I'm stuck\" if you need guidance.",
      nextState: 'awaiting_issue',
    };
  }

  // Awaiting what the issue is
  if (state === 'awaiting_issue') {
    if (
      lower.includes('stuck') ||
      lower.includes('help') ||
      lower.includes('can\'t') ||
      lower.includes('cant') ||
      lower.includes('word')
    ) {
      return {
        reply: 'Which word do you need help with specifically?',
        nextState: 'awaiting_word',
      };
    }
    // If they type a single word, treat it as the word they need help with
    if (lower.split(/\s+/).length <= 2) {
      const phonetic = breakIntoSyllables(lower.split(/\s+/)[0]);
      return {
        reply: `Try breaking down the word like this:\n${phonetic}`,
        nextState: 'helping',
      };
    }
    return {
      reply: 'Which word do you need help with specifically?',
      nextState: 'awaiting_word',
    };
  }

  // Awaiting the specific word
  if (state === 'awaiting_word') {
    const words = lower.split(/\s+/).filter(Boolean);
    const targetWord = words[words.length - 1]; // Take last word
    const phonetic = breakIntoSyllables(targetWord);
    return {
      reply: `Try breaking down the word like this:\n${phonetic}`,
      nextState: 'helping',
    };
  }

  // Already helped — can help with another word or give tips
  if (state === 'helping') {
    if (
      lower.includes('another') ||
      lower.includes('more') ||
      lower.includes('next')
    ) {
      return {
        reply: 'Sure! Which word would you like help with?',
        nextState: 'awaiting_word',
      };
    }
    if (lower.includes('thank') || lower.includes('thanks')) {
      return {
        reply: "You're welcome! Good luck with the pronunciation. You got this! 💪",
        nextState: 'general',
      };
    }
    // If they type a single word, treat as another word request
    if (lower.split(/\s+/).length <= 2) {
      const phonetic = breakIntoSyllables(normalize(lower.split(/\s+/)[0]));
      return {
        reply: `Try breaking down the word like this:\n${phonetic}`,
        nextState: 'helping',
      };
    }
    return {
      reply:
        'Need help with another word? Just type it and I\'ll break it down for you!',
      nextState: 'helping',
    };
  }

  // General / fallback
  if (lower.split(/\s+/).length <= 2) {
    const phonetic = breakIntoSyllables(normalize(lower.split(/\s+/)[0]));
    return {
      reply: `Try breaking down the word like this:\n${phonetic}`,
      nextState: 'helping',
    };
  }
  return {
    reply:
      'I\'m here to help with pronunciation! Tell me which word you\'d like to practice.',
    nextState: 'awaiting_issue',
  };
};

const createId = (): string =>
  `wc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// ═══════════════════════════════════════════════
//  CONTROLLER
// ═══════════════════════════════════════════════

export const useWavyChatController = (
  lessonId: string,
  currentSentence: string,
) => {
  const [messages, setMessages] = useState<WavyChatMessage[]>([
    {
      id: createId(),
      role: 'wavy',
      text: 'Hello how can i assist you?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const stateRef = useRef<ConversationState>('greeting');

  const sendMessage = useCallback(
    async (text?: string) => {
      const msg = (text ?? inputText).trim();
      if (!msg) return;

      // Add user message
      const userMsg: WavyChatMessage = {
        id: createId(),
        role: 'user',
        text: msg,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputText('');

      // Simulate typing delay
      setIsTyping(true);
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

      // Generate response
      const { reply, nextState } = generateWavyResponse(
        msg,
        stateRef.current,
        currentSentence,
      );
      stateRef.current = nextState;

      const aiMsg: WavyChatMessage = {
        id: createId(),
        role: 'wavy',
        text: reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);

      // ── Save to Firestore ──
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          await addDoc(
            collection(
              db,
              'users',
              uid,
              'lessons',
              lessonId,
              'wavyChats',
            ),
            {
              userMessage: msg,
              aiResponse: reply,
              sentence: currentSentence,
              createdAt: Timestamp.now(),
            },
          );

          // Update chat interaction count
          await setDoc(
            doc(db, 'users', uid, 'lessons', lessonId),
            {
              wavyChatCount: (await import('firebase/firestore')).increment(1),
              lastWavyChatAt: Timestamp.now(),
            },
            { merge: true },
          );
        } catch {
          // Non-critical
        }
      }
    },
    [inputText, currentSentence, lessonId],
  );

  return {
    messages,
    inputText,
    setInputText,
    isTyping,
    sendMessage,
  };
};
