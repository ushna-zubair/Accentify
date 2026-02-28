/**
 * Frontend service for the pronunciation exercise flow.
 *
 * Calls Cloud Functions:
 *   1. getPronunciationSentences – fetches sentences from Firestore
 *   2. transcribeAndEvaluate    – sends audio for STT + scoring
 *
 * Also provides a helper to read a local audio file as base64.
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { readAsStringAsync } from 'expo-file-system';
import app from '../config/firebase';

const functions = getFunctions(app);

// ─── Types ───

export interface PronunciationSentenceDTO {
  id: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  order: number;
  topic?: string;
}

export interface TranscribeResult {
  attemptId: string;
  transcript: string;
  wordResults: { word: string; isCorrect: boolean }[];
  score: { clarity: number; accuracy: number; fluency: number; overall: number };
  feedback: string;
  isCorrect: boolean;
}

// ─── Callable wrappers ───

/**
 * Fetch pronunciation sentences from the backend.
 * @param difficulty Optional filter ('easy' | 'medium' | 'hard')
 * @param limit     Max number of sentences to return (default 3)
 */
export async function fetchSentences(
  difficulty?: string,
  limit?: number,
): Promise<PronunciationSentenceDTO[]> {
  const fn = httpsCallable<
    { difficulty?: string; limit?: number },
    { sentences: PronunciationSentenceDTO[] }
  >(functions, 'getPronunciationSentences');
  const result = await fn({ difficulty, limit });
  return result.data.sentences;
}

/**
 * Read a local audio file as a base64 string.
 * This uses expo-file-system to read the file recorded by expo-av.
 */
export async function readAudioAsBase64(uri: string): Promise<string> {
  const base64 = await readAsStringAsync(uri, {
    encoding: 'base64',
  });
  return base64;
}

/**
 * Send audio + target text to the Cloud Function for
 * transcription and pronunciation evaluation.
 */
export async function transcribeAndEvaluate(
  audioBase64: string,
  targetText: string,
  sentenceId?: string,
): Promise<TranscribeResult> {
  const fn = httpsCallable<
    {
      audioBase64: string;
      targetText: string;
      sentenceId?: string;
      encoding: string;
      sampleRateHertz: number;
    },
    TranscribeResult
  >(functions, 'transcribeAndEvaluate');

  const result = await fn({
    audioBase64,
    targetText,
    sentenceId,
    // expo-av HIGH_QUALITY preset records in AAC / m4a on iOS,
    // and AMR_WB / 3gp on Android. For Google STT we specify encoding.
    // LINEAR16 is most reliable; if your recording preset outputs
    // a different format, adjust accordingly.
    encoding: 'LINEAR16',
    sampleRateHertz: 44100,
  });

  return result.data;
}
