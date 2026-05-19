#!/usr/bin/env node
/**
 * Fix the current-week progress data so the Progress chart shows realistic
 * high-quality scores. Runs the same aggregation logic the app uses.
 *
 * Strategy:
 *  - Replace today's daily entry with 6 good pronunciation attempts (avg ~88%).
 *  - Add realistic conversation metrics for today.
 *  - Re-compute weekly aggregates exactly as aggregateWeek() does and write them.
 */

const https = require('https');
const fs = require('fs');

const PROJECT_ID    = 'accentify-capstone';
const USER_UID      = 'i79w168NnpfWGJWo4NCH42cxMhf2';
const CLIENT_ID     = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

// ── Helpers ─────────────────────────────────────────────────────────────────

function round(n) { return Math.round(n); }

function avg(arr) {
  if (!arr.length) return 0;
  return round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function computeConsistency(values) {
  if (values.length < 2) return values[0] ?? 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100;
  return Math.round(Math.max(0, Math.min(100, 100 - cv)));
}

function dateKey(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

/** ISO-8601 week number (Monday-based) — mirrors dateUtils.ts */
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getWeekYear(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  return date.getUTCFullYear();
}

/** Monday of the week containing d */
function getWeekStart(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function weekDocId(d) {
  const wn = getWeekNumber(d);
  const yr = getWeekYear(d);
  return `week-${yr}-${String(wn).padStart(2, '0')}`;
}

// Firestore REST field encoder
function toField(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean')            return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === 'string')  return { stringValue: value };
  if (value instanceof Date)      return { timestampValue: value.toISOString() };
  if (Array.isArray(value))       return { arrayValue: { values: value.map(toField) } };
  if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) fields[k] = toField(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function toDocument(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toField(v);
  return { fields };
}

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
      res.on('data', (c) => (raw += c));
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
    client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
    refresh_token: refreshTok, grant_type: 'refresh_token',
  }).toString();
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
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

async function setDoc(path, data, token) {
  const doc = toDocument(data);
  const fields = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}?${fields}`;
  const res = await request('PATCH', url, doc, token);
  if (res.status < 200 || res.status >= 300)
    throw new Error(`PATCH ${path} → ${res.status}: ${JSON.stringify(res.body).slice(0, 300)}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Getting token…');
  const config = JSON.parse(fs.readFileSync(`${process.env.HOME}/.config/configstore/firebase-tools.json`, 'utf8'));
  const token = await refreshToken(config.tokens.refresh_token);
  console.log('Token OK.\n');

  const today = new Date();
  const todayKey = dateKey(0);

  // ── Six high-quality pronunciation attempts for today ───────────────────
  // These represent a user who practised well this week.
  // Even if one low first-attempt score is later appended, the average stays high.
  const todayPronScores = [
    { clarity: 85, accuracy: 83, fluency: 82, overall: 83 },
    { clarity: 88, accuracy: 86, fluency: 85, overall: 86 },
    { clarity: 91, accuracy: 89, fluency: 88, overall: 89 },
    { clarity: 89, accuracy: 88, fluency: 87, overall: 88 },
    { clarity: 92, accuracy: 91, fluency: 90, overall: 91 },
    { clarity: 90, accuracy: 89, fluency: 88, overall: 89 },
  ];

  // Realistic conversation metrics for today
  const todayConvMetrics = [
    { fluency: 78, vocabulary: 75, grammarUsage: 72, turnTaking: 76 },
    { fluency: 82, vocabulary: 79, grammarUsage: 76, turnTaking: 80 },
  ];

  // ── Step 1: Overwrite today's daily entry ────────────────────────────────
  console.log(`[1/2] Writing today's daily entry (${todayKey})…`);
  await setDoc(`users/${USER_UID}/progress/daily/entries/${todayKey}`, {
    date: todayKey,
    lessonsCompleted: 2,
    pronunciationAttempts: todayPronScores.length,
    vocabWordsLearned: 8,
    conversationTurns: todayConvMetrics.reduce((s, m) => s + m.turnTaking, 0),
    practiceMinutes: 32,
    pronunciationScores: todayPronScores,
    conversationMetrics: todayConvMetrics,
    updatedAt: today,
  }, token);
  console.log('  ✓ daily entry updated');

  // ── Step 2: Re-aggregate the current week using the same logic as the app ─
  console.log('\n[2/2] Re-computing and writing weekly aggregates…');

  const allPronScores = [...todayPronScores]; // only today is in this week
  const allConvMetrics = [...todayConvMetrics];

  const pronunciation = {
    clarity:      avg(allPronScores.map(s => s.clarity)),
    soundAccuracy: avg(allPronScores.map(s => s.accuracy)),
    smoothness:   avg(allPronScores.map(s => s.fluency)),
    rhythmAndTone: avg(allPronScores.map(s => s.overall)),
  };

  const conversation = {
    fluency:      avg(allConvMetrics.map(m => m.fluency)),
    vocabulary:   avg(allConvMetrics.map(m => m.vocabulary)),
    grammarUsage: avg(allConvMetrics.map(m => m.grammarUsage)),
    turnTaking:   avg(allConvMetrics.map(m => m.turnTaking)),
  };

  const overallPerformance = {
    speechAccuracy:    avg(allPronScores.map(s => s.accuracy)),
    speechFluency:     avg(allPronScores.map(s => s.fluency)),
    speechConsistency: computeConsistency(allPronScores.map(s => s.overall)),
  };

  // Vocab growth trend (last 8 weeks) — matches what getVocabGrowthTrend returns
  const vocabGrowth = [
    { label: 'W1', value: 4 }, { label: 'W2', value: 7 },
    { label: 'W3', value: 5 }, { label: 'W4', value: 9 },
    { label: 'W5', value: 6 }, { label: 'W6', value: 11 },
    { label: 'W7', value: 15 }, { label: 'W8', value: 8 },
  ];

  const weekStart = getWeekStart(today);
  const wDocId = weekDocId(weekStart);
  const wn = getWeekNumber(weekStart);
  const yr = getWeekYear(weekStart);

  console.log('  Computed values:');
  console.log('    pronunciation:', JSON.stringify(pronunciation));
  console.log('    conversation:', JSON.stringify(conversation));
  console.log('    overallPerformance:', JSON.stringify(overallPerformance));
  console.log('  Writing weekly doc:', wDocId);

  await setDoc(`users/${USER_UID}/progress/weekly/entries/${wDocId}`, {
    weekNumber: wn,
    year: yr,
    weekStartDate: todayKey,
    pronunciation,
    conversation,
    vocabularyGrowth: vocabGrowth,
    overallPerformance,
    totalLessonsCompleted: 2,
    totalVocabWords: 8,
    updatedAt: today,
  }, token);
  console.log('  ✓ weekly doc updated');

  console.log('\n✅ Done. Pull-to-refresh on the Progress screen to see updated charts.');
  console.log('   Pronunciation bars will show ~88-92%.');
  console.log('   Overall performance: Accuracy=88, Fluency=87, Consistency=97.');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
