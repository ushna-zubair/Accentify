import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const GOOGLE_STT_KEY = defineSecret('GOOGLE_STT_API_KEY');

const db = admin.firestore();

// ─── Types ───

interface WordResult {
  word: string;
  isCorrect: boolean;
}

interface PronunciationScore {
  clarity: number;
  accuracy: number;
  fluency: number;
  overall: number;
}

// ─── Helpers ───

/** Strip punctuation, normalize for comparison. */
const normalize = (w: string): string =>
  w.toLowerCase().replace(/[^a-zA-Z0-9']/g, '');

/** Levenshtein edit distance. */
const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
};

/** Simple phonetic approximation for feedback. */
const toPhonetic = (word: string): string => {
  const map: Record<string, string> = {
    play: 'pley', soccer: 'sah-ker', friends: 'frendz', but: 'buht',
    games: 'gaymz', staying: 'stay-ing', ended: 'en-ded', video: 'vih-dee-oh',
    study: 'stuh-dee', exam: 'ig-zam', watching: 'wah-ching', favorite: 'fay-vuh-rit',
    evening: 'eev-ning', planned: 'pland', morning: 'mor-ning', sleeping: 'slee-ping',
    science: 'sy-uhns', project: 'prah-jekt', saturday: 'sa-ter-day',
    afternoon: 'af-ter-noon', library: 'ly-breh-ree', finish: 'fi-nish',
    working: 'wer-king', wanted: 'won-ted', series: 'seer-eez',
    sophie: 'so-fee', hannah: 'ha-nuh', spent: 'spent',
  };
  return map[word.toLowerCase()] ?? word.toLowerCase();
};

/** Evaluate word-level pronunciation accuracy. */
const evaluatePronunciation = (
  target: string,
  transcript: string,
): { wordResults: WordResult[]; score: PronunciationScore; feedback: string } => {
  const targetWords = target.split(/\s+/).filter(Boolean);
  const transcriptWords = transcript.split(/\s+/).filter(Boolean);

  let matched = 0;
  const wordResults: WordResult[] = targetWords.map((tw, i) => {
    const nTarget = normalize(tw);
    const nTranscript = normalize(transcriptWords[i] ?? '');
    if (!nTarget) return { word: tw, isCorrect: true };

    const dist = levenshtein(nTarget, nTranscript);
    const threshold = nTarget.length <= 3 ? 0 : Math.ceil(nTarget.length * 0.3);
    const correct = dist <= threshold;
    if (correct) matched++;
    return { word: tw, isCorrect: correct };
  });

  const ratio = targetWords.length > 0 ? matched / targetWords.length : 0;
  const accuracy = Math.round(ratio * 100);
  const clarity = Math.round(Math.min(100, accuracy + (Math.random() * 10 - 5)));
  const fluency = Math.round(Math.min(100, accuracy + (Math.random() * 15 - 7)));
  const overall = Math.round((clarity + accuracy + fluency) / 3);
  const score: PronunciationScore = { clarity, accuracy, fluency, overall };

  const firstWrong = wordResults.find((wr) => !wr.isCorrect);
  let feedback = '';
  if (firstWrong) {
    const w = normalize(firstWrong.word);
    const ph = toPhonetic(w);
    feedback = `Not quite! Emphasize the "${w}" part — make the sounds clearer and stronger. Try saying it slowly: ${ph}.`;
  }

  return { wordResults, score, feedback };
};

// ═══════════════════════════════════════════════
//  1. GET PRONUNCIATION SENTENCES
// ═══════════════════════════════════════════════

/**
 * Fetches pronunciation sentences from Firestore.
 * Falls back to default sentences if the collection is empty.
 */
export const getPronunciationSentences = onCall(async (request) => {
  const { difficulty, limit: reqLimit } = (request.data ?? {}) as {
    difficulty?: string;
    limit?: number;
  };
  const maxSentences = reqLimit ?? 3;

  let query: admin.firestore.Query = db.collection('pronunciation_sentences');

  if (difficulty) {
    query = query.where('difficulty', '==', difficulty);
  }
  query = query.orderBy('order', 'asc').limit(maxSentences);

  const snap = await query.get();

  if (snap.empty) {
    // Return default sentences if collection hasn't been seeded
    return {
      sentences: [
        {
          id: 'default_1',
          text: 'Joe went to play soccer with his friends but he ended up staying at home and play video games',
          difficulty: 'easy',
          order: 1,
        },
        {
          id: 'default_2',
          text: 'Sophie wanted to study for her exam, but she ended up watching her favorite TV series all evening.',
          difficulty: 'medium',
          order: 2,
        },
        {
          id: 'default_3',
          text: 'Hannah planned to finish her science project on Saturday, so she spent the afternoon working at the library.',
          difficulty: 'hard',
          order: 3,
        },
      ],
    };
  }

  const sentences = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return { sentences };
});

// ═══════════════════════════════════════════════
//  2. TRANSCRIBE & EVALUATE PRONUNCIATION
// ═══════════════════════════════════════════════

/**
 * Accepts base64-encoded audio and the target sentence.
 * Uses Google Cloud Speech-to-Text for transcription,
 * then evaluates pronunciation at the word level.
 *
 * Stores the attempt in Firestore under
 * `users/{uid}/pronunciation_attempts/{docId}`.
 */
export const transcribeAndEvaluate = onCall(
  { secrets: [GOOGLE_STT_KEY], timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const { audioBase64, targetText, sentenceId, encoding, sampleRateHertz } =
      request.data as {
        audioBase64?: string;
        targetText?: string;
        sentenceId?: string;
        encoding?: string;
        sampleRateHertz?: number;
      };

    if (!audioBase64 || !targetText) {
      throw new HttpsError(
        'invalid-argument',
        'audioBase64 and targetText are required.',
      );
    }

    // ── Transcribe with Google Cloud Speech-to-Text REST API ──
    let transcript = '';
    try {
      const apiKey = GOOGLE_STT_KEY.value();
      const sttUrl = `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`;

      const sttBody = {
        config: {
          encoding: encoding ?? 'LINEAR16',
          sampleRateHertz: sampleRateHertz ?? 44100,
          languageCode: 'en-US',
          enableWordTimeOffsets: false,
          model: 'default',
          enableAutomaticPunctuation: true,
        },
        audio: {
          content: audioBase64,
        },
      };

      const response = await fetch(sttUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sttBody),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('[STT] Error response:', errBody);
        throw new Error(`STT API returned ${response.status}`);
      }

      const sttResult = await response.json();
      transcript =
        sttResult.results
          ?.map((r: any) => r.alternatives?.[0]?.transcript ?? '')
          .join(' ')
          .trim() ?? '';
    } catch (err: any) {
      console.error('[STT] Transcription failed:', err);
      throw new HttpsError(
        'internal',
        'Speech-to-text transcription failed. Please try again.',
      );
    }

    if (!transcript) {
      throw new HttpsError(
        'internal',
        'Could not recognize any speech. Please speak more clearly and try again.',
      );
    }

    // ── Evaluate pronunciation ──
    const { wordResults, score, feedback } = evaluatePronunciation(
      targetText,
      transcript,
    );
    const isCorrect = score.overall >= 70;

    // ── Store attempt in Firestore ──
    const attemptData = {
      sentenceId: sentenceId ?? null,
      targetText,
      transcript,
      wordResults,
      score,
      feedback,
      isCorrect,
      attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const attemptRef = await db
      .collection('users')
      .doc(uid)
      .collection('pronunciation_attempts')
      .add(attemptData);

    // Update user-level pronunciation stats
    await db
      .collection('users')
      .doc(uid)
      .set(
        {
          pronunciationStats: {
            totalAttempts: admin.firestore.FieldValue.increment(1),
            lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
            lastScore: score,
          },
        },
        { merge: true },
      );

    return {
      attemptId: attemptRef.id,
      transcript,
      wordResults,
      score,
      feedback,
      isCorrect,
    };
  },
);

// ═══════════════════════════════════════════════
//  3. SEED SENTENCES (admin utility)
// ═══════════════════════════════════════════════

/**
 * Seeds the `pronunciation_sentences` collection with default data.
 * Only callable by authenticated admin users.
 */
export const seedPronunciationSentences = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }

  // Verify admin role
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required.');
  }

  const sentences = [
    {
      text: 'Joe went to play soccer with his friends but he ended up staying at home and play video games',
      difficulty: 'easy',
      order: 1,
      topic: 'daily_life',
      language: 'en',
    },
    {
      text: 'Sophie wanted to study for her exam, but she ended up watching her favorite TV series all evening.',
      difficulty: 'medium',
      order: 2,
      topic: 'daily_life',
      language: 'en',
    },
    {
      text: 'Hannah planned to finish her science project on Saturday, so she spent the afternoon working at the library.',
      difficulty: 'hard',
      order: 3,
      topic: 'academics',
      language: 'en',
    },
    {
      text: 'The weather forecast predicted heavy rain, but the sun came out and everyone enjoyed a beautiful afternoon.',
      difficulty: 'medium',
      order: 4,
      topic: 'weather',
      language: 'en',
    },
    {
      text: 'My neighbor recently adopted a puppy from the shelter, and it has been bringing joy to the entire neighborhood.',
      difficulty: 'hard',
      order: 5,
      topic: 'community',
      language: 'en',
    },
    {
      text: 'She always orders a large coffee with extra cream before heading to work every morning.',
      difficulty: 'easy',
      order: 6,
      topic: 'daily_life',
      language: 'en',
    },
  ];

  const batch = db.batch();
  for (const s of sentences) {
    const ref = db.collection('pronunciation_sentences').doc();
    batch.set(ref, {
      ...s,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  return { success: true, count: sentences.length };
});
