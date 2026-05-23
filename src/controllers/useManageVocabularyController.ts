/**
 * useManageVocabularyController.ts
 *
 * Controller for the AdminManageVocabularyScreen. CRUD over `vocabularyWords`
 * + a one-click "Seed default 300 words" action backed by the same canonical
 * data file used by `scripts/seedVocabularyWords.mjs`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAllVocabularyWords,
  countWordsByCefr,
  createVocabularyWord,
  updateVocabularyWord,
  deleteVocabularyWord,
  upsertVocabularyWords,
  type VocabularyWordInput,
} from '../services/vocabularyService';
import type { CefrLevel, VocabularyWord } from '../models/vocabulary';
import { CEFR_ORDER } from '../models/vocabulary';
import { SEED_VOCABULARY_WORDS } from '../../data/vocabularySeed';

export type VocabCefrFilter = 'all' | CefrLevel;

export interface VocabFormState {
  word: string;
  cefrLevel: CefrLevel;
  partOfSpeech: string;
  definition: string;
  example: string;
  primarySynonym: string;
  /** Comma- or newline-separated when typed; service splits before save. */
  acceptableSynonymsText: string;
}

export const EMPTY_FORM: VocabFormState = {
  word: '',
  cefrLevel: 'A1',
  partOfSpeech: 'adjective',
  definition: '',
  example: '',
  primarySynonym: '',
  acceptableSynonymsText: '',
};

const parseSynonyms = (text: string): string[] =>
  text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

const formToInput = (f: VocabFormState): VocabularyWordInput => {
  const synonyms = parseSynonyms(f.acceptableSynonymsText);
  return {
    word: f.word.trim(),
    cefrLevel: f.cefrLevel,
    partOfSpeech: f.partOfSpeech.trim(),
    definition: f.definition.trim(),
    example: f.example.trim() ? f.example.trim() : undefined,
    primarySynonym: f.primarySynonym.trim() || synonyms[0] || '',
    acceptableSynonyms: synonyms,
  };
};

export const wordToForm = (w: VocabularyWord): VocabFormState => ({
  word: w.word,
  cefrLevel: w.cefrLevel,
  partOfSpeech: w.partOfSpeech,
  definition: w.definition,
  example: w.example ?? '',
  primarySynonym: w.primarySynonym,
  acceptableSynonymsText: w.acceptableSynonyms.join(', '),
});

export const useManageVocabularyController = () => {
  const { currentUser } = useAuth();

  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [counts, setCounts] = useState<Record<CefrLevel, number>>({
    A1: 0,
    A2: 0,
    B1: 0,
    B2: 0,
    C1: 0,
    C2: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cefrFilter, setCefrFilter] = useState<VocabCefrFilter>('all');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabularyWord | null>(null);
  const [form, setForm] = useState<VocabFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // ── Reload ─────────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, c] = await Promise.all([
        fetchAllVocabularyWords(),
        countWordsByCefr(),
      ]);
      setWords(list);
      setCounts(c);
    } catch (e) {
      console.error('[ManageVocab] load failed:', e);
      setError(e instanceof Error ? e.message : 'Failed to load words');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // ── Filtering ──────────────────────────────────────────────────────────
  const filteredWords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return words.filter((w) => {
      if (cefrFilter !== 'all' && w.cefrLevel !== cefrFilter) return false;
      if (!q) return true;
      return (
        w.word.toLowerCase().includes(q) ||
        w.primarySynonym.toLowerCase().includes(q) ||
        w.acceptableSynonyms.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [words, cefrFilter, search]);

  // ── Modal control ──────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setEditingWord(null);
    setForm({ ...EMPTY_FORM, cefrLevel: cefrFilter === 'all' ? 'A1' : cefrFilter });
    setModalOpen(true);
  }, [cefrFilter]);

  const openEdit = useCallback((w: VocabularyWord) => {
    setEditingWord(w);
    setForm(wordToForm(w));
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingWord(null);
  }, []);

  const updateForm = useCallback(<K extends keyof VocabFormState>(k: K, v: VocabFormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  // ── Save (create or update) ────────────────────────────────────────────
  const save = useCallback(async (): Promise<boolean> => {
    if (!currentUser?.uid) {
      setError('You must be signed in.');
      return false;
    }
    const input = formToInput(form);
    if (!input.word || !input.definition || input.acceptableSynonyms.length === 0) {
      setError('Word, definition and at least one synonym are required.');
      return false;
    }
    setSaving(true);
    try {
      if (editingWord) {
        await updateVocabularyWord(editingWord.id, input);
      } else {
        await createVocabularyWord(input, currentUser.uid);
      }
      closeModal();
      await reload();
      return true;
    } catch (e) {
      console.error('[ManageVocab] save failed:', e);
      setError(e instanceof Error ? e.message : 'Save failed');
      return false;
    } finally {
      setSaving(false);
    }
  }, [currentUser?.uid, form, editingWord, closeModal, reload]);

  // ── Delete ─────────────────────────────────────────────────────────────
  const remove = useCallback(
    async (wordId: string) => {
      try {
        await deleteVocabularyWord(wordId);
        await reload();
      } catch (e) {
        console.error('[ManageVocab] delete failed:', e);
        setError(e instanceof Error ? e.message : 'Delete failed');
      }
    },
    [reload],
  );

  // ── Seed default vocabulary ───────────────────────────────────────────
  const seedDefaults = useCallback(async () => {
    if (!currentUser?.uid) {
      setSeedMessage('You must be signed in.');
      return;
    }
    setSeeding(true);
    setSeedMessage(null);
    try {
      const { written } = await upsertVocabularyWords(
        SEED_VOCABULARY_WORDS,
        currentUser.uid,
      );
      setSeedMessage(`Seeded ${written} words across CEFR A1–C2.`);
      await reload();
    } catch (e) {
      console.error('[ManageVocab] seed failed:', e);
      setSeedMessage(e instanceof Error ? `Seed failed: ${e.message}` : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  }, [currentUser?.uid, reload]);

  const totalCount = useMemo(
    () => CEFR_ORDER.reduce((s, l) => s + (counts[l] ?? 0), 0),
    [counts],
  );

  return {
    // data
    words,
    filteredWords,
    counts,
    totalCount,
    loading,
    error,
    setError,
    // filtering
    cefrFilter,
    setCefrFilter,
    search,
    setSearch,
    // modal
    modalOpen,
    editingWord,
    form,
    saving,
    openCreate,
    openEdit,
    closeModal,
    updateForm,
    save,
    // remove
    remove,
    // seed
    seeding,
    seedMessage,
    seedDefaults,
    // util
    reload,
  };
};
