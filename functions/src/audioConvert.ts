/**
 * On-device audio conversion proxy for the HF pronunciation backend.
 *
 * Why this exists:
 *   The HF Space's audio_service decodes audio via `librosa.load(BytesIO(...))`,
 *   which falls through to libsndfile. libsndfile only understands WAV/FLAC/OGG
 *   /AIFF — it cannot decode AAC (the .m4a files Android's MediaRecorder
 *   produces) or WebM/Opus (what browsers produce). iOS already emits LinearPCM
 *   so it round-trips fine; Android and web hit "Format not recognised" every
 *   time.
 *
 *   We can't fix this on the client inside Expo Go (no custom native modules
 *   like ffmpeg-kit allowed) and we don't control the HF backend, so this CF
 *   wraps the static ffmpeg binary, transcodes whatever the client recorded
 *   into the canonical wav2vec2 input format (16 kHz mono 16-bit PCM WAV),
 *   and returns the bytes. The client then uploads the WAV directly to HF.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegStatic: string = require('ffmpeg-static');

const REGION = 'us-central1';

// onCall payloads are capped around 10 MB. Base64 inflates by ~33%, so cap the
// inbound bytes at 7 MB (≈ 9.3 MB encoded) to leave headroom for the JSON
// envelope. A 30-second 16 kHz mono recording is ~1 MB at AAC and ~1 MB at
// Opus, so 7 MB is generous for the lesson clips we actually see.
const MAX_INPUT_BYTES = 7 * 1024 * 1024;

const SUPPORTED_EXTENSIONS = new Set(['m4a', 'webm', 'mp3', 'wav', '3gp', 'aac', 'mp4']);

interface ConvertRequest {
  audioBase64?: string;
  sourceExtension?: string;
}

interface ConvertResponse {
  wavBase64: string;
}

export const convertAudioToWav = onCall<ConvertRequest, Promise<ConvertResponse>>(
  {
    region: REGION,
    memory: '512MiB',
    timeoutSeconds: 30,
    // ffmpeg binary needs to be writable on cold-start scratch.
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const { audioBase64, sourceExtension } = request.data ?? {};
    if (typeof audioBase64 !== 'string' || audioBase64.length === 0) {
      throw new HttpsError('invalid-argument', 'audioBase64 is required.');
    }

    const ext = (sourceExtension ?? 'm4a').toLowerCase().replace(/^\./, '');
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      throw new HttpsError(
        'invalid-argument',
        `sourceExtension '${ext}' is not supported.`,
      );
    }

    // Decode and bounds-check the audio bytes before touching the filesystem.
    let inputBuffer: Buffer;
    try {
      inputBuffer = Buffer.from(audioBase64, 'base64');
    } catch {
      throw new HttpsError('invalid-argument', 'audioBase64 is not valid base64.');
    }
    if (inputBuffer.length === 0) {
      throw new HttpsError('invalid-argument', 'Audio payload is empty.');
    }
    if (inputBuffer.length > MAX_INPUT_BYTES) {
      throw new HttpsError(
        'invalid-argument',
        `Audio payload exceeds ${MAX_INPUT_BYTES} bytes.`,
      );
    }

    // tmp/<random>-in.<ext> + tmp/<random>-out.wav. Random prefix so concurrent
    // invocations on the same instance can't stomp each other's files.
    const id = crypto.randomBytes(8).toString('hex');
    const inputPath = path.join(os.tmpdir(), `${id}-in.${ext}`);
    const outputPath = path.join(os.tmpdir(), `${id}-out.wav`);

    try {
      await fs.promises.writeFile(inputPath, inputBuffer);

      await new Promise<void>((resolve, reject) => {
        // -ar 16000 → 16 kHz   (wav2vec2 input rate)
        // -ac 1     → mono     (wav2vec2 expects single channel)
        // -c:a pcm_s16le → 16-bit signed little-endian PCM (canonical WAV)
        const proc = spawn(ffmpegStatic, [
          '-y',
          '-hide_banner',
          '-loglevel', 'error',
          '-i', inputPath,
          '-ar', '16000',
          '-ac', '1',
          '-c:a', 'pcm_s16le',
          outputPath,
        ]);
        let stderr = '';
        proc.stderr.on('data', (d) => {
          stderr += d.toString();
        });
        proc.on('error', (err) => reject(err));
        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(
              new Error(
                `ffmpeg exited with code ${code}: ${stderr.slice(0, 500)}`,
              ),
            );
          }
        });
      });

      const wavBuffer = await fs.promises.readFile(outputPath);
      return { wavBase64: wavBuffer.toString('base64') };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Conversion failed.';
      throw new HttpsError('internal', `Audio conversion failed: ${message}`);
    } finally {
      // Best-effort cleanup. Errors here mean the file wasn't created — fine.
      await fs.promises.unlink(inputPath).catch(() => undefined);
      await fs.promises.unlink(outputPath).catch(() => undefined);
    }
  },
);
