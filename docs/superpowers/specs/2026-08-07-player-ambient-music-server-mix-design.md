# Ambient Music (Server-Side Bake) — Design

> **⚙️ UPDATE (2026-08-07, post-implementation):** dropped the `audio_music_path`
> column. The mix lives at the DETERMINISTIC path `{user}/{moment}-music.mp3`, so
> the app derives it from `audio_path` (`.mp3` → `-music.mp3`) and asks storage —
> no schema change, no migration, works with existing creds. A moment with no
> baked bed simply has no such object and `resolveAudio` returns null → voice
> fallback. Everywhere below that says "add `audio_music_path`" / "regenerate
> types" is superseded by `musicPathFrom(audio_path)` in `useMoments.ts`.

**Date:** 2026-08-07
**Status:** Approved (design)
**Supersedes:** `2026-08-06-player-ambient-music-design.md` (client-side layer — abandoned; see "Why not client-side").
**Surface:** Moment player only (daily + on-demand + milestone). The Letter is untouched.

## Goal

Play a soft, looping ambient music bed **under the voice** while a moment plays, so the
player feels warmer and more immersive — without regressing the recently-fixed playback
(single voice instance, seekable waveform, synced lyrics) and without ever blocking
generation.

## Why not client-side (the abandoned approach)

The prior design played the bed with a **second `useAudioPlayer`** mounted beside the voice.
That is **broken on Android**: per Expo's own tracker
([expo/expo#36034](https://github.com/expo/expo/issues/36034)), calling `.play()` on one
`AudioPlayer` **pauses every other `AudioPlayer` in the app**. iOS/Web mix; Android does not,
and there is no merged fix. The test device is a Motorola (Android), so the bed would have
paused the voice. Building a core feature on undocumented concurrent-playback behaviour is
unacceptable. Rejected.

## Approach

**Bake the mix into an MP3 on the backend at generation time.** After ElevenLabs returns the
voice MP3, FFmpeg overlays a looped ambient bed under it (gentle sidechain duck so the words
always sit on top) and produces a **second** file. We store **both**:

- `audio_path` — voice-only (**unchanged**, exactly as today).
- `audio_music_path` — voice + bed, mixed.

The app plays **one file through the one existing player** — whichever the user's toggle
selects. No second player, so **zero Android dual-player problem**, perfect sync, offline-safe
once cached. Because we only _overlay_ onto the voice (never retime it), the voice track's
`word_timings` and `duration_ms` are **identical** — karaoke and the scrubber are untouched.

## Global Constraints

- **Voice-only path is invariant.** `audio_path`, `word_timings`, `duration_ms`, QA, and the
  existing player behaviour are unchanged. Music is purely additive.
- **Best-effort mix.** If the mix step throws (bad asset, FFmpeg failure), log it, leave
  `audio_music_path` null, and finish the job normally. Music must **never** block, delay, or
  fail generation.
- **New moments only.** No backfill of existing moments in this work; rows generated before
  this ships keep `audio_music_path = null` and play voice-only.
- **Moments only.** No ambient in the Letter or anywhere else.
- **Default ON**, user-toggleable in Settings, choice persisted (MMKV) across launches.
- **Output format matches the voice:** MP3, 44.1 kHz, ~128 kbps.

## Components / Files

### Backend — new

- `apps/backend/assets/ambient/ambient-loop.mp3` — bundled seamless instrumental loop. Ships
  as a short **royalty-free placeholder**; the licensed file drops in at the same path later.
  See "Asset spec".
- `apps/backend/src/generation/audio-mix.service.ts` — `AudioMixService`:
  - `mix(voice: Buffer): Promise<Buffer>` — writes the voice to a temp file, runs the
    bundled `ffmpeg-static` binary to loop + duck + overlay the bed to the voice's length,
    reads back the mixed MP3, cleans up temps, returns the Buffer. Throws on any FFmpeg
    failure (caller isolates it).
  - Pure, testable helper `buildFfmpegArgs(voicePath, bedPath, outPath)` returning the exact
    `string[]` of FFmpeg arguments, so the filtergraph is unit-tested without spawning FFmpeg.
  - Dependency: `ffmpeg-static` (ships the binary — nothing to apt-install on Render).

### Backend — modified

- `apps/backend/src/generation/generation.service.ts` (~line 358) — after `synth`, upload the
  voice as today, then **best-effort**: `mixed = await this.audioMix.mix(synth.audio)`,
  `musicPath = await this.storage.uploadMomentMusic(userId, moment.id, mixed)`, and include
  `audio_music_path: musicPath` in the row update. Wrapped in try/catch; on failure log and
  set `audio_music_path` null.
- `apps/backend/src/generation/storage.service.ts` — add
  `uploadMomentMusic(userId, momentId, audio): Promise<string>` uploading to
  `{userId}/{momentId}-music.mp3` (same bucket, `audio/mpeg`, upsert).
- `apps/backend/src/generation/generation.module.ts` — provide `AudioMixService`.

### Database + shared

- `supabase/migrations/20260807000000_moment_audio_music.sql` — `alter table moments add
column audio_music_path text;` (nullable).
- `packages/shared/src/types/database.types.ts` — regenerate via `pnpm db:types` (adds
  `audio_music_path` to the `moments` Row/Insert/Update).

### Mobile — modified

- `apps/mobile/src/lib/storage.ts` — add `STORAGE_KEYS.ambientEnabled = 'player.ambientEnabled'`.
- `apps/mobile/src/features/player/playerStore.ts` — add `ambientEnabled: boolean` (hydrated
  from `kv`, default `true`) + `setAmbientEnabled(enabled)` that writes through to `kv`.
- `apps/mobile/src/features/moments/useMoments.ts` — `PlayableMoment` gains
  `musicAudioSource: string | null`; `toPlayable` resolves it from `row.audio_music_path`
  (cached under a distinct id `` `${row.id}#music` `` so it never clobbers the voice cache
  entry).
- `apps/mobile/src/features/player/usePlayback.ts` — the source handed to `useAudioPlayer`
  becomes `pickSource(moment, ambientEnabled)` = `ambientEnabled && moment.musicAudioSource ?
moment.musicAudioSource : moment.audioSource`. Still one player, one file. Reads
  `ambientEnabled` from the store; changing it re-keys the source so it applies on the next
  open (live mid-play swap is out of scope — see below).
- `apps/mobile/app/settings/index.tsx` (+ a small `AmbientToggleRow` if the screen wants one)
  — an "Ambient music" toggle bound to `ambientEnabled` / `setAmbientEnabled`.

## Behaviour

- **Generation:** every new spoken moment stores voice-only **and** (best-effort) a mixed
  file. A mix failure just leaves `audio_music_path` null; the moment is otherwise normal.
- **Playback:** the app plays the mixed file when `ambientEnabled` is on and the moment has
  one, else voice-only. One player, one file — speed, seek, ±15, synced lyrics all behave
  exactly as today (they operate on whichever single file is loaded).
- **Toggle off:** next moment opened plays voice-only. **Toggle on:** next moment plays mixed.
  Applies at open, not mid-track.
- **Existing moments:** `audio_music_path` null → always voice-only regardless of the toggle.

## FFmpeg filtergraph (baked, with ducking)

Loop the bed to cover the voice, drop its base level, then duck it under the voice via
sidechain so speech stays intelligible; trim to the voice's exact length; encode to match.

```
ffmpeg -y -i <voice.mp3> -stream_loop -1 -i <bed.mp3> \
  -filter_complex "[1:a]volume=0.22[bedlow]; \
                   [bedlow][0:a]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=600[duck]; \
                   [0:a][duck]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mix]" \
  -map "[mix]" -ac 2 -ar 44100 -b:a 128k -f mp3 <out.mp3>
```

- `-stream_loop -1` on the bed loops it to any length; `amix … duration=first` trims to the
  voice.
- `volume=0.22` sets the bed's floor (≈13 dB under the voice); `sidechaincompress` keyed by
  the voice dips it further while she speaks and lets it swell in the gaps.
- `normalize=0` stops `amix` from halving the voice level.
- Base voice level is untouched, so perceived voice loudness ≈ today.
- Exact constants live in `AudioMixService` and are covered by the `buildFfmpegArgs` unit test.

## Asset spec (for the licensed file)

- MP3, 44.1 kHz, stereo, ~128 kbps.
- **Seamless loop** (no click/gap at the wrap), instrumental, calm/ambient, no melody that
  competes with speech, minimal transients.
- ~60–180 s (loops to cover any moment). Bundled with the **backend**, not the app — APK size
  is unaffected. Keep it reasonable (< ~3 MB).

## Testing

- **Unit (backend, jest):** `buildFfmpegArgs` emits the exact arg vector (inputs, filtergraph,
  `-stream_loop -1`, output codec/rate/bitrate). `generation.service` — mix success sets
  `audio_music_path`; a thrown mix leaves it null **and** the job still succeeds with the voice
  uploaded (best-effort isolation).
- **Unit (mobile, jest):** `pickSource` truth table (enabled+music → music; enabled+no music →
  voice; disabled → voice). `playerStore` `ambientEnabled` default `true` + persistence
  write-through. `toPlayable` maps `audio_music_path` → `musicAudioSource`.
- **On-device (Moto):** generate a fresh moment → the bed is audible under the voice, words
  stay clear; Settings toggle off → regenerate/open → voice-only; single-voice track count via
  `dumpsys` still 1 (one file, one player); seek + synced lyrics unchanged. Confirm existing
  (pre-ship) moments still play voice-only.

## Risks & mitigations

1. **FFmpeg binary unavailable on Render** — use `ffmpeg-static` (bundles the binary in
   `node_modules`); no system package needed. Verify the resolved path exists at boot.
2. **Mix step slows or fails a job** — it is best-effort and isolated in try/catch; a failure
   never blocks generation, only omits the music file.
3. **Bed too loud / competes with speech** — sidechain duck + conservative `volume=0.22`;
   tune constants once against a real track; covered by the arg test so changes are deliberate.
4. **Storage roughly doubles for audio** — accepted (two small MP3s per moment). Voice-only
   remains the canonical file; music is a bonus artifact.

## Out of scope (future)

- Backfilling existing moments with a music file (one-time re-mix script).
- Multiple beds / per-mood selection / user-chosen track / volume slider.
- Live mid-playback toggle (swap file at current position).
- A per-moment quick toggle in the player header (Settings toggle ships first).
- Ambient under the Letter.
