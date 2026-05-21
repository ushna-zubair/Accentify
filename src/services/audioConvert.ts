/**
 * Client wrapper for the convertAudioToWav Cloud Function.
 *
 * The HF pronunciation backend decodes incoming audio via libsndfile, which
 * only supports WAV/FLAC/OGG. Android's MediaRecorder emits AAC-in-m4a and
 * browsers emit Opus-in-WebM — both are silently rejected as "Format not
 * recognised". Inside Expo Go we can't install ffmpeg-kit-react-native to
 * transcode locally, so we round-trip the bytes through a Cloud Function that
 * runs the static ffmpeg binary and hands back a 16 kHz mono 16-bit PCM WAV.
 *
 * iOS already records LinearPCM (`.wav`), so `ensureWavUri` short-circuits and
 * skips the proxy when the source is already WAV.
 */
import { File, Paths } from 'expo-file-system';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../config/firebase';

const functions = getFunctions(app);

const convertAudioToWav = httpsCallable<
  { audioBase64: string; sourceExtension: string },
  { wavBase64: string }
>(functions, 'convertAudioToWav');

export type RecordingEncoding = 'wav' | 'm4a' | 'mp3' | 'webm';

/**
 * Convert the recorded file at `sourceUri` to a 16 kHz mono WAV on the server
 * and return the local URI of the converted file. WAV inputs are returned
 * unchanged. Errors propagate to the caller so they can fall back to whatever
 * UX makes sense (retry, show toast, etc.).
 */
export async function ensureWavUri(
  sourceUri: string,
  encoding: RecordingEncoding,
): Promise<string> {
  if (encoding === 'wav') return sourceUri;

  const sourceFile = new File(sourceUri);
  if (!sourceFile.exists) {
    throw new Error(`Recording file not found: ${sourceUri}`);
  }

  const sourceBase64 = await sourceFile.base64();
  const result = await convertAudioToWav({
    audioBase64: sourceBase64,
    sourceExtension: encoding,
  });
  const wavBase64 = result.data?.wavBase64;
  if (typeof wavBase64 !== 'string' || wavBase64.length === 0) {
    throw new Error('convertAudioToWav returned no audio data.');
  }

  // Unique filename so concurrent attempts can't trample each other and we
  // never reopen a stale converted file from a previous attempt.
  const fileName = `accentify_${Date.now()}_${Math.floor(
    Math.random() * 1_000_000,
  )}.wav`;
  const wavFile = new File(Paths.cache, fileName);
  if (wavFile.exists) {
    wavFile.delete();
  }
  wavFile.create();
  wavFile.write(wavBase64, { encoding: 'base64' });
  return wavFile.uri;
}
