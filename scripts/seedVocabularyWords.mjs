#!/usr/bin/env node
/**
 * scripts/seedVocabularyWords.mjs
 *
 * Idempotent uploader for `data/vocabularySeed.ts` → Firestore
 * `vocabularyWords/{wordId}` collection.
 *
 * Usage:
 *
 *   # 1. Load Firebase + admin credentials into env
 *   set -a; source .env; set +a
 *   export ADMIN_EMAIL=you@example.com
 *   export ADMIN_PASSWORD=...
 *
 *   # 2. Run
 *   node scripts/seedVocabularyWords.mjs
 *
 * The script signs in as `$ADMIN_EMAIL` (must have role==='admin' per the
 * firestore.rules) and upserts all 300 words. Deterministic doc ids mean
 * repeat runs are safe — they overwrite the same docs in place.
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import ts from 'typescript';

// ── Env ───────────────────────────────────────────────────────────────────
const required = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_APP_ID',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('Missing env vars:', missing.join(', '));
  console.error('Tip: `set -a; source .env; set +a` first, then export ADMIN_EMAIL/ADMIN_PASSWORD.');
  process.exit(1);
}

// ── Load seed via TS transpileModule ──────────────────────────────────────
console.log('• Compiling data/vocabularySeed.ts …');
const tsSource = readFileSync('data/vocabularySeed.ts', 'utf8');
const { outputText } = ts.transpileModule(tsSource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    esModuleInterop: true,
  },
});

const dir = mkdtempSync(join(tmpdir(), 'vocab-seed-'));
const compiledPath = join(dir, 'vocabularySeed.mjs');
writeFileSync(compiledPath, outputText);
const { SEED_VOCABULARY_WORDS, SEED_COUNTS } = await import(pathToFileURL(compiledPath).href);
console.log(`  → loaded ${SEED_VOCABULARY_WORDS.length} words`, SEED_COUNTS);

// ── Firebase init ─────────────────────────────────────────────────────────
const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
});

let db;
try {
  // Long-polling avoids issues on flaky networks during a one-shot run.
  db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
} catch {
  db = getFirestore(app);
}

const auth = getAuth(app);

// ── Sign in as admin ──────────────────────────────────────────────────────
console.log(`• Signing in as ${process.env.ADMIN_EMAIL} …`);
let userCred;
try {
  userCred = await signInWithEmailAndPassword(
    auth,
    process.env.ADMIN_EMAIL,
    process.env.ADMIN_PASSWORD,
  );
} catch (e) {
  console.error('  ✗ sign-in failed:', e?.code || e?.message || e);
  console.error('    The signed-in user must have role==="admin" in users/{uid}.');
  process.exit(2);
}
const adminUid = userCred.user.uid;
console.log(`  → signed in as uid=${adminUid}`);

// ── Upsert in batches of 400 (Firestore batch cap is 500) ─────────────────
const CHUNK = 400;
let written = 0;
for (let i = 0; i < SEED_VOCABULARY_WORDS.length; i += CHUNK) {
  const slice = SEED_VOCABULARY_WORDS.slice(i, i + CHUNK);
  const batch = writeBatch(db);
  for (const w of slice) {
    if (!w.id) continue;
    batch.set(
      doc(db, 'vocabularyWords', w.id),
      {
        word: w.word,
        cefrLevel: w.cefrLevel,
        partOfSpeech: w.partOfSpeech,
        definition: w.definition,
        example: w.example ?? null,
        acceptableSynonyms: w.acceptableSynonyms,
        primarySynonym: w.primarySynonym,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    written++;
  }
  await batch.commit();
  console.log(`  • committed batch ${Math.floor(i / CHUNK) + 1} (${written}/${SEED_VOCABULARY_WORDS.length})`);
}

console.log(`✓ Done. Upserted ${written} vocabulary words.`);
process.exit(0);
