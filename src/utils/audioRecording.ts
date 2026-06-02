/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Muhammad Ali
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

/**
 * Recording options tuned for the Accentify (wav2vec2) backend.
 *
 * wav2vec2 expects 16 kHz mono PCM. We get as close as each platform allows:
 *   - iOS  → LinearPCM in a .wav container (lossless, ideal input)
 *   - Android → AAC in .m4a (Android's MediaRecorder cannot produce WAV; the
 *               server-side librosa decoder handles m4a fine when the audio is
 *               16 kHz mono)
 *   - Web  → webm/opus (unchanged from expo-audio defaults)
 *
 * Using these values fixes two prior issues: (1) Android sometimes producing
 * stereo 44.1 kHz files the server had to downmix, and (2) iOS sending lossy
 * AAC when the model prefers raw PCM.
 */
import { IOSOutputFormat, AudioQuality } from 'expo-audio';
import type { RecordingOptions } from 'expo-audio';

export const WAV2VEC2_RECORDING_OPTIONS: RecordingOptions = {
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  android: {
    // Android MediaRecorder cannot output WAV/LPCM, so we record m4a and let
    // the server decode it. The recording URI ends in .m4a on Android (the
    // top-level extension above is overridden by this block's extension).
    extension: '.m4a',
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
    sampleRate: 16000,
    audioSource: 'voice_recognition',
  },
  ios: {
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    sampleRate: 16000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};
