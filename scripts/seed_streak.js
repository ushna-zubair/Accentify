#!/usr/bin/env node
/**
 * Seed 10-day streak + rich daily/weekly progress data for a demo user.
 * Uses Firestore REST API authenticated via the Firebase CLI OAuth token.
 */

const https = require('https');
const fs = require('fs');

// ── Config ─────────────────────────────────────────────────────────────────
const PROJECT_ID   = 'accentify-capstone';
const USER_UID     = 'i79w168NnpfWGJWo4NCH42cxMhf2';
const STREAK_DAYS  = 10;
const CLIENT_ID    = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

// ── Helpers ─────────────────────────────────────────────────────────────────

function dateKey(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function isoNow() {
  return new Date().toISOString();
}

// ISO week number helper
function weekKey(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - jan1) / 86400000) + jan1.getDay() + 1) / 7);
  return `week-${d.getFullYear()}-${String(week).padStart(2, '0')}`;
}

// Convert a plain JS value to Firestore REST API field format
function toField(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean')            return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === 'string')             return { stringValue: value };
  if (value instanceof Date)                 return { timestampValue: value.toISOString() };
  if (Array.isArray(value))                  return { arrayValue: { values: value.map(toField) } };
  if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) fields[k] = toField(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

// Wrap an object of plain values into a Firestore document body
function toDocument(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toField(v);
  return { fields };
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

function request(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function refreshToken(refreshTok) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshTok,
    grant_type: 'refresh_token',
  }).toString();

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        const d = JSON.parse(raw);
        if (d.access_token) resolve(d.access_token);
        else reject(new Error('Token refresh failed: ' + JSON.stringify(d)));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// PATCH (merge) a Firestore document via REST API
async function patchDoc(path, data, token) {
  const doc = toDocument(data);
  const fields = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}?${fields}`;
  const res = await request('PATCH', url, doc, token);
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`PATCH ${path} → ${res.status}: ${JSON.stringify(res.body).slice(0,200)}`);
  }
  return res.body;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Get fresh access token
  console.log('Refreshing access token…');
  const configPath = `${process.env.HOME}/.config/configstore/firebase-tools.json`;
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const token = await refreshToken(config.tokens.refresh_token);
  console.log('Token OK.');

  const now = new Date();
  const today = dateKey(0);

  // ── 2. Streak document ────────────────────────────────────────────────────
  console.log('\n[1/4] Writing streak document…');
  await patchDoc(`users/${USER_UID}/progress/streak`, {
    dayStreak: STREAK_DAYS,
    longestStreak: STREAK_DAYS,
    lastActiveDate: today,
    updatedAt: now,
  }, token);
  console.log('  ✓ streak');

  // ── 3. Progress summary ──────────────────────────────────────────────────
  console.log('[2/4] Writing progress summary…');
  await patchDoc(`users/${USER_UID}/progress/summary`, {
    completedLessons: 8,
    totalHours: 3.5,
    totalSessions: STREAK_DAYS,
    totalVocabWords: 42,
    totalPronunciationAttempts: 24,
    lastActiveAt: now,
  }, token);
  console.log('  ✓ summary');

  // ── 4. Daily entries (one per streak day) ────────────────────────────────
  console.log(`[3/4] Writing ${STREAK_DAYS} daily entries…`);

  // Realistic varying data per day
  const dailyTemplates = [
    { lessonsCompleted: 1, pronunciationAttempts: 3, vocabWordsLearned: 5, conversationTurns: 4, practiceMinutes: 18 },
    { lessonsCompleted: 0, pronunciationAttempts: 2, vocabWordsLearned: 4, conversationTurns: 0, practiceMinutes: 8 },
    { lessonsCompleted: 1, pronunciationAttempts: 4, vocabWordsLearned: 6, conversationTurns: 6, practiceMinutes: 25 },
    { lessonsCompleted: 0, pronunciationAttempts: 2, vocabWordsLearned: 3, conversationTurns: 2, practiceMinutes: 12 },
    { lessonsCompleted: 1, pronunciationAttempts: 3, vocabWordsLearned: 5, conversationTurns: 5, practiceMinutes: 20 },
    { lessonsCompleted: 0, pronunciationAttempts: 1, vocabWordsLearned: 2, conversationTurns: 3, practiceMinutes: 9 },
    { lessonsCompleted: 1, pronunciationAttempts: 3, vocabWordsLearned: 5, conversationTurns: 4, practiceMinutes: 22 },
    { lessonsCompleted: 0, pronunciationAttempts: 2, vocabWordsLearned: 3, conversationTurns: 0, practiceMinutes: 7 },
    { lessonsCompleted: 1, pronunciationAttempts: 4, vocabWordsLearned: 6, conversationTurns: 7, practiceMinutes: 28 },
    { lessonsCompleted: 1, pronunciationAttempts: 4, vocabWordsLearned: 3, conversationTurns: 5, practiceMinutes: 24 },
  ];

  // Pronunciation score sets (clarity, accuracy, fluency, overall) per attempt
  const scoreSets = [
    [{ clarity: 72, accuracy: 68, fluency: 70, overall: 70 }, { clarity: 78, accuracy: 75, fluency: 77, overall: 77 }],
    [{ clarity: 65, accuracy: 63, fluency: 66, overall: 65 }],
    [{ clarity: 80, accuracy: 82, fluency: 79, overall: 80 }, { clarity: 84, accuracy: 83, fluency: 82, overall: 83 }, { clarity: 88, accuracy: 87, fluency: 86, overall: 87 }],
    [{ clarity: 70, accuracy: 68, fluency: 71, overall: 70 }],
    [{ clarity: 75, accuracy: 73, fluency: 74, overall: 74 }, { clarity: 82, accuracy: 80, fluency: 81, overall: 81 }],
    [{ clarity: 60, accuracy: 58, fluency: 62, overall: 60 }],
    [{ clarity: 78, accuracy: 76, fluency: 77, overall: 77 }, { clarity: 83, accuracy: 82, fluency: 81, overall: 82 }],
    [{ clarity: 68, accuracy: 66, fluency: 69, overall: 68 }],
    [{ clarity: 85, accuracy: 84, fluency: 83, overall: 84 }, { clarity: 89, accuracy: 88, fluency: 87, overall: 88 }, { clarity: 91, accuracy: 90, fluency: 89, overall: 90 }],
    [{ clarity: 88, accuracy: 87, fluency: 86, overall: 87 }, { clarity: 92, accuracy: 91, fluency: 90, overall: 91 }],
  ];

  for (let i = 0; i < STREAK_DAYS; i++) {
    const dk = dateKey(i);
    const tmpl = dailyTemplates[i];
    const scores = scoreSets[i];
    const entryPath = `users/${USER_UID}/progress/daily/entries/${dk}`;

    await patchDoc(entryPath, {
      date: dk,
      lessonsCompleted: tmpl.lessonsCompleted,
      pronunciationAttempts: tmpl.pronunciationAttempts,
      vocabWordsLearned: tmpl.vocabWordsLearned,
      conversationTurns: tmpl.conversationTurns,
      practiceMinutes: tmpl.practiceMinutes,
      pronunciationScores: scores,
      conversationMetrics: [],
      updatedAt: now,
    }, token);
    console.log(`  ✓ daily/${dk}`);
  }

  // ── 5. Weekly entries (current + previous week) ──────────────────────────
  console.log('[4/4] Writing weekly entries…');

  const weeks = [
    { key: weekKey(0),  weekNum: 1, offset: 0 },
    { key: weekKey(7),  weekNum: 0, offset: 7 },
  ];

  const weeklyData = [
    // Current week (better scores)
    {
      pronunciation: { clarity: 83, soundAccuracy: 81, smoothness: 79, rhythmAndTone: 80 },
      conversation:  { fluency: 75, vocabulary: 72, grammarUsage: 70, turnTaking: 74 },
      overallPerformance: { speechAccuracy: 84, speechFluency: 78, speechConsistency: 80 },
      totalLessonsCompleted: 4,
      totalVocabWords: 20,
    },
    // Previous week
    {
      pronunciation: { clarity: 74, soundAccuracy: 72, smoothness: 70, rhythmAndTone: 71 },
      conversation:  { fluency: 65, vocabulary: 63, grammarUsage: 61, turnTaking: 64 },
      overallPerformance: { speechAccuracy: 74, speechFluency: 68, speechConsistency: 70 },
      totalLessonsCompleted: 3,
      totalVocabWords: 15,
    },
  ];

  // Vocab growth for the last 8 weeks (used by chart)
  const vocabGrowth = [
    { label: 'W1', value: 4 },
    { label: 'W2', value: 7 },
    { label: 'W3', value: 5 },
    { label: 'W4', value: 9 },
    { label: 'W5', value: 6 },
    { label: 'W6', value: 11 },
    { label: 'W7', value: 15 },
    { label: 'W8', value: 20 },
  ];

  for (let wi = 0; wi < weeks.length; wi++) {
    const { key } = weeks[wi];
    const wd = weeklyData[wi];

    // Parse year and weekNumber from key like "week-2026-21"
    const [, yr, wn] = key.match(/week-(\d+)-(\d+)/);
    const weekStartDate = dateKey(weeks[wi].offset + new Date().getDay());

    await patchDoc(`users/${USER_UID}/progress/weekly/entries/${key}`, {
      weekNumber: parseInt(wn),
      year: parseInt(yr),
      weekStartDate,
      pronunciation: wd.pronunciation,
      conversation: wd.conversation,
      vocabularyGrowth: vocabGrowth,
      overallPerformance: wd.overallPerformance,
      totalLessonsCompleted: wd.totalLessonsCompleted,
      totalVocabWords: wd.totalVocabWords,
      updatedAt: now,
    }, token);
    console.log(`  ✓ weekly/${key}`);
  }

  console.log('\n✅ All done! Firestore updated for user ' + USER_UID);
  console.log('   Pull-to-refresh on the home screen to see the 10-day streak.');
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
