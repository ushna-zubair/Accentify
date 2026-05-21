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
 * Uses fetch + FileReader to avoid deprecated expo-file-system APIs.
 */
export async function readAudioAsBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // result is "data:<mime>;base64,<data>" — strip the prefix
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
