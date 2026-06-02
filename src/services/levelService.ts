/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Adam Sabih
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

/**
 * levelService.ts
 *
 * Owns the user's CEFR level (A1..C2) and the auto-promotion logic.
 *
 * ── Firestore layout (reads) ──
 *   users/{uid}                                        — studyPlan.englishLevel + studyPlan.levelChangedAt
 *   users/{uid}/progress/items/entries/{itemKey}       — per-item vocab/pronunciation rolling stats
 *   users/{uid}/progress/attempts/entries/{attemptId}  — every per-attempt record
 *   users/{uid}/progress/daily/entries/{YYYY-MM-DD}    — daily activity (for active-day count)
 *
 * ── Firestore layout (writes) ──
 *   users/{uid}                                        — studyPlan.englishLevel + studyPlan.levelChangedAt
 *   users/{uid}/progress/level                         — denormalised mastery snapshot
 *   users/{uid}/progress/level/entries/{historyId}     — promotion history (matches existing
 *                                                        firestore.rules path `/progress/{docId}/entries/{entryId}`)
 *   users/{uid}/notifications/{id}                     — level-up notification
 *
 * Important: only `pronunciation` and `vocab` activity contributes to the
 * promotion signal. Wavy + Tutor (free-use chat) are deliberately excluded.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit as fsLimit,
  setDoc,
  serverTimestamp,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CEFR_ORDER, type CefrLevel } from '../models/vocabulary';
import { normaliseCefr } from './vocabularyService';

//  CONFIG — single source of truth for thresholds

export const LEVEL_UP_CONFIG = {
  /** Distinct stretch-band words required to be mastered. */
  stretchVocabMastered: 25,
  /** consecutiveCorrect required on a word to count as "mastered". */
  consecutiveCorrectForMastery: 3,
  /** Min mean pronunciation overall % on the rolling window. */
  pronunciationOverallMin: 80,
  /** How many recent attempts the rolling average is computed over. */
  pronunciationWindow: 30,
  /** Distinct active days required in the last 30. */
  activeDaysIn30: 14,
  /** Days that must elapse between two promotions. */
  cooldownDays: 14,
} as const;

export type LevelUpReason =
  | 'stretch_vocab'
  | 'word_pronunciation'
  | 'sentence_pronunciation'
  | 'active_days'
  | 'cooldown'
  | 'at_top';

/**
 * Per-criterion progress toward promotion. Shape is rendered on the Progress
 * screen so the learner can see exactly what's missing.
 */
export interface LevelUpProgress {
  currentLevel: CefrLevel;
  /** null when currentLevel is C2 (top of the ladder). */
  nextLevel: CefrLevel | null;
  /** True iff every gate passed and the level was bumped on this call. */
  promoted: boolean;
  /** True iff every gate passed (whether or not this call did the write). */
  eligible: boolean;
  /** Reasons we did NOT promote (empty when promoted=true). */
  blockingReasons: LevelUpReason[];

  // ── individual metric reads (also persisted for the UI) ──
  stretchVocabMastered: number;
  stretchVocabRequired: number;

  wordPronAvg: number;
  wordPronAttempts: number;
  wordPronRequired: number;

  sentencePronAvg: number;
  sentencePronAttempts: number;
  sentencePronRequired: number;

  activeDays: number;
  activeDaysRequired: number;

  daysSinceLastChange: number | null;
  cooldownRequired: number;
}

/** Return the level immediately above `level`, or null at C2. */
export const nextCefr = (level: CefrLevel): CefrLevel | null => {
  const idx = CEFR_ORDER.indexOf(level);
  if (idx < 0 || idx >= CEFR_ORDER.length - 1) return null;
  return CEFR_ORDER[idx + 1] as CefrLevel;
};

/**
 * Count vocab items at exactly `level` where consecutiveCorrect >= the
 * mastery threshold. Reads `progress/items/entries`.
 */
async function countMasteredStretchVocab(uid: string, level: CefrLevel): Promise<number> {
  try {
    const itemsCol = collection(db, 'users', uid, 'progress', 'items', 'entries');
    const q = query(
      itemsCol,
      where('itemType', '==', 'vocab'),
      where('cefrLevel', '==', level),
      fsLimit(200),
    );
    const snap = await getDocs(q);
    return snap.docs.filter((d) => {
      const v = (d.data().consecutiveCorrect as number | undefined) ?? 0;
      return v >= LEVEL_UP_CONFIG.consecutiveCorrectForMastery;
    }).length;
  } catch (e) {
    console.warn('[levelService] countMasteredStretchVocab failed:', e);
    return 0;
  }
}

/**
 * Read recent pronunciation attempts and compute the rolling mean overall %
 * for the requested itemType. Returns avg=0 when no attempts found.
 */
async function pronunciationRollingAvg(
  uid: string,
  itemType: 'word' | 'sentence',
): Promise<{ avg: number; count: number }> {
  try {
    const attemptsCol = collection(db, 'users', uid, 'progress', 'attempts', 'entries');
    const q = query(
      attemptsCol,
      where('itemType', '==', itemType),
      fsLimit(LEVEL_UP_CONFIG.pronunciationWindow * 2),
    );
    const snap = await getDocs(q);
    const attempts = snap.docs
      .map((d) => d.data() as Record<string, any>)
      .filter((d) => typeof d.overallPct === 'number')
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
      .slice(0, LEVEL_UP_CONFIG.pronunciationWindow);

    if (attempts.length === 0) return { avg: 0, count: 0 };
    const sum = attempts.reduce((s, a) => s + (a.overallPct as number), 0);
    return { avg: Math.round(sum / attempts.length), count: attempts.length };
  } catch (e) {
    console.warn('[levelService] pronunciationRollingAvg failed:', e);
    return { avg: 0, count: 0 };
  }
}

/**
 * Count daily-activity docs in the last 30 days. Reads the keys directly so
 * we don't need a composite index.
 */
async function countActiveDaysLast30(uid: string): Promise<number> {
  try {
    const dailyCol = collection(db, 'users', uid, 'progress', 'daily', 'entries');
    const snap = await getDocs(query(dailyCol, fsLimit(60)));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    let count = 0;
    for (const d of snap.docs) {
      const data = d.data();
      const dateStr = String(data.date ?? d.id);
      const parsed = new Date(dateStr);
      if (!Number.isFinite(parsed.getTime())) continue;
      if (parsed >= cutoff) {
        const hasActivity =
          ((data.practiceItems as number) ?? 0) > 0 ||
          ((data.pronunciationAttempts as number) ?? 0) > 0 ||
          ((data.vocabAttempts as number) ?? 0) > 0;
        if (hasActivity) count++;
      }
    }
    return count;
  } catch (e) {
    console.warn('[levelService] countActiveDaysLast30 failed:', e);
    return 0;
  }
}

/** Days since the last level change, or null when it has never happened. */
async function daysSinceLevelChange(uid: string): Promise<number | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const raw = snap.data()?.studyPlan?.levelChangedAt;
    if (!raw) return null;
    const t =
      raw && typeof raw === 'object' && typeof (raw as any).toDate === 'function'
        ? (raw as Timestamp).toDate().getTime()
        : Date.parse(String(raw));
    if (!Number.isFinite(t)) return null;
    return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
  } catch (e) {
    console.warn('[levelService] daysSinceLevelChange failed:', e);
    return null;
  }
}

//  PERSIST: level snapshot + history

/**
 * Mirror the progress snapshot to `users/{uid}/progress/level` so the
 * Progress screen can show "X/Y stretch words mastered" without re-running
 * the full evaluation on every render.
 */
async function persistLevelSnapshot(uid: string, progress: LevelUpProgress): Promise<void> {
  try {
    const ref = doc(db, 'users', uid, 'progress', 'level');
    await setDoc(
      ref,
      {
        currentLevel: progress.currentLevel,
        nextLevel: progress.nextLevel,
        eligible: progress.eligible,
        promoted: progress.promoted,
        blockingReasons: progress.blockingReasons,
        stretchVocabMastered: progress.stretchVocabMastered,
        stretchVocabRequired: progress.stretchVocabRequired,
        wordPronAvg: progress.wordPronAvg,
        wordPronAttempts: progress.wordPronAttempts,
        wordPronRequired: progress.wordPronRequired,
        sentencePronAvg: progress.sentencePronAvg,
        sentencePronAttempts: progress.sentencePronAttempts,
        sentencePronRequired: progress.sentencePronRequired,
        activeDays: progress.activeDays,
        activeDaysRequired: progress.activeDaysRequired,
        daysSinceLastChange: progress.daysSinceLastChange,
        cooldownRequired: progress.cooldownRequired,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (e) {
    console.warn('[levelService] persistLevelSnapshot failed:', e);
  }
}

/**
 * Commit a level promotion: bump `studyPlan.englishLevel`, stamp
 * `studyPlan.levelChangedAt`, write a history doc, and push an in-app
 * notification.
 */
async function commitPromotion(
  uid: string,
  fromLevel: CefrLevel,
  toLevel: CefrLevel,
): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        studyPlan: {
          englishLevel: toLevel,
          levelChangedAt: serverTimestamp(),
        },
      },
      { merge: true },
    );
  } catch (e) {
    console.warn('[levelService] commitPromotion: profile write failed:', e);
  }

  try {
    // History lives under `entries` so it matches the existing
    // `progress/{docId}/entries/{entryId}` rule in firestore.rules — writing
    // to `progress/level/history/...` would be denied.
    const historyCol = collection(db, 'users', uid, 'progress', 'level', 'entries');
    await addDoc(historyCol, {
      kind: 'level_change',
      fromLevel,
      toLevel,
      direction: 'up',
      changedAt: nowIso,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[levelService] commitPromotion: history write failed:', e);
  }

  try {
    // Field names mirror what NotificationsScreen / useNotificationController
    // expects (see src/controllers/useNotificationController.ts):
    //   - `text` (or `body`) → body copy
    //   - `unread: true` (controller reads `data.unread`, not `data.read`)
    //   - `tab: 'Direct' | 'Overall'` → which tab the item shows under
    //   - `type` → drives icon + colour ('achievement' shows the trophy)
    const notifCol = collection(db, 'users', uid, 'notifications');
    await addDoc(notifCol, {
      title: `You've moved up to ${toLevel}!`,
      text: `Your scores show you're ready for ${toLevel}. Keep going — next stop is ${nextCefr(toLevel) ?? 'mastery'}.`,
      body: `Your scores show you're ready for ${toLevel}. Keep going — next stop is ${nextCefr(toLevel) ?? 'mastery'}.`,
      type: 'achievement',
      tab: 'Direct',
      unread: true,
      kind: 'level_up',
      fromLevel,
      toLevel,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[levelService] commitPromotion: notification write failed:', e);
  }
}

//  PUBLIC: evaluateLevelUp

/**
 * Read every signal, decide whether the user qualifies for the next CEFR
 * level, and (if so) commit the promotion. Always persists a snapshot so the
 * UI can render the "X / Y mastered" bars. Returns the per-criterion state.
 *
 * Safe to call on every exercise completion — it's idempotent: when a gate
 * isn't met or the user is already at C2, it just refreshes the snapshot.
 */
export const evaluateLevelUp = async (uid: string): Promise<LevelUpProgress> => {
  // 1. Resolve the user's current level.
  let currentLevel: CefrLevel = 'A2';
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      const raw = userSnap.data()?.studyPlan?.englishLevel as string | undefined;
      currentLevel = normaliseCefr(raw);
    }
  } catch {
    // Fall through — A2 default.
  }

  const next = nextCefr(currentLevel);

  // Always read activity so the snapshot is fresh even at the top.
  const [stretchMastered, wordRoll, sentenceRoll, activeDays, sinceChange] = await Promise.all([
    next ? countMasteredStretchVocab(uid, next) : Promise.resolve(0),
    pronunciationRollingAvg(uid, 'word'),
    pronunciationRollingAvg(uid, 'sentence'),
    countActiveDaysLast30(uid),
    daysSinceLevelChange(uid),
  ]);

  const blocking: LevelUpReason[] = [];

  if (!next) {
    blocking.push('at_top');
  } else {
    if (stretchMastered < LEVEL_UP_CONFIG.stretchVocabMastered) blocking.push('stretch_vocab');
    if (
      wordRoll.count < LEVEL_UP_CONFIG.pronunciationWindow ||
      wordRoll.avg < LEVEL_UP_CONFIG.pronunciationOverallMin
    )
      blocking.push('word_pronunciation');
    if (
      sentenceRoll.count < LEVEL_UP_CONFIG.pronunciationWindow ||
      sentenceRoll.avg < LEVEL_UP_CONFIG.pronunciationOverallMin
    )
      blocking.push('sentence_pronunciation');
    if (activeDays < LEVEL_UP_CONFIG.activeDaysIn30) blocking.push('active_days');
    if (sinceChange !== null && sinceChange < LEVEL_UP_CONFIG.cooldownDays)
      blocking.push('cooldown');
  }

  const eligible = blocking.length === 0;
  let promoted = false;

  if (eligible && next) {
    try {
      await commitPromotion(uid, currentLevel, next);
      promoted = true;
    } catch (e) {
      console.warn('[levelService] commitPromotion failed:', e);
    }
  }

  const progress: LevelUpProgress = {
    currentLevel: promoted && next ? next : currentLevel,
    nextLevel: promoted && next ? nextCefr(next) : next,
    promoted,
    eligible,
    blockingReasons: blocking,
    stretchVocabMastered: stretchMastered,
    stretchVocabRequired: LEVEL_UP_CONFIG.stretchVocabMastered,
    wordPronAvg: wordRoll.avg,
    wordPronAttempts: wordRoll.count,
    wordPronRequired: LEVEL_UP_CONFIG.pronunciationOverallMin,
    sentencePronAvg: sentenceRoll.avg,
    sentencePronAttempts: sentenceRoll.count,
    sentencePronRequired: LEVEL_UP_CONFIG.pronunciationOverallMin,
    activeDays,
    activeDaysRequired: LEVEL_UP_CONFIG.activeDaysIn30,
    daysSinceLastChange: sinceChange,
    cooldownRequired: LEVEL_UP_CONFIG.cooldownDays,
  };

  await persistLevelSnapshot(uid, progress);
  return progress;
};

//  PUBLIC: read snapshot for the Progress screen

/**
 * Read the most recently persisted snapshot from `progress/level`. Returns
 * null when the user has never triggered an evaluation. The Progress screen
 * calls this on focus and falls back to `evaluateLevelUp` when null.
 */
export const fetchLevelSnapshot = async (uid: string): Promise<LevelUpProgress | null> => {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'progress', 'level'));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      currentLevel: (data.currentLevel ?? 'A2') as CefrLevel,
      nextLevel: (data.nextLevel ?? null) as CefrLevel | null,
      promoted: !!data.promoted,
      eligible: !!data.eligible,
      blockingReasons: (data.blockingReasons ?? []) as LevelUpReason[],
      stretchVocabMastered: data.stretchVocabMastered ?? 0,
      stretchVocabRequired: data.stretchVocabRequired ?? LEVEL_UP_CONFIG.stretchVocabMastered,
      wordPronAvg: data.wordPronAvg ?? 0,
      wordPronAttempts: data.wordPronAttempts ?? 0,
      wordPronRequired: data.wordPronRequired ?? LEVEL_UP_CONFIG.pronunciationOverallMin,
      sentencePronAvg: data.sentencePronAvg ?? 0,
      sentencePronAttempts: data.sentencePronAttempts ?? 0,
      sentencePronRequired: data.sentencePronRequired ?? LEVEL_UP_CONFIG.pronunciationOverallMin,
      activeDays: data.activeDays ?? 0,
      activeDaysRequired: data.activeDaysRequired ?? LEVEL_UP_CONFIG.activeDaysIn30,
      daysSinceLastChange: data.daysSinceLastChange ?? null,
      cooldownRequired: data.cooldownRequired ?? LEVEL_UP_CONFIG.cooldownDays,
    };
  } catch (e) {
    console.warn('[levelService] fetchLevelSnapshot failed:', e);
    return null;
  }
};
