# Ambient Music (Moment Player) — Design

**Date:** 2026-08-06
**Status:** Approved (design)
**Surface:** Moment player only (daily + on-demand). The Letter is untouched.

## Goal

Play a soft, looping ambient music bed **under the voice** while a moment plays, so the
player feels warmer and more immersive — without changing the generation/storage pipeline
and without regressing the recently-fixed playback (single voice instance, seekable
waveform, synced lyrics).

## Approach

A **client-side ambient layer**. The music is a bundled, seamless loop played by a
second, single, well-owned `useAudioPlayer` mounted once alongside the voice player. It is
a _slave_ to the voice: it mirrors `playerStore.playing`, never drives it. **Zero backend
changes** — the entire text → ElevenLabs → Supabase pipeline is untouched.

Rejected alternative: **server-side mix** (baking the bed into the MP3 during generation).
Rejected because it changes the generation seam (`generation.service.ts:358-359`), risks
desyncing voice-relative `word_timings`/`duration_ms` from a now-longer mixed file (breaking
karaoke + the scrubber), gives no user toggle, and leaves every existing moment music-less
unless regenerated. It directly violates "don't break the existing workflow."

## Global Constraints

- **No backend changes.** Generation, QA, storage, and the `moments` schema are identical.
- **Voice playback is untouched.** `usePlayback.ts` is not modified in behaviour; the bed
  only _reads_ `playerStore` state.
- **Best-effort.** If the asset is missing or the bed fails to load/play, the voice plays
  exactly as today. The bed can never block, delay, or error the voice.
- **Moments only.** No ambient during the Letter (`useLetterPlayback`) or elsewhere.
- **Default ON**, user-toggleable, choice persisted across launches.

## Components / Files

### New

- `apps/mobile/assets/audio/ambient-loop.mp3` — bundled seamless instrumental loop.
  Ships as a short royalty-free **placeholder**; the licensed file drops in at the same
  path later. See "Asset spec" below.
- `apps/mobile/src/features/player/ambientBed.ts` — pure, worklet-free logic:
  - `shouldPlayBed(playing: boolean, hasMoment: boolean, enabled: boolean): boolean`
    → `playing && hasMoment && enabled`.
  - `nextFadeVolume(current: number, target: number, stepMs: number): number` — one fade
    tick toward a target, so fades are unit-testable without a real player.
  - `AMBIENT_VOLUME = 0.18`, `AMBIENT_FADE_MS = 800`.
- `apps/mobile/src/features/player/useAmbientBed.ts` — the hook:
  - One `useAudioPlayer(require('../../../assets/audio/ambient-loop.mp3'), { updateInterval: 1000 })`
    with `player.loop = true` (expo-audio looping).
  - Subscribes to `playerStore` `playing`, `moment`, `ambientEnabled`.
  - Drives play/pause + a volume fade toward `AMBIENT_VOLUME` (in) or `0` (out) using an
    interval timer; pauses the player after the fade-out completes.
  - Entirely wrapped so any throw is swallowed (best-effort).

### Modified

- `apps/mobile/src/features/player/playerStore.ts` — add:
  - `ambientEnabled: boolean` (default `true`), `setAmbientEnabled(enabled: boolean)`.
  - Hydrated on store creation from persisted storage; `setAmbientEnabled` writes through.
- `apps/mobile/src/lib/storage.ts` — a small persisted key (`ambient_enabled`) using the
  existing AsyncStorage wrapper (get/set boolean). No new store.
- `apps/mobile/app/(tabs)/_layout.tsx` — call `useAmbientBed()` beside `usePlayback()`
  (same "mounted once, outlives the cover" rationale).
- `apps/mobile/src/features/settings/` + `app/settings/index.tsx` — add an "Ambient music"
  toggle row bound to `ambientEnabled`.
- Copy: add the toggle label/description to the relevant `src/copy/*` file.

## Behaviour

- **Trigger:** bed plays iff `shouldPlayBed(playing, !!moment, ambientEnabled)`.
- **Fades:** ~800 ms ramp in on start, ~800 ms ramp out on pause/stop, then pause the
  player. No clicks, no abrupt swells.
- **Speed:** the 1×/1.25/1.5 rate applies to the **voice only**. The bed always plays at
  natural tempo (never call `setPlaybackRate` on the bed).
- **Seek / ±15:** do **not** touch the bed. It is ambient, not synced — scrubbing the voice
  leaves the bed running smoothly.
- **Loop:** the bed loops seamlessly for the whole moment; it is not aligned to voice length.
- **Toggle off mid-play:** fades out within ~800 ms and pauses. Toggling on mid-play fades
  in.
- **Minimize:** the bed follows `playing` — if audio continues behind the tab bar, so does
  the bed; if the voice stops, the bed stops.

## Audio session

`audioMode.ts` sets `interruptionMode: 'doNotMix'`. That flag governs behaviour toward
**other apps'** audio; two players **inside our own app** share the session and mix. Plan:
**change nothing in `audioMode.ts` first**, verify on-device that the bed mixes under the
voice, and only adjust if the bed is actually silenced. If a change is ever required, it is
a scoped, tested tweak — not a default of this work.

## Asset spec (for the licensed file)

- Format: MP3, 44.1 kHz (matches the voice output), stereo, ~128 kbps.
- **Seamless loop** (no gap/click at the wrap point), instrumental, calm/ambient, no
  melody that competes with speech, minimal transients.
- Length: ~60–180 s (loops to cover any moment). Kept small (target < ~3 MB) since it is
  bundled in the app.
- Mixed low/neutral; the app plays it at ~0.18 volume under the voice (≈18–25 dB below,
  per voice-over best practice).

## Testing

- **Unit (jest):** `shouldPlayBed` truth table; `nextFadeVolume` ramp math (in, out,
  clamp); `playerStore` `ambientEnabled` default + persistence write-through.
- **On-device (Moto):** bed mixes under the voice; fades in/out; toggle off silences it;
  the existing player fixes still hold (single voice via `dumpsys` track count, seek,
  synced lyrics). Confirm the `doNotMix` session does not silence the bed.

## Risks & mitigations

1. **`doNotMix` silences the bed** — verify on-device before any session change; scoped fix
   only if needed.
2. **A second `useAudioPlayer` re-triggers the double-play bug** — mitigated: the bed uses a
   **different source** (the loop, not `moment.audioSource`) and its lifecycle keys off
   `playing`, never `moment.id`. It cannot race or re-trigger the voice.
3. **Bundled asset bloats the APK** — keep the loop < ~3 MB; it is one file.

## Out of scope (future)

- Multiple tracks / per-mood selection / user-chosen track.
- A per-moment quick toggle in the player header (settings toggle ships first).
- Ambient under the Letter.
- Server-side baked mixes.
- A volume slider (fixed `AMBIENT_VOLUME` for v1).
