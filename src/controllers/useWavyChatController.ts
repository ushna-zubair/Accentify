import { useState, useCallback, useRef, useEffect } from 'react';
import {
  doc,
  setDoc,
  collection,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
  conversationText,
  ConversationApiError,
  type ConversationHistoryMessage,
} from '../services/conversationApi';
import { useAuth } from '../context/AuthContext';
import {
  loadWavyHistory,
  saveWavyHistory,
  clearWavyHistory,
} from '../services/chatStorage';
import { friendlySound } from '../services/arpabetFriendly';

export interface WavyChatLastResult {
  /** Pretty word or sentence the learner just attempted. */
  reference: string;
  /** 0–100. */
  overallPct: number;
  /** ARPAbet phonemes the model wants the learner to revisit (word flow). */
  missedPhones?: string[];
  /** Words the model didn't hear as a 'M' match (sentence flow). */
  weakWords?: string[];
  /** 'word' | 'sentence' — drives which feedback endpoint Wavy calls. */
  itemType?: 'word' | 'sentence';
}

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

const HELP_INTENT_KEYWORDS = [
  'help', 'stuck', 'tip', 'tips', 'how', 'cant', "can't", 'hard',
  'difficult', 'hint', 'advice', 'pronounce', 'pronunciation',
];

const isHelpIntent = (lower: string): boolean =>
  HELP_INTENT_KEYWORDS.some((k) => lower.includes(k));

/** Build a contextual greeting that anchors Wavy on what the learner is doing. */
const buildGreeting = (
  currentSentence: string,
  lastResult: WavyChatLastResult | null | undefined,
): string => {
  const target = currentSentence?.trim();
  if (!target) {
    return "Hi! I'm Wavy — your pronunciation coach. Tap the mic when you're ready, or ask me how to say any word.";
  }
  if (lastResult && lastResult.reference === target) {
    if (lastResult.overallPct >= 75) {
      return `Nice work on "${target}" — you scored ${lastResult.overallPct}%. Want a tip to push it higher, or move on?`;
    }
    const hint = lastResult.missedPhones?.length
      ? ` Focus on the ${friendlySound(lastResult.missedPhones[0])} sound.`
      : lastResult.weakWords?.length
        ? ` "${lastResult.weakWords[0]}" tripped the model — try emphasising it.`
        : '';
    return `You're at ${lastResult.overallPct}% on "${target}".${hint} Want me to break it down?`;
  }
  return `Hi! Need help with "${target}"? Ask me "how do I say this?" or "what's the hardest part?"`;
};

/** Word-level fallback when the API isn't available. */
const offlineWordTip = (word: string): string => {
  const phonetic = breakIntoSyllables(word);
  return `Try breaking "${word}" into syllables: ${phonetic}.\nSlow it down, then speed up.`;
};

const createId = (): string =>
  `wc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// ═══════════════════════════════════════════════
//  CONTROLLER
// ═══════════════════════════════════════════════

export const useWavyChatController = (
  lessonId: string,
  currentSentence: string,
  lastResult?: WavyChatLastResult | null,
) => {
  // Pull the learner's CEFR level so Wavy's free-chat replies adapt in
  // complexity. The studyPlan field is on the full Firestore user doc but
  // not surfaced on the lightweight `UserProfile` type — same `as any` cast
  // other screens use.
  const { userProfile } = useAuth();
  const cefrLevel = (userProfile as any)?.studyPlan?.englishLevel as
    | string
    | undefined;
  // First name is used by Wavy to address the learner. We pass the full
  // fullName through and let the service extract the first token.
  const learnerName = userProfile?.fullName;
  // Persistence is enabled ONLY for the standalone Wavy Chat tab/screen
  // (lessonId='general', no current sentence). The in-exercise overlay is
  // ephemeral by design — it's tied to the word/sentence being practiced.
  const isStandalone = lessonId === 'general' && !currentSentence;

  // Build a fresh greeting whenever the current word/sentence or last result
  // changes — otherwise Wavy stays anchored on the first thing the learner
  // opened the overlay with.
  const greetingRef = useRef<string>('');
  const [messages, setMessages] = useState<WavyChatMessage[]>([
    {
      id: createId(),
      role: 'wavy',
      text: buildGreeting(currentSentence, lastResult),
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(!isStandalone);

  // Mirror `messages` into a ref so generateReply can read the freshest
  // conversation history without pulling `messages` into its deps (which
  // would recreate the callback on every keystroke).
  const messagesRef = useRef<WavyChatMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ── Load persisted history on mount (standalone only) ──
  useEffect(() => {
    if (!isStandalone) return;
    let cancelled = false;
    (async () => {
      const uid = auth.currentUser?.uid ?? null;
      const stored = await loadWavyHistory(uid);
      if (!cancelled && stored.length > 0) {
        setMessages(stored);
      }
      if (!cancelled) setHistoryLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isStandalone]);

  // ── Persist on change (standalone only, and only after the initial load
  //    finished so we don't clobber the saved history with the [greeting]
  //    placeholder we render before load completes) ──
  useEffect(() => {
    if (!isStandalone || !historyLoaded) return;
    const uid = auth.currentUser?.uid ?? null;
    saveWavyHistory(uid, messages).catch(() => {});
  }, [messages, isStandalone, historyLoaded]);

  useEffect(() => {
    // Suppress greeting rebuilds in the standalone flow — the greeting only
    // belongs there once, the rest of the chat is real history.
    if (isStandalone) return;
    const greeting = buildGreeting(currentSentence, lastResult);
    if (greeting === greetingRef.current) return;
    greetingRef.current = greeting;
    setMessages((prev) => {
      // Only swap the greeting bubble if the user hasn't said anything yet —
      // otherwise we'd erase the conversation when the next word loads.
      if (prev.length <= 1) {
        return [
          {
            id: createId(),
            role: 'wavy',
            text: greeting,
            timestamp: new Date().toISOString(),
          },
        ];
      }
      return prev;
    });
  }, [currentSentence, lastResult, isStandalone]);

  /** Reset chat back to a single fresh greeting bubble and clear storage. */
  const clearChat = useCallback(async () => {
    const greeting = buildGreeting(currentSentence, lastResult);
    setMessages([
      {
        id: createId(),
        role: 'wavy',
        text: greeting,
        timestamp: new Date().toISOString(),
      },
    ]);
    if (isStandalone) {
      const uid = auth.currentUser?.uid ?? null;
      await clearWavyHistory(uid).catch(() => {});
    }
  }, [currentSentence, lastResult, isStandalone]);

  /** Decide what Wavy should say next based on context + user intent. */
  const generateReply = useCallback(
    async (userText: string): Promise<string> => {
      const lower = userText.toLowerCase().trim();
      const target = currentSentence?.trim() ?? '';
      const itemType: 'word' | 'sentence' =
        lastResult?.itemType ?? (target.includes(' ') ? 'sentence' : 'word');

      // Standalone Wavy Chat (no exercise context) → route through the
      // /conversation/text endpoint so the user gets a real LLM-backed reply
      // instead of canned pronunciation tips. The in-exercise overlay (target
      // present) keeps its existing pronunciation-feedback path below.
      if (!target) {
        // Build conversation history from prior bubbles (excluding the user
        // turn currently being sent — that goes in `userText`). The service
        // trims the array to its own limit, so we send what we have.
        const history: ConversationHistoryMessage[] = messagesRef.current.map(
          (m) => ({
            role: m.role === 'wavy' ? 'assistant' : 'user',
            content: m.text,
          }),
        );
        try {
          const res = await conversationText(userText, cefrLevel, learnerName, history);
          const reply = res?.response_text?.trim();
          if (reply) return reply;
        } catch (e) {
          if (e instanceof ConversationApiError) {
            return e.userMessage;
          }
          // Fall through to the offline fallback at the bottom.
        }
      }

      if (lower.includes('thank')) {
        return "You're welcome! Keep going — small reps add up. 💪";
      }

      const isAboutResult =
        lower.includes('score') ||
        lower.includes('wrong') ||
        lower.includes('right') ||
        lower.includes('miss');
      if (isAboutResult && lastResult) {
        const tier = lastResult.overallPct >= 75 ? 'a passing' : 'not quite a passing';
        const detail = lastResult.missedPhones?.length
          ? ` The model flagged the ${friendlySound(lastResult.missedPhones[0])} sound — practice that in isolation first.`
          : lastResult.weakWords?.length
            ? ` "${lastResult.weakWords[0]}" was the weakest word — read it on its own a few times.`
            : '';
        return `Your last attempt scored ${lastResult.overallPct}%, ${tier} score.${detail}`;
      }

      // "Help" / "how do I say this" / similar → local phonetic breakdown.
      // The /feedback_* endpoints need the ARPAbet alignment from a real
      // recording, which we don't have for a chat-only query.
      if (isHelpIntent(lower) || lower.length < 3) {
        if (target) {
          if (itemType === 'word') return offlineWordTip(target);
          return `Read "${target}" out loud once, then break it into chunks. Focus on stress: pause briefly after each comma or strong word.`;
        }
        return "Tap the mic and try the prompt above — I'll give you a real tip after you record.";
      }

      // Single word the learner is asking about → quick syllable breakdown.
      const tokens = lower.split(/\s+/).filter(Boolean);
      if (tokens.length <= 2) {
        const word = normalize(tokens[tokens.length - 1] ?? '');
        if (word) {
          return offlineWordTip(word);
        }
      }

      return target
        ? `Try saying "${target}" out loud once, then ask me about any word that tripped you up.`
        : "I'm here to help with pronunciation — tell me which word you'd like to practice.";
    },
    [currentSentence, lastResult, cefrLevel, learnerName],
  );

  const sendMessage = useCallback(
    async (text?: string) => {
      const msg = (text ?? inputText).trim();
      if (!msg) return;

      const userMsg: WavyChatMessage = {
        id: createId(),
        role: 'user',
        text: msg,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputText('');

      setIsTyping(true);
      const reply = await generateReply(msg);
      setIsTyping(false);

      const aiMsg: WavyChatMessage = {
        id: createId(),
        role: 'wavy',
        text: reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);

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
    [inputText, currentSentence, lessonId, generateReply],
  );

  return {
    messages,
    inputText,
    setInputText,
    isTyping,
    sendMessage,
    clearChat,
  };
};
