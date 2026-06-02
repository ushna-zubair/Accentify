/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Adam Sabih
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

/**
 * Persistent storage for the two AI chat surfaces (Wavy Chat + Tutor).
 *
 * - Storage is per-user — falls back to `guest` when no Firebase uid is
 *   available — so a sign-out / sign-in doesn't leak history between
 *   accounts on the same device.
 * - History is capped at `MAX_MESSAGES` per chat so AsyncStorage never grows
 *   without bound on a long-lived install.
 * - Tutor messages reference cache-directory audio files. The OS may evict
 *   those at any time, so `loadTutorHistory` validates each URI on load and
 *   strips the reference when the file is gone (the text stays — the
 *   replay button just disappears for that bubble).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import type { WavyChatMessage } from '../controllers/useWavyChatController';
import type { TutorMessage } from '../controllers/useTutorChatController';

const MAX_MESSAGES = 100;

const wavyKey = (uid: string | null | undefined): string =>
  `accentify.chat.wavy.v1.${uid ?? 'guest'}`;
const tutorKey = (uid: string | null | undefined): string =>
  `accentify.chat.tutor.v1.${uid ?? 'guest'}`;

export async function loadWavyHistory(uid: string | null | undefined): Promise<WavyChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(wavyKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as WavyChatMessage[];
  } catch (e) {
    console.warn('[chatStorage] loadWavyHistory failed:', e);
    return [];
  }
}

export async function saveWavyHistory(
  uid: string | null | undefined,
  messages: WavyChatMessage[],
): Promise<void> {
  try {
    const trimmed = messages.slice(-MAX_MESSAGES);
    await AsyncStorage.setItem(wavyKey(uid), JSON.stringify(trimmed));
  } catch (e) {
    console.warn('[chatStorage] saveWavyHistory failed:', e);
  }
}

export async function clearWavyHistory(uid: string | null | undefined): Promise<void> {
  try {
    await AsyncStorage.removeItem(wavyKey(uid));
  } catch (e) {
    console.warn('[chatStorage] clearWavyHistory failed:', e);
  }
}

/** Returns true if a local file URI still exists on disk. */
function audioFileExists(uri: string | undefined): boolean {
  if (!uri) return false;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

export async function loadTutorHistory(uid: string | null | undefined): Promise<TutorMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(tutorKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Strip dead audioUris so the UI's replay button doesn't show on bubbles
    // whose WAV the OS already evicted from cache.
    return (parsed as TutorMessage[]).map((m) =>
      m.audioUri && !audioFileExists(m.audioUri) ? { ...m, audioUri: undefined } : m,
    );
  } catch (e) {
    console.warn('[chatStorage] loadTutorHistory failed:', e);
    return [];
  }
}

export async function saveTutorHistory(
  uid: string | null | undefined,
  messages: TutorMessage[],
): Promise<void> {
  try {
    const trimmed = messages.slice(-MAX_MESSAGES);
    await AsyncStorage.setItem(tutorKey(uid), JSON.stringify(trimmed));
  } catch (e) {
    console.warn('[chatStorage] saveTutorHistory failed:', e);
  }
}

export async function clearTutorHistory(uid: string | null | undefined): Promise<void> {
  try {
    await AsyncStorage.removeItem(tutorKey(uid));
  } catch (e) {
    console.warn('[chatStorage] clearTutorHistory failed:', e);
  }
}
