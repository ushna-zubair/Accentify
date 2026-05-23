/**
 * vocabularyService.ts
 *
 * Firestore access for the vocabulary synonym-typing exercise.
 *
 * ── Firestore layout ──
 *   vocabularyWords/{wordId}                       ← top-level curated word bank
 *
 * The legacy lesson-bound `lessons/{id}/vocabPairs/...` subcollection used by
 * the older pronunciation-pair screen is untouched — see lessonService.ts.
 *
 * For per-attempt persistence (progress/attempts/entries, daily aggregates,
 * etc.) the screen calls `recordVocabAttempt` in progressService.ts.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  query,
  where,
  limit as fsLimit,
  orderBy,
  addDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  documentId,
  writeBatch,
  type WriteBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CEFR_ORDER, type CefrLevel, type VocabularyWord } from '../models/vocabulary';

const VOCAB_COL = 'vocabularyWords';

// ═══════════════════════════════════════════════
//  CEFR BAND HELPERS
// ═══════════════════════════════════════════════

/**
 * Normalise an arbitrary englishLevel string (incl. legacy values like
 * "B1 Intermediate" or onboarding's "unsure" sentinel) into a CEFR code.
 * Falls back to A2 when the input doesn't carry a recognisable level.
 */
export const normaliseCefr = (raw: string | undefined | null): CefrLevel => {
  const upper = (raw ?? '').toUpperCase();
  for (const c of CEFR_ORDER) {
    if (upper.startsWith(c)) return c;
  }
  return 'A2';
};

/**
 * Return the band of CEFR levels to serve to a user: target + one below
 * (review) + one above (stretch). Stable order — A1 first, C2 last.
 */
export const targetCefrBand = (userLevel: CefrLevel): CefrLevel[] => {
  const idx = CEFR_ORDER.indexOf(userLevel);
  const lo = Math.max(0, idx - 1);
  const hi = Math.min(CEFR_ORDER.length - 1, idx + 1);
  return CEFR_ORDER.slice(lo, hi + 1) as CefrLevel[];
};

// ═══════════════════════════════════════════════
//  MAPPERS
// ═══════════════════════════════════════════════

const mapWordDoc = (id: string, data: any): VocabularyWord => ({
  id,
  word: String(data.word ?? ''),
  cefrLevel: (data.cefrLevel ?? 'A2') as CefrLevel,
  partOfSpeech: String(data.partOfSpeech ?? ''),
  definition: String(data.definition ?? ''),
  example: data.example ? String(data.example) : undefined,
  acceptableSynonyms: Array.isArray(data.acceptableSynonyms)
    ? data.acceptableSynonyms.map((s: unknown) => String(s))
    : [],
  primarySynonym: String(
    data.primarySynonym ??
      (Array.isArray(data.acceptableSynonyms) ? data.acceptableSynonyms[0] : '') ??
      '',
  ),
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
  createdBy: data.createdBy,
});

// ═══════════════════════════════════════════════
//  READS
// ═══════════════════════════════════════════════

/**
 * Fetch an ordered list of words by their IDs (e.g. from a lesson's
 * `vocabularyWordIds` field). Preserves input order, drops missing IDs.
 * Firestore `in` filter caps at 30 IDs per call, so we batch.
 */
export const fetchWordsByIds = async (ids: string[]): Promise<VocabularyWord[]> => {
  if (ids.length === 0) return [];
  const unique = Array.from(new Set(ids));
  const batches: string[][] = [];
  for (let i = 0; i < unique.length; i += 30) {
    batches.push(unique.slice(i, i + 30));
  }

  const found = new Map<string, VocabularyWord>();
  for (const b of batches) {
    const q = query(collection(db, VOCAB_COL), where(documentId(), 'in', b));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => found.set(d.id, mapWordDoc(d.id, d.data())));
  }
  // Preserve the original (input) order, drop misses.
  return ids.map((id) => found.get(id)).filter((w): w is VocabularyWord => !!w);
};

/**
 * Fetch up to `max` words across the given CEFR levels. If `excludeIds` is
 * provided, those wordIds are filtered out client-side (used to avoid
 * showing recently-seen words). The result is shuffled.
 */
export const fetchWordsForCefrBand = async (
  levels: CefrLevel[],
  max: number,
  excludeIds: ReadonlySet<string> = new Set(),
): Promise<VocabularyWord[]> => {
  if (levels.length === 0) return [];
  // Firestore `in` accepts up to 30 values — CEFR has 6 levels, well within.
  const q = query(
    collection(db, VOCAB_COL),
    where('cefrLevel', 'in', levels),
    fsLimit(Math.max(max * 3, 30)),
  );
  const snap = await getDocs(q);
  const words = snap.docs
    .map((d) => mapWordDoc(d.id, d.data()))
    .filter((w) => !excludeIds.has(w.id));

  // Fisher–Yates shuffle, then take `max`.
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  return words.slice(0, max);
};

/**
 * Fetch a single vocabulary word by id, or null if it doesn't exist.
 */
export const fetchVocabularyWord = async (
  wordId: string,
): Promise<VocabularyWord | null> => {
  const snap = await getDoc(doc(db, VOCAB_COL, wordId));
  if (!snap.exists()) return null;
  return mapWordDoc(snap.id, snap.data());
};

// ═══════════════════════════════════════════════
//  ADMIN WRITES (used by future admin UI / seed script)
// ═══════════════════════════════════════════════

export type VocabularyWordInput = Omit<
  VocabularyWord,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy'
>;

/** Create a new vocabulary word. Returns the assigned id. */
export const createVocabularyWord = async (
  input: VocabularyWordInput,
  adminUid: string,
): Promise<string> => {
  const ref = await addDoc(collection(db, VOCAB_COL), {
    ...input,
    createdBy: adminUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

/** Update an existing vocabulary word. */
export const updateVocabularyWord = async (
  wordId: string,
  patch: Partial<VocabularyWordInput>,
): Promise<void> => {
  await setDoc(
    doc(db, VOCAB_COL, wordId),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true },
  );
};

/** Delete a vocabulary word. */
export const deleteVocabularyWord = async (wordId: string): Promise<void> => {
  await deleteDoc(doc(db, VOCAB_COL, wordId));
};

// ═══════════════════════════════════════════════
//  ADMIN LIST / COUNT
// ═══════════════════════════════════════════════

/** Fetch every vocabulary word, ordered by CEFR then word. Admin-only consumer. */
export const fetchAllVocabularyWords = async (): Promise<VocabularyWord[]> => {
  const snap = await getDocs(query(collection(db, VOCAB_COL), orderBy('cefrLevel'), orderBy('word')));
  return snap.docs.map((d) => mapWordDoc(d.id, d.data()));
};

/** Count of words per CEFR level — used by the admin overview cards. */
export const countWordsByCefr = async (): Promise<Record<CefrLevel, number>> => {
  const counts: Record<CefrLevel, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
  await Promise.all(
    CEFR_ORDER.map(async (level) => {
      try {
        const q = query(collection(db, VOCAB_COL), where('cefrLevel', '==', level));
        const c = await getCountFromServer(q);
        counts[level] = c.data().count;
      } catch {
        counts[level] = 0;
      }
    }),
  );
  return counts;
};

// ═══════════════════════════════════════════════
//  BULK SEED (idempotent upsert via deterministic ids)
// ═══════════════════════════════════════════════

/**
 * Upsert a batch of pre-built VocabularyWord objects into Firestore. The doc
 * id is taken from `word.id` (or generated by the caller as `${level}_${slug}`)
 * so re-running this is idempotent.
 *
 * Firestore batches cap at 500 operations; we chunk to stay safely under that.
 */
export const upsertVocabularyWords = async (
  words: VocabularyWord[],
  adminUid: string,
): Promise<{ written: number }> => {
  const CHUNK = 400;
  let written = 0;
  for (let i = 0; i < words.length; i += CHUNK) {
    const batch: WriteBatch = writeBatch(db);
    const slice = words.slice(i, i + CHUNK);
    for (const w of slice) {
      if (!w.id) continue;
      const ref = doc(db, VOCAB_COL, w.id);
      batch.set(
        ref,
        {
          word: w.word,
          cefrLevel: w.cefrLevel,
          partOfSpeech: w.partOfSpeech,
          definition: w.definition,
          example: w.example ?? null,
          acceptableSynonyms: w.acceptableSynonyms,
          primarySynonym: w.primarySynonym,
          createdBy: adminUid,
          updatedAt: serverTimestamp(),
          // Only set createdAt on first write — use merge to preserve original.
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
      written++;
    }
    await batch.commit();
  }
  return { written };
};
