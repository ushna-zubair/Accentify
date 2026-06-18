/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Adam Sabih
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

/**
 * useTutorChatController
 *
 * Drives the AI Tutor voice-chat (replaces the legacy lesson catalog as the
 * Tutor tab). Records the learner's mic input, posts it to
 * /conversation/audio, then shows the transcription + AI reply text and
 * auto-plays the returned WAV.
 *
 * Key invariants:
 *   - `phaseRef.current` is the source of truth for the press handler so a
 *     fast second tap can't race against the in-flight first tap.
 *   - `playingMessageId` (state) is set BEFORE playback starts and cleared
 *     when playback finishes, so the bubble showing "Playing…" is always
 *     the one whose audio is actually playing — including replays of older
 *     messages.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioModule,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioPlayer,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { auth } from '../config/firebase';
import { WAV2VEC2_RECORDING_OPTIONS } from '../utils/audioRecording';
import {
  conversationAudio,
  ConversationApiError,
  convoHealth,
  type ConversationAudioResponse,
  type ConversationHistoryMessage,
} from '../services/conversationApi';
import { useAuth } from '../context/AuthContext';
import { loadTutorHistory, saveTutorHistory, clearTutorHistory } from '../services/chatStorage';
import { detectAudioEncoding } from '../services/pronunciationService';

export type TutorPhase = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';

export interface TutorMessage {
  id: string;
  role: 'tutor' | 'user';
  text: string;
  /** Local URI to a playable WAV — only set on `role === 'tutor'`. */
  audioUri?: string;
  timestamp: string;
}

const createId = (): string => `tc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const TUTOR_GREETING =
  "Hi! I'm your AI tutor. Tap the mic and speak a sentence — I'll listen and give you instant feedback on your English grammar and word choice.";

// Reject obvious silence / accidental taps before we hit the API.
const MIN_RECORDING_MS = 600;

const greetingMessage = (): TutorMessage => ({
  id: createId(),
  role: 'tutor',
  text: TUTOR_GREETING,
  timestamp: new Date().toISOString(),
});

export const useTutorChatController = () => {
  // Pull the learner's CEFR level so Tutor replies adapt in complexity.
  // The studyPlan field lives on the full Firestore user doc — same `as any`
  // cast other screens use to read it from the lightweight UserProfile type.
  const { userProfile } = useAuth();
  const cefrLevel = (userProfile as any)?.studyPlan?.englishLevel as string | undefined;
  const learnerName = userProfile?.fullName;

  const [messages, setMessages] = useState<TutorMessage[]>(() => [greetingMessage()]);
  const [phase, setPhaseState] = useState<TutorPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // phaseRef mirrors `phase` so the press handler reads the latest value
  // synchronously — avoids the closure staleness that made the stop button
  // need multiple taps.
  const phaseRef = useRef<TutorPhase>('idle');
  const setPhase = useCallback((p: TutorPhase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  // Mirror `messages` into a ref so stopAndSend can read the freshest
  // history without pulling `messages` into its deps.
  const messagesRef = useRef<TutorMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ── Recorder ──
  const audioRecorder = useAudioRecorder(WAV2VEC2_RECORDING_OPTIONS);
  const recorderRef = useRef(audioRecorder);
  recorderRef.current = audioRecorder;

  // ── Playback ──
  const playerRef = useRef<AudioPlayer | null>(null);

  // ── Permission cache (avoid the slow re-prompt on every tap) ──
  const micPermissionGrantedRef = useRef<boolean>(false);

  // ── Timing ──
  const recordingStartRef = useRef<number>(0);
  const recordingDurationRef = useRef<number>(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Warm up the Space on mount so the first recording isn't slowed by a cold start ──
  useEffect(() => {
    convoHealth().catch(() => {});
  }, []);

  // ── Load persisted history on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uid = auth.currentUser?.uid ?? null;
      const stored = await loadTutorHistory(uid);
      if (!cancelled && stored.length > 0) {
        setMessages(stored);
      }
      if (!cancelled) setHistoryLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Persist on change (only after the initial load completes, otherwise
  //    the [greeting] placeholder we render before load finishes would
  //    overwrite real history). ──
  useEffect(() => {
    if (!historyLoaded) return;
    const uid = auth.currentUser?.uid ?? null;
    saveTutorHistory(uid, messages).catch(() => {});
  }, [messages, historyLoaded]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      try {
        const r = recorderRef.current;
        if (r?.isRecording) r.stop().catch(() => {});
      } catch {
        // recorder native object may already be released
      }
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      try {
        playerRef.current?.remove();
      } catch {
        // player already released
      }
      playerRef.current = null;
    };
  }, []);

  const stopAndReleasePlayer = useCallback(() => {
    const p = playerRef.current;
    setPlayingMessageId(null);
    if (!p) return;
    try {
      p.pause();
    } catch {
      // ignore
    }
    try {
      p.remove();
    } catch {
      // ignore
    }
    playerRef.current = null;
  }, []);

  /** Write the API's base64 audio to cache and return the local file URI.
   *  Extension matters on iOS/Android because expo-audio probes format from it. */
  const writeAudioToCache = useCallback(
    async (audioBase64: string, format: 'mp3' | 'wav' = 'mp3'): Promise<string> => {
      const fileName = `tutor_reply_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}.${format}`;
      const file = new File(Paths.cache, fileName);
      if (file.exists) file.delete();
      file.create();
      file.write(audioBase64, { encoding: 'base64' });
      return file.uri;
    },
    [],
  );

  /** Plays a tutor-reply WAV — marks `messageId` as the currently-playing one. */
  const playTutorAudio = useCallback(
    async (uri: string, messageId: string) => {
      stopAndReleasePlayer();
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      } catch {
        // ignore — playback usually still works
      }
      try {
        const player = createAudioPlayer({ uri });
        playerRef.current = player;
        setPlayingMessageId(messageId);
        setPhase('speaking');
        const sub = player.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish) {
            sub.remove();
            // Only flip back to idle if no new turn has started since.
            if (phaseRef.current === 'speaking') setPhase('idle');
            stopAndReleasePlayer();
          }
        });
        player.play();
      } catch (e) {
        console.warn('[Tutor] playback failed:', e);
        setPlayingMessageId(null);
        setPhase('idle');
      }
    },
    [setPhase, stopAndReleasePlayer],
  );

  const replayMessage = useCallback(
    async (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg?.audioUri) return;
      await playTutorAudio(msg.audioUri, messageId);
    },
    [messages, playTutorAudio],
  );

  const startRecording = useCallback(async () => {
    // OPTIMISTIC: flip to 'recording' immediately so the UI updates and a
    // second tap can route to the stop branch. We'll revert on failure.
    setError(null);
    setPhase('recording');
    stopAndReleasePlayer();
    recordingStartRef.current = Date.now();
    recordingDurationRef.current = 0;
    setRecordingDuration(0);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    durationTimerRef.current = setInterval(() => {
      recordingDurationRef.current = Date.now() - recordingStartRef.current;
      setRecordingDuration(recordingDurationRef.current);
    }, 100);

    try {
      // Skip the (slow) permission re-prompt once we've been granted.
      if (!micPermissionGrantedRef.current) {
        const { granted } = await AudioModule.requestRecordingPermissionsAsync();
        if (!granted) {
          setError('Microphone permission is required to talk to the tutor.');
          if (durationTimerRef.current) clearInterval(durationTimerRef.current);
          setPhase('idle');
          return;
        }
        micPermissionGrantedRef.current = true;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      const recorder = recorderRef.current;
      try {
        await recorder.prepareToRecordAsync();
      } catch {
        // already prepared or just released — proceed
      }
      recorder.record();
    } catch (e) {
      console.error('[Tutor] startRecording:', e);
      setError('Failed to start recording. Please try again.');
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      setPhase('error');
    }
  }, [setPhase, stopAndReleasePlayer]);

  const stopAndSend = useCallback(async () => {
    // OPTIMISTIC: jump straight to 'processing' so the UI no longer reads
    // 'recording' — and a follow-up tap can't re-enter stopAndSend.
    setPhase('processing');

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    const recorder = recorderRef.current;
    try {
      if (recorder?.isRecording) await recorder.stop();
    } catch (e) {
      console.warn('[Tutor] recorder.stop failed:', e);
    }
    const uri = recorder?.uri;
    try {
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      // ignore
    }

    if (!uri) {
      setError('Recording failed — no audio captured. Try again.');
      setPhase('idle');
      return;
    }

    if (recordingDurationRef.current < MIN_RECORDING_MS) {
      setError('That recording was too short — hold the button and speak a sentence.');
      setPhase('idle');
      return;
    }

    // Give expo-audio a moment to flush the recording to disk before uploading.
    await new Promise((r) => setTimeout(r, 300));

    let response: ConversationAudioResponse;
    try {
      // The conversation Space uses Whisper (distil-small.en), which decodes
      // m4a/webm/wav natively via ffmpeg — so we send the recording as-is
      // and skip the convertAudioToWav Cloud Function round trip the
      // pronunciation pipeline needs.
      const encoding = detectAudioEncoding(uri);
      const history: ConversationHistoryMessage[] = messagesRef.current.map((m) => ({
        role: m.role === 'tutor' ? 'assistant' : 'user',
        content: m.text,
      }));
      response = await conversationAudio({
        audioUri: uri,
        encoding,
        cefrLevel,
        learnerName,
        history,
      });
    } catch (e) {
      const msg =
        e instanceof ConversationApiError
          ? e.userMessage
          : 'Could not reach the tutor right now. Please try again.';
      console.error('[Tutor] conversationAudio failed:', e);
      setError(msg);
      setPhase('idle');
      return;
    }

    const userText = response.transcription?.trim() || '(no speech detected)';
    const tutorText = response.response_text?.trim() || '';

    let tutorAudioUri: string | undefined;
    try {
      if (response.audio_base64) {
        tutorAudioUri = await writeAudioToCache(
          response.audio_base64,
          response.audio_format ?? 'mp3',
        );
      }
    } catch (e) {
      console.warn('[Tutor] could not write reply audio:', e);
    }

    const now = new Date().toISOString();
    const tutorMessageId = createId();
    setMessages((prev) => [
      ...prev,
      {
        id: createId(),
        role: 'user',
        text: userText,
        timestamp: now,
      },
      {
        id: tutorMessageId,
        role: 'tutor',
        text: tutorText || "(I didn't catch a reply — try again.)",
        audioUri: tutorAudioUri,
        timestamp: now,
      },
    ]);

    if (tutorAudioUri) {
      await playTutorAudio(tutorAudioUri, tutorMessageId);
    } else {
      setPhase('idle');
    }
  }, [playTutorAudio, setPhase, writeAudioToCache, cefrLevel, learnerName]);

  /**
   * Single press handler — reads `phaseRef` (not the captured `phase`) so a
   * fast second tap immediately routes to the right branch instead of re-
   * entering whatever the first tap is still finishing.
   */
  const toggleMic = useCallback(async () => {
    const p = phaseRef.current;
    if (p === 'processing') return; // ignore taps while waiting on the API
    try {
      if (p === 'recording') {
        await stopAndSend();
        return;
      }
      // idle / error / speaking → start a new recording (interrupts any playback)
      stopAndReleasePlayer();
      await startRecording();
    } catch (e) {
      console.error('[Tutor] toggleMic unhandled error:', e);
      setError('Something went wrong. Please try again.');
      setPhase('idle');
    }
  }, [startRecording, stopAndSend, stopAndReleasePlayer, setPhase]);

  const dismissError = useCallback(() => setError(null), []);

  /** Reset chat back to a single greeting bubble; also wipes AsyncStorage. */
  const clearChat = useCallback(async () => {
    // Stop any in-flight playback first so we don't leak a player pointing
    // at an audioUri that's about to be discarded.
    stopAndReleasePlayer();
    setMessages([greetingMessage()]);
    setError(null);
    setPhase('idle');
    const uid = auth.currentUser?.uid ?? null;
    await clearTutorHistory(uid).catch(() => {});
  }, [setPhase, stopAndReleasePlayer]);

  return {
    messages,
    phase,
    error,
    recordingDuration,
    playingMessageId,
    toggleMic,
    replayMessage,
    dismissError,
    clearChat,
  };
};
