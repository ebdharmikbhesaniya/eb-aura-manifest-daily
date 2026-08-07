# Ambient Music (Server-Side Bake) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bake a soft, looping ambient music bed under the voice into a second MP3 at generation time, store it alongside the voice-only file, and let the app play whichever the user's toggle selects — one file, one player.

**Architecture:** The backend, right after ElevenLabs returns the voice MP3, runs FFmpeg (`ffmpeg-static`) to overlay a looped, ducked ambient bed and uploads a second file to `moments.audio_music_path`. The voice-only `audio_path`/`word_timings`/`duration_ms` are untouched. The mobile player picks its single source (`music` vs `voice`) from a persisted `ambientEnabled` flag. New moments only; existing rows keep `audio_music_path = null` and play voice-only.

**Tech Stack:** NestJS + `ffmpeg-static` (backend), Supabase Storage + Postgres, React Native/Expo + `expo-audio` + Zustand + MMKV (mobile), pnpm/turbo monorepo, jest.

## Global Constraints

- **Voice-only path is invariant.** `audio_path`, `word_timings`, `duration_ms`, QA, and the existing player behaviour never change. Music is additive only.
- **Best-effort mix.** A mix/FFmpeg failure logs and leaves `audio_music_path` null; the job still succeeds with the voice. Music must never block, delay, or fail generation.
- **New moments only.** No backfill in this work.
- **Moments only.** No ambient in the Letter.
- **Default ON**, toggleable in Settings, persisted in MMKV.
- **Output format matches the voice:** MP3, 44.1 kHz, stereo, 128 kbps.
- **Commands:** run from repo root. Backend tests: `pnpm --filter @aura/backend test <file>`. Mobile tests: `pnpm --filter @aura/mobile test <file>`. Typecheck: `pnpm --filter @aura/<pkg> typecheck`.

---

### Task 1: Add `audio_music_path` to the schema and shared types

**Files:**

- Create: `supabase/migrations/20260807000000_moment_audio_music.sql`
- Modify: `packages/shared/src/types/database.types.ts` (moments `Row`/`Insert`/`Update`)

**Interfaces:**

- Produces: `moments.audio_music_path: string | null` — read by mobile `toPlayable`, written by backend `persist`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260807000000_moment_audio_music.sql`:

```sql
-- Ambient music bed: a second, voice+music MP3 stored alongside the voice-only
-- audio_path. Nullable — pre-existing moments and any moment whose best-effort
-- mix failed simply have no music file and play voice-only.
alter table public.moments
  add column audio_music_path text;

comment on column public.moments.audio_music_path is
  'Storage path to the voice+ambient-bed MP3 (audio/{user}/{moment}-music.mp3). Null = play voice-only (audio_path).';
```

- [ ] **Step 2: Add the column to the generated types by hand**

The `db:types` generator needs a live DB; to keep this task self-contained, patch `packages/shared/src/types/database.types.ts` directly. In the `moments` table block, add `audio_music_path` right after each `audio_path` line — there are three (`Row`, `Insert`, `Update`):

In `Row` (after `audio_path: string | null;`):

```ts
audio_music_path: string | null;
```

In `Insert` (after `audio_path?: string | null;`):

```ts
          audio_music_path?: string | null;
```

In `Update` (after `audio_path?: string | null;`):

```ts
          audio_music_path?: string | null;
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @aura/shared typecheck`
Expected: PASS (no errors).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260807000000_moment_audio_music.sql packages/shared/src/types/database.types.ts
git commit -m "feat(db): moments.audio_music_path for the ambient bed file"
```

> **Execution note:** apply the migration to the remote Supabase before backend runs write the column — `supabase db push` if the project is linked, or run the SQL in the Supabase SQL editor. The generation update in Task 4 will otherwise fail on an unknown column.

---

### Task 2: Placeholder loop asset + `buildFfmpegArgs` (pure)

**Files:**

- Create: `apps/backend/assets/ambient/ambient-loop.mp3` (placeholder)
- Create: `apps/backend/src/generation/audio-mix.service.ts`
- Test: `apps/backend/src/generation/audio-mix.service.spec.ts`
- Modify: `apps/backend/package.json` (add `ffmpeg-static`)

**Interfaces:**

- Produces: `buildFfmpegArgs(voicePath: string, bedPath: string, outPath: string): string[]` — the exact FFmpeg argument vector. Consumed by `mix()` (Task 3) and the unit test.
- Produces: `AMBIENT_BED_PATH: string` — absolute path to the bundled loop.

- [ ] **Step 1: Add the FFmpeg binary dependency**

Run: `pnpm --filter @aura/backend add ffmpeg-static`
Expected: `ffmpeg-static` in `apps/backend/package.json` dependencies.

- [ ] **Step 2: Create a placeholder ambient loop**

Generate a short, seamless, calm placeholder with FFmpeg (a low sine pad with slow tremolo — obviously a placeholder, replaced by the licensed track later at the same path):

```bash
mkdir -p apps/backend/assets/ambient
node -e "const p=require('ffmpeg-static');require('child_process').execFileSync(p,['-y','-f','lavfi','-i','sine=frequency=110:duration=30','-af','tremolo=f=0.15:d=0.6,volume=0.5,afade=t=in:st=0:d=2,afade=t=out:st=28:d=2','-ac','2','-ar','44100','-b:a','128k','apps/backend/assets/ambient/ambient-loop.mp3'],{stdio:'inherit'})"
ls -la apps/backend/assets/ambient/ambient-loop.mp3
```

Expected: a ~30 s MP3 exists (< ~1 MB).

- [ ] **Step 3: Write the failing test for `buildFfmpegArgs`**

Create `apps/backend/src/generation/audio-mix.service.spec.ts`:

```ts
import { buildFfmpegArgs } from './audio-mix.service';

describe('buildFfmpegArgs', () => {
  const args = buildFfmpegArgs('/tmp/voice.mp3', '/bed/ambient-loop.mp3', '/tmp/out.mp3');

  it('reads the voice first, then loops the bed', () => {
    expect(args).toEqual([
      '-y',
      '-i',
      '/tmp/voice.mp3',
      '-stream_loop',
      '-1',
      '-i',
      '/bed/ambient-loop.mp3',
      '-filter_complex',
      expect.stringContaining('sidechaincompress'),
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
      '/tmp/out.mp3',
    ]);
  });

  it('trims the mix to the voice length and does not renormalize the voice', () => {
    const graph = args[args.indexOf('-filter_complex') + 1];
    expect(graph).toContain('duration=first');
    expect(graph).toContain('normalize=0');
    expect(graph).toContain('volume=0.22');
  });
});
```

- [ ] **Step 4: Run it to confirm it fails**

Run: `pnpm --filter @aura/backend test audio-mix.service`
Expected: FAIL — `buildFfmpegArgs` is not exported.

- [ ] **Step 5: Implement `buildFfmpegArgs` and the asset path**

Create `apps/backend/src/generation/audio-mix.service.ts`:

```ts
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { Injectable, Logger } from '@nestjs/common';
import ffmpegPath from 'ffmpeg-static';

const execFileAsync = promisify(execFile);

/** The bundled seamless loop. Placeholder now; licensed track drops in here. */
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
 * `-stream_loop -1` loops the bed to any length; `amix duration=first` trims to
 * the voice. The bed is dropped to volume=0.22 then sidechain-ducked by the
 * voice so speech always sits on top; `normalize=0` keeps the voice at its own
 * level. Output matches the voice: mp3 / 44.1kHz / 128k.
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
```

- [ ] **Step 6: Run the test to confirm it passes**

Run: `pnpm --filter @aura/backend test audio-mix.service`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/package.json pnpm-lock.yaml apps/backend/assets/ambient/ambient-loop.mp3 apps/backend/src/generation/audio-mix.service.ts apps/backend/src/generation/audio-mix.service.spec.ts
git commit -m "feat(backend): ffmpeg-static + buildFfmpegArgs + placeholder ambient loop"
```

---

### Task 3: `AudioMixService.mix()` — spawn FFmpeg, return the mixed Buffer

**Files:**

- Modify: `apps/backend/src/generation/audio-mix.service.ts`
- Test: `apps/backend/src/generation/audio-mix.service.spec.ts`

**Interfaces:**

- Consumes: `buildFfmpegArgs`, `AMBIENT_BED_PATH` (Task 2).
- Produces: `AudioMixService.mix(voice: Buffer): Promise<Buffer>` — the voice+bed MP3. Throws on any FFmpeg failure. Consumed by `GenerationService.persist` (Task 4).

- [ ] **Step 1: Write the failing integration test**

Append to `apps/backend/src/generation/audio-mix.service.spec.ts`:

```ts
import { execFileSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

import { AudioMixService } from './audio-mix.service';

describe('AudioMixService.mix', () => {
  // A real 2s spoken-ish tone stands in for the voice mp3.
  function tinyVoiceMp3(): Buffer {
    return execFileSync(
      ffmpegPath as string,
      [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=300:duration=2',
        '-b:a',
        '128k',
        '-f',
        'mp3',
        'pipe:1',
      ],
      { maxBuffer: 10 * 1024 * 1024 },
    );
  }

  it('returns a non-empty mp3 Buffer with the bed baked in', async () => {
    const svc = new AudioMixService();
    const out = await svc.mix(tinyVoiceMp3());
    expect(Buffer.isBuffer(out)).toBe(true);
    expect(out.length).toBeGreaterThan(1000); // real audio, not empty
    // ID3/MPEG frame magic — it is an mp3, not an error blob.
    const head = out.subarray(0, 3).toString('binary');
    expect(head === 'ID3' || (out[0] === 0xff && (out[1] & 0xe0) === 0xe0)).toBe(true);
  }, 30000);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter @aura/backend test audio-mix.service`
Expected: FAIL — `AudioMixService` has no `mix`.

- [ ] **Step 3: Implement `mix()`**

Add to `apps/backend/src/generation/audio-mix.service.ts`:

```ts
@Injectable()
export class AudioMixService {
  private readonly logger = new Logger(AudioMixService.name);

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
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm --filter @aura/backend test audio-mix.service`
Expected: PASS (both describe blocks).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/generation/audio-mix.service.ts apps/backend/src/generation/audio-mix.service.spec.ts
git commit -m "feat(backend): AudioMixService.mix bakes the ambient bed under the voice"
```

---

### Task 4: Upload the music file and wire the best-effort mix into generation

**Files:**

- Modify: `apps/backend/src/generation/storage.service.ts`
- Modify: `apps/backend/src/generation/generation.service.ts` (constructor + `persist`, ~line 358)
- Modify: `apps/backend/src/generation/generation.module.ts` (provide `AudioMixService`)
- Test: `apps/backend/src/generation/generation.service.spec.ts`

**Interfaces:**

- Consumes: `AudioMixService.mix` (Task 3), `moments.audio_music_path` (Task 1).
- Produces: `StorageService.uploadMomentMusic(userId, momentId, audio): Promise<string>`.

- [ ] **Step 1: Add `uploadMomentMusic` to storage**

In `apps/backend/src/generation/storage.service.ts`, after `uploadMomentAudio`:

```ts
  /** Uploads the voice+bed mp3, returns its path (persisted to `moments.audio_music_path`). */
  async uploadMomentMusic(userId: string, momentId: string, audio: Buffer): Promise<string> {
    const path = `${userId}/${momentId}-music.mp3`;

    const { error } = await this.supabase.storage.from(AUDIO_BUCKET).upload(path, audio, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

    if (error) throw new Error(`Music upload failed: ${error.message}`);
    return path;
  }
```

- [ ] **Step 2: Write the failing generation tests**

In `apps/backend/src/generation/generation.service.spec.ts`, provide a mock `AudioMixService` in the testing module (alongside the other providers around line 97) and add its import:

```ts
import { AudioMixService } from './audio-mix.service';
```

In the providers array add:

```ts
        { provide: AudioMixService, useValue: { mix } },
```

Declare and reset the mock near the other `jest.fn()`s (e.g. beside `upload`):

```ts
let mix: jest.Mock;
// in beforeEach:
mix = jest.fn().mockResolvedValue(Buffer.from('mixed-bytes'));
```

Then add two tests in the spoken-audio describe block (near the existing `audio_path` assertions):

```ts
it('stores a music file for a spoken moment', async () => {
  // (arrange a normal spoken-artifact run as the existing happy-path test does)
  await runJob();
  expect(mix).toHaveBeenCalledTimes(1);
  expect(written().audio_music_path).toBe('user-1/moment-1-music.mp3');
});

it('finishes voice-only when the mix fails (best-effort)', async () => {
  mix.mockRejectedValue(new Error('ffmpeg exploded'));
  await runJob();
  expect(written().status).toBe('ready');
  expect(written().audio_path).toBe('user-1/moment-1.mp3');
  expect(written().audio_music_path ?? null).toBeNull();
});
```

> Match `runJob()`/`written()` to the spec's existing helpers (see the current happy-path spoken test around line 153). If the happy path writes `audio_path: 'user-1/moment-1.mp3'`, the music path is the same id with a `-music` suffix.

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `pnpm --filter @aura/backend test generation.service`
Expected: FAIL — `AudioMixService` unknown to the module / `audio_music_path` never written.

- [ ] **Step 4: Provide `AudioMixService` in the module**

In `apps/backend/src/generation/generation.module.ts`, import it and add to `providers`:

```ts
import { AudioMixService } from './audio-mix.service';
```

```ts
  providers: [GenerationService, JobsService, PromptService, StorageService, CreditsService, AudioMixService],
```

- [ ] **Step 5: Inject it and add the best-effort mix in `persist`**

In `apps/backend/src/generation/generation.service.ts` constructor, add after `storage`:

```ts
    private readonly audioMix: AudioMixService,
```

Import at top:

```ts
import { AudioMixService } from './audio-mix.service';
```

Replace the spoken-artifact update block (lines ~358-371) so the voice write is unchanged and the music is best-effort:

```ts
const voiceId = this.config.get('ELEVENLABS_VOICE_ID', { infer: true }) ?? 'default';
const synth = await this.tts.synthesize({ text: artifact.body, voiceId });
const audioPath = await this.storage.uploadMomentAudio(job.user_id, moment.id, synth.audio);

// Best-effort ambient bed: a mix or upload failure must never fail the job.
let musicPath: string | null = null;
try {
  const mixed = await this.audioMix.mix(synth.audio);
  musicPath = await this.storage.uploadMomentMusic(job.user_id, moment.id, mixed);
} catch (err) {
  this.logger.warn(`ambient mix skipped for ${moment.id}: ${(err as Error).message}`);
}

await this.supabase
  .from('moments')
  .update({
    status: 'ready',
    audio_path: audioPath,
    audio_music_path: musicPath,
    word_timings: synth.wordTimings as unknown as Json,
    duration_ms: synth.durationMs,
  })
  .eq('id', moment.id);
```

- [ ] **Step 6: Run the tests to confirm they pass**

Run: `pnpm --filter @aura/backend test generation.service`
Expected: PASS (including the existing audio tests, unchanged).

- [ ] **Step 7: Typecheck the backend**

Run: `pnpm --filter @aura/backend typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/generation/storage.service.ts apps/backend/src/generation/generation.service.ts apps/backend/src/generation/generation.module.ts apps/backend/src/generation/generation.service.spec.ts
git commit -m "feat(backend): store best-effort voice+ambient mix as audio_music_path"
```

---

### Task 5: Persisted `ambientEnabled` in the player store

**Files:**

- Modify: `apps/mobile/src/lib/storage.ts`
- Modify: `apps/mobile/src/features/player/playerStore.ts`
- Test: `apps/mobile/src/features/player/playerStore.test.ts`

**Interfaces:**

- Produces: `usePlayerStore` state `ambientEnabled: boolean` (default `true`) + `setAmbientEnabled(enabled: boolean)` writing through to MMKV under `STORAGE_KEYS.ambientEnabled`.

- [ ] **Step 1: Add the storage key**

In `apps/mobile/src/lib/storage.ts`, add to `STORAGE_KEYS`:

```ts
  /** Whether the ambient music bed plays under the voice (default on, 10 §4). */
  ambientEnabled: 'player.ambientEnabled',
```

- [ ] **Step 2: Write the failing test**

Create/append `apps/mobile/src/features/player/playerStore.test.ts`:

```ts
import { kv, STORAGE_KEYS } from '@/lib/storage';

import { usePlayerStore } from './playerStore';

describe('ambientEnabled', () => {
  afterEach(() => kv.delete(STORAGE_KEYS.ambientEnabled));

  it('defaults to true', () => {
    expect(usePlayerStore.getState().ambientEnabled).toBe(true);
  });

  it('setAmbientEnabled writes through to MMKV and state', () => {
    usePlayerStore.getState().setAmbientEnabled(false);
    expect(usePlayerStore.getState().ambientEnabled).toBe(false);
    expect(kv.get<boolean>(STORAGE_KEYS.ambientEnabled)).toBe(false);
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `pnpm --filter @aura/mobile test playerStore`
Expected: FAIL — `ambientEnabled`/`setAmbientEnabled` do not exist.

- [ ] **Step 4: Implement it in the store**

In `apps/mobile/src/features/player/playerStore.ts`:

Add the import at the top:

```ts
import { kv, STORAGE_KEYS } from '@/lib/storage';
```

Add to the `PlayerState` interface (near `mode`):

```ts
  /** Ambient bed on/off, persisted; default on (10 §4). */
  ambientEnabled: boolean;
  setAmbientEnabled: (enabled: boolean) => void;
```

In the `create(...)` initial state, hydrate from storage:

```ts
  ambientEnabled: kv.get<boolean>(STORAGE_KEYS.ambientEnabled) ?? true,
```

Add the setter (beside `setPlaying`):

```ts
  setAmbientEnabled: (enabled) => {
    kv.set(STORAGE_KEYS.ambientEnabled, enabled);
    set({ ambientEnabled: enabled });
  },
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `pnpm --filter @aura/mobile test playerStore`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/lib/storage.ts apps/mobile/src/features/player/playerStore.ts apps/mobile/src/features/player/playerStore.test.ts
git commit -m "feat(mobile): persisted ambientEnabled flag in the player store"
```

---

### Task 6: Resolve the music source and pick it in playback

**Files:**

- Modify: `apps/mobile/src/features/moments/useMoments.ts`
- Create: `apps/mobile/src/features/player/pickSource.ts`
- Test: `apps/mobile/src/features/player/pickSource.test.ts`
- Modify: `apps/mobile/src/features/player/usePlayback.ts`

**Interfaces:**

- Consumes: `PlayableMoment` (Task adds `musicAudioSource`), `ambientEnabled` (Task 5).
- Produces: `pickSource(moment, ambientEnabled): string | null` — the single source string for `useAudioPlayer`.

- [ ] **Step 1: Add `musicAudioSource` to `PlayableMoment` and `toPlayable`**

In `apps/mobile/src/features/moments/useMoments.ts`:

Add to the `PlayableMoment` interface (after `audioSource`):

```ts
musicAudioSource: string | null;
```

In `toPlayable` (after the `audioSource` line), resolve the music file under a distinct cache id so it never clobbers the voice cache entry:

```ts
    musicAudioSource: await resolveAudio(`${row.id}#music`, row.audio_music_path),
```

> `resolveAudio(momentId, audioPath)` already returns null when `audioPath` is null, so pre-music moments yield `musicAudioSource: null` for free.

- [ ] **Step 2: Write the failing test for `pickSource`**

Create `apps/mobile/src/features/player/pickSource.test.ts`:

```ts
import type { PlayableMoment } from '@/features/moments/useMoments';

import { pickSource } from './pickSource';

const base: PlayableMoment = {
  id: 'm1',
  type: 'daily',
  status: 'ready',
  title: null,
  body: '',
  audioSource: 'voice.mp3',
  musicAudioSource: 'music.mp3',
  durationMs: 1000,
  favoritedAt: null,
  refineOf: null,
  lines: [],
};

describe('pickSource', () => {
  it('plays the music file when enabled and present', () => {
    expect(pickSource(base, true)).toBe('music.mp3');
  });
  it('plays voice when the toggle is off', () => {
    expect(pickSource(base, false)).toBe('voice.mp3');
  });
  it('plays voice when there is no music file even if enabled', () => {
    expect(pickSource({ ...base, musicAudioSource: null }, true)).toBe('voice.mp3');
  });
  it('is null when nothing is loaded', () => {
    expect(pickSource(null, true)).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `pnpm --filter @aura/mobile test pickSource`
Expected: FAIL — `pickSource` not found.

- [ ] **Step 4: Implement `pickSource`**

Create `apps/mobile/src/features/player/pickSource.ts`:

```ts
import type { PlayableMoment } from '@/features/moments/useMoments';

/**
 * The single file the one player loads. Music when the user wants it AND the
 * moment has a baked bed; otherwise the voice-only file. One file, one player —
 * this is what keeps Android off the broken dual-AudioPlayer path (expo#36034).
 */
export function pickSource(moment: PlayableMoment | null, ambientEnabled: boolean): string | null {
  if (!moment) return null;
  return ambientEnabled && moment.musicAudioSource ? moment.musicAudioSource : moment.audioSource;
}
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `pnpm --filter @aura/mobile test pickSource`
Expected: PASS.

- [ ] **Step 6: Use it in `usePlayback`**

In `apps/mobile/src/features/player/usePlayback.ts`:

Add imports:

```ts
import { pickSource } from './pickSource';
```

Read the flag from the store (beside the other selectors near line 24):

```ts
const ambientEnabled = usePlayerStore((s) => s.ambientEnabled);
```

Replace the player source (line 32) so it picks music vs voice:

```ts
const source = pickSource(moment, ambientEnabled);
const player = useAudioPlayer(source, { updateInterval: 250 });
```

> Note: `usePlayback` already has a local `const source = usePlayerStore((s) => s.source)` for analytics attribution — that is the _playback source_ (home/notification), a different thing. Rename the audio source local to `audioSrc` to avoid the clash:
>
> ```ts
> const audioSrc = pickSource(moment, ambientEnabled);
> const player = useAudioPlayer(audioSrc, { updateInterval: 250 });
> ```

- [ ] **Step 7: Typecheck + run player tests**

Run: `pnpm --filter @aura/mobile typecheck && pnpm --filter @aura/mobile test pickSource playerStore`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/features/moments/useMoments.ts apps/mobile/src/features/player/pickSource.ts apps/mobile/src/features/player/pickSource.test.ts apps/mobile/src/features/player/usePlayback.ts
git commit -m "feat(mobile): play the baked music file when ambient is on"
```

---

### Task 7: Settings toggle for ambient music

**Files:**

- Modify: `apps/mobile/app/settings/index.tsx`

**Interfaces:**

- Consumes: `ambientEnabled` / `setAmbientEnabled` (Task 5).

- [ ] **Step 1: Add the toggle row**

In `apps/mobile/app/settings/index.tsx`, wire a Switch to the store. Read the current settings screen first and match its existing row/section styling; the binding is:

```tsx
import { usePlayerStore } from '@/features/player/playerStore';
```

```tsx
const ambientEnabled = usePlayerStore((s) => s.ambientEnabled);
const setAmbientEnabled = usePlayerStore((s) => s.setAmbientEnabled);
```

Render a row consistent with the screen's other rows, e.g.:

```tsx
<SettingsRow
  label="Ambient music"
  description="Play soft background music under your moments"
  right={<Switch value={ambientEnabled} onValueChange={setAmbientEnabled} />}
/>
```

(Use whatever row component / layout the screen already uses; `Switch` from `react-native`.)

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @aura/mobile typecheck`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `pnpm --filter @aura/mobile lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/settings/index.tsx
git commit -m "feat(mobile): Settings toggle for ambient music"
```

---

### Task 8: On-device verification (Moto edge 60 stylus)

**Files:** none (verification only).

- [ ] **Step 1: Deploy the backend** so generation runs the mix step (Render deploy of the backend branch; confirm `ffmpeg-static` resolved in the build logs).

- [ ] **Step 2: Confirm the migration is applied** on remote Supabase (`audio_music_path` column exists).

- [ ] **Step 3: Generate a fresh moment** on the device (Jenny account). Wait for `ready`.

- [ ] **Step 4: Verify the row** has a non-null `audio_music_path` (Supabase table view or a `select`), and a `{user}/{moment}-music.mp3` object exists in the `audio` bucket.

- [ ] **Step 5: Play it** — the ambient bed is audible under the voice; the words stay clear and unhurried.

- [ ] **Step 6: Confirm single-voice** — one media track, not two:

```bash
adb shell dumpsys audio | grep AudioPlaybackConfiguration | grep 'state:started' | grep -c USAGE_MEDIA
```

Expected: `1`.

- [ ] **Step 7: Regression** — seek/scrub, ±15, speed, and synced lyrics behave exactly as before (they run on the one loaded file).

- [ ] **Step 8: Toggle off** in Settings → open the moment again → voice-only plays (no bed). Toggle on → bed returns.

- [ ] **Step 9: Existing moment** (generated before this shipped) still plays voice-only with no error, regardless of the toggle.

---

## Self-review notes

- **Spec coverage:** schema+types (T1), FFmpeg args+asset (T2), mix (T3), storage+generation best-effort wiring (T4), persisted flag (T5), source pick+resolve (T6), Settings toggle (T7), on-device (T8) — every spec section maps to a task.
- **Voice invariant:** T4's edit keeps `audio_path`/`word_timings`/`duration_ms` writes byte-for-byte; music is a separate, isolated try/catch.
- **Type consistency:** `audio_music_path` (DB/backend), `musicAudioSource` (mobile DTO), `pickSource`, `uploadMomentMusic`, `AudioMixService.mix`, `AMBIENT_BED_PATH`, `ambientEnabled`/`setAmbientEnabled` used identically across tasks.
- **New moments only / best-effort:** enforced in T4 (null on failure) and proven by T4's second test + T8 step 9.
