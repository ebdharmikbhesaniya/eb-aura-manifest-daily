import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';
import ffmpegPath from 'ffmpeg-static';

const execFileAsync = promisify(execFile);

/**
 * The bundled seamless loop. Placeholder now; the licensed track drops in at the
 * same path later. `__dirname` is `dist/generation` in prod and `src/generation`
 * under ts-jest — both resolve up two to `<backend>/assets/ambient`.
 */
export const AMBIENT_BED_PATH = join(
  __dirname,
  '..',
  '..',
  'assets',
  'ambient',
  'ambient-loop.mp3',
);

/**
 * FFmpeg args to overlay a looped, ducked ambient bed under the voice.
 *
 * `-stream_loop -1` loops the bed to any length; `amix duration=first` trims it
 * to the voice. The bed is dropped to volume=0.22 then sidechain-ducked by the
 * voice so speech always sits on top; `normalize=0` keeps the voice at its own
 * level. Output matches the voice output: mp3 / stereo / 44.1kHz / 128k.
 */
export function buildFfmpegArgs(voicePath: string, bedPath: string, outPath: string): string[] {
  const filter =
    '[1:a]volume=0.22[bedlow];' +
    '[bedlow][0:a]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=600[duck];' +
    '[0:a][duck]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mix]';

  return [
    '-y',
    '-i',
    voicePath,
    '-stream_loop',
    '-1',
    '-i',
    bedPath,
    '-filter_complex',
    filter,
    '-map',
    '[mix]',
    '-ac',
    '2',
    '-ar',
    '44100',
    '-b:a',
    '128k',
    '-f',
    'mp3',
    outPath,
  ];
}

@Injectable()
export class AudioMixService {
  /**
   * Overlays the ambient bed under the voice and returns the mixed mp3.
   * Best-effort at the call site — this throws on any FFmpeg failure and the
   * caller (generation) swallows it, leaving the moment voice-only.
   */
  async mix(voice: Buffer): Promise<Buffer> {
    if (!ffmpegPath) throw new Error('ffmpeg-static binary not resolved');

    const dir = await mkdtemp(join(tmpdir(), 'aura-mix-'));
    const voicePath = join(dir, `${randomUUID()}.mp3`);
    const outPath = join(dir, `${randomUUID()}.mp3`);
    try {
      await writeFile(voicePath, voice);
      await execFileAsync(ffmpegPath, buildFfmpegArgs(voicePath, AMBIENT_BED_PATH, outPath), {
        maxBuffer: 64 * 1024 * 1024,
      });
      return await readFile(outPath);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
