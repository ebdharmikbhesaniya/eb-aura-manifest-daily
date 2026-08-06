# Ambient Music (Moment Player) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Play a soft, looping ambient music bed under the voice while a moment plays, added purely at playback time — no backend changes, no regression to the single-voice/seek/synced-lyrics fixes.

**Architecture:** A second, single, well-owned `useAudioPlayer` (the "ambient bed") mounted once in the tab layout beside `usePlayback()`. It loops a bundled asset at low volume and mirrors `playerStore.playing`; it never drives the voice. All decision/fade logic is pure and unit-tested; the hook is best-effort (any throw is swallowed so the voice is never affected).

**Tech Stack:** React Native / Expo, `expo-audio ~57` (`useAudioPlayer`, `player.loop`, `player.volume`, `player.play/pause`), Zustand (`playerStore`), MMKV (`kv` + `STORAGE_KEYS`), Jest.

## Global Constraints

- **No backend changes.** Nothing under `apps/backend` is touched. `moments` schema unchanged.
- **`usePlayback.ts` behaviour is unchanged.** The bed only _reads_ `playerStore`.
- **Best-effort.** The bed can never block, delay, or throw into the voice path. Wrap all player calls in try/catch; a missing/failed asset degrades to voice-only.
- **The bed uses a DIFFERENT source** (the bundled loop) and keys its lifecycle off `playing`, never `moment.id` — so it cannot re-trigger or race the voice player (the prior double-play bug).
- **Moments only.** No change to `useLetterPlayback` / the Letter.
- **Do NOT change `audioMode.ts` (`interruptionMode: 'doNotMix'`) in this plan.** Verify on-device first; a session change is a separate, tested follow-up only if the bed is silenced.
- Constants: `AMBIENT_VOLUME = 0.18`, `AMBIENT_FADE_MS = 800`, fade tick `AMBIENT_FADE_TICK_MS = 50`.
- Asset path: `apps/mobile/assets/audio/ambient-loop.mp3` (placeholder now; licensed file later, same path).

---

## File Structure

- Create: `apps/mobile/src/features/player/ambientBed.ts` — pure logic (`shouldPlayBed`, `nextFadeVolume`, constants).
- Create: `apps/mobile/src/features/player/ambientBed.test.ts` — unit tests for the pure logic.
- Create: `apps/mobile/src/features/player/useAmbientBed.ts` — the looping-player hook.
- Create: `apps/mobile/assets/audio/ambient-loop.mp3` — bundled placeholder loop.
- Modify: `apps/mobile/src/lib/storage.ts` — add `STORAGE_KEYS.ambientEnabled`.
- Modify: `apps/mobile/src/features/player/playerStore.ts` — `ambientEnabled` + `setAmbientEnabled` (persisted).
- Modify: `apps/mobile/src/features/player/playerStore.test.ts` — cover the new state.
- Modify: `apps/mobile/app/(tabs)/_layout.tsx` — mount `useAmbientBed()`.
- Modify: `apps/mobile/src/copy/settings.ts` — the toggle's copy.
- Modify: `apps/mobile/app/settings/index.tsx` — the "Ambient music" toggle row.

---

## Task 1: Pure ambient logic

**Files:**

- Create: `apps/mobile/src/features/player/ambientBed.ts`
- Test: `apps/mobile/src/features/player/ambientBed.test.ts`

**Interfaces:**

- Produces: `shouldPlayBed(playing: boolean, hasMoment: boolean, enabled: boolean): boolean`; `nextFadeVolume(current: number, target: number, step: number): number`; constants `AMBIENT_VOLUME`, `AMBIENT_FADE_MS`, `AMBIENT_FADE_TICK_MS`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/src/features/player/ambientBed.test.ts
import {
  shouldPlayBed,
  nextFadeVolume,
  AMBIENT_VOLUME,
  AMBIENT_FADE_MS,
  AMBIENT_FADE_TICK_MS,
} from './ambientBed';

describe('shouldPlayBed', () => {
  it('plays only when playing AND a moment is loaded AND enabled', () => {
    expect(shouldPlayBed(true, true, true)).toBe(true);
    expect(shouldPlayBed(false, true, true)).toBe(false);
    expect(shouldPlayBed(true, false, true)).toBe(false);
    expect(shouldPlayBed(true, true, false)).toBe(false);
  });
});

describe('nextFadeVolume', () => {
  it('steps up toward the target without overshooting', () => {
    expect(nextFadeVolume(0, AMBIENT_VOLUME, 0.05)).toBeCloseTo(0.05);
    expect(nextFadeVolume(0.16, AMBIENT_VOLUME, 0.05)).toBeCloseTo(AMBIENT_VOLUME);
  });

  it('steps down toward zero without undershooting', () => {
    expect(nextFadeVolume(0.18, 0, 0.05)).toBeCloseTo(0.13);
    expect(nextFadeVolume(0.03, 0, 0.05)).toBe(0);
  });

  it('returns the target when already there', () => {
    expect(nextFadeVolume(AMBIENT_VOLUME, AMBIENT_VOLUME, 0.05)).toBe(AMBIENT_VOLUME);
  });

  it('exposes sane fade constants', () => {
    expect(AMBIENT_FADE_MS).toBeGreaterThan(0);
    expect(AMBIENT_FADE_TICK_MS).toBeGreaterThan(0);
    expect(AMBIENT_FADE_TICK_MS).toBeLessThan(AMBIENT_FADE_MS);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest src/features/player/ambientBed.test.ts`
Expected: FAIL — `Cannot find module './ambientBed'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/mobile/src/features/player/ambientBed.ts

/** Bed volume under the voice — ~18-25 dB down, per voice-over best practice. */
export const AMBIENT_VOLUME = 0.18;
/** How long the bed takes to fade in on start / out on stop. */
export const AMBIENT_FADE_MS = 800;
/** Fade update cadence. Small enough to sound continuous, large enough to be cheap. */
export const AMBIENT_FADE_TICK_MS = 50;

/** The bed sounds only while a moment is actually playing and the user hasn't muted it. */
export function shouldPlayBed(playing: boolean, hasMoment: boolean, enabled: boolean): boolean {
  return playing && hasMoment && enabled;
}

/**
 * One fade tick: move `current` toward `target` by at most `step`, clamped so it
 * never overshoots. Pure, so the fade is testable without a real player.
 */
export function nextFadeVolume(current: number, target: number, step: number): number {
  if (current === target) return target;
  if (current < target) return Math.min(target, current + step);
  return Math.max(target, current - step);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest src/features/player/ambientBed.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/player/ambientBed.ts apps/mobile/src/features/player/ambientBed.test.ts
git commit -m "feat(player): pure ambient-bed logic (shouldPlayBed, nextFadeVolume)"
```

---

## Task 2: Persisted `ambientEnabled` preference

**Files:**

- Modify: `apps/mobile/src/lib/storage.ts` (add key)
- Modify: `apps/mobile/src/features/player/playerStore.ts:~24-38` (state) and store body
- Test: `apps/mobile/src/features/player/playerStore.test.ts`

**Interfaces:**

- Consumes: `kv.get`/`kv.set` and `STORAGE_KEYS` from `@/lib/storage`.
- Produces: `usePlayerStore` gains `ambientEnabled: boolean` (default `true`) and `setAmbientEnabled(enabled: boolean): void` (persists via `kv.set`).

- [ ] **Step 1: Add the storage key**

In `apps/mobile/src/lib/storage.ts`, add to `STORAGE_KEYS`:

```ts
  /** User toggle for the moment player's ambient music bed (default on). */
  ambientEnabled: 'player.ambientEnabled',
```

- [ ] **Step 2: Write the failing test**

Add to `apps/mobile/src/features/player/playerStore.test.ts`:

```ts
import { kv, STORAGE_KEYS } from '@/lib/storage';

describe('ambient music preference', () => {
  it('defaults to enabled', () => {
    expect(usePlayerStore.getState().ambientEnabled).toBe(true);
  });

  it('persists the toggle through MMKV', () => {
    usePlayerStore.getState().setAmbientEnabled(false);
    expect(usePlayerStore.getState().ambientEnabled).toBe(false);
    expect(kv.get<boolean>(STORAGE_KEYS.ambientEnabled)).toBe(false);
    usePlayerStore.getState().setAmbientEnabled(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/mobile && npx jest src/features/player/playerStore.test.ts -t "ambient music preference"`
Expected: FAIL — `ambientEnabled` / `setAmbientEnabled` undefined.

- [ ] **Step 4: Implement in the store**

In `apps/mobile/src/features/player/playerStore.ts`:

1. Add the import at the top (near other `@/` imports):

```ts
import { kv, STORAGE_KEYS } from '@/lib/storage';
```

2. In the `PlayerState` interface, add:

```ts
  /** Ambient music bed toggle (persisted). Default on. */
  ambientEnabled: boolean;
  setAmbientEnabled: (enabled: boolean) => void;
```

3. In the `create<PlayerState>((set, get) => ({ ... }))` body, add the hydrated initial value beside the other prefs (e.g. after `mode: 'listen',`):

```ts
  ambientEnabled: kv.get<boolean>(STORAGE_KEYS.ambientEnabled) ?? true,
```

4. Add the setter beside `toggleMode`:

```ts
  setAmbientEnabled: (enabled) => {
    kv.set(STORAGE_KEYS.ambientEnabled, enabled);
    set({ ambientEnabled: enabled });
  },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/mobile && npx jest src/features/player/playerStore.test.ts`
Expected: PASS (all store tests).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/lib/storage.ts apps/mobile/src/features/player/playerStore.ts apps/mobile/src/features/player/playerStore.test.ts
git commit -m "feat(player): persisted ambientEnabled preference (default on)"
```

---

## Task 3: Bundled placeholder loop asset

**Files:**

- Create: `apps/mobile/assets/audio/ambient-loop.mp3`

**Interfaces:**

- Produces: a real, loopable MP3 at the asset path so `require()` resolves and on-device mixing can be heard. Replaced by the licensed file later (same path, no code change).

- [ ] **Step 1: Generate a gentle placeholder loop**

Requires `ffmpeg`. Synthesize a soft ~60 s ambient pad (two quiet detuned sines) that loops without a click, at the voice's 44.1 kHz:

```bash
mkdir -p apps/mobile/assets/audio
ffmpeg -y \
  -f lavfi -i "sine=frequency=220:sample_rate=44100:duration=60" \
  -f lavfi -i "sine=frequency=277:sample_rate=44100:duration=60" \
  -filter_complex "[0:a][1:a]amix=inputs=2,volume=0.25,afade=t=in:st=0:d=2,afade=t=out:st=58:d=2[a]" \
  -map "[a]" -ac 2 -b:a 128k apps/mobile/assets/audio/ambient-loop.mp3
```

If `ffmpeg` is unavailable, obtain any short royalty-free ambient loop and save it to that exact path. (This is a placeholder; the licensed track replaces it later.)

- [ ] **Step 2: Verify the file exists and is small**

Run: `ls -lh apps/mobile/assets/audio/ambient-loop.mp3`
Expected: a file present, well under 3 MB.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/assets/audio/ambient-loop.mp3
git commit -m "chore(player): placeholder ambient loop asset"
```

---

## Task 4: The ambient-bed hook

**Files:**

- Create: `apps/mobile/src/features/player/useAmbientBed.ts`

**Interfaces:**

- Consumes: `useAudioPlayer` from `expo-audio`; `usePlayerStore` (`playing`, `moment`, `ambientEnabled`); `shouldPlayBed`, `nextFadeVolume`, and the constants from `./ambientBed`.
- Produces: `useAmbientBed(): void` — a side-effect hook, mounted once.

- [ ] **Step 1: Implement the hook**

```ts
// apps/mobile/src/features/player/useAmbientBed.ts
import { useAudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';

import {
  AMBIENT_FADE_MS,
  AMBIENT_FADE_TICK_MS,
  AMBIENT_VOLUME,
  nextFadeVolume,
  shouldPlayBed,
} from './ambientBed';
import { usePlayerStore } from './playerStore';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AMBIENT_SOURCE = require('../../../assets/audio/ambient-loop.mp3');

/**
 * The moment player's ambient music bed (spec 2026-08-06). A SECOND, single,
 * well-owned player — distinct from the voice: a different source, looped, at low
 * volume, mounted ONCE beside `usePlayback` in the tab layout. It mirrors the
 * voice's play state and never drives it; the voice is the source of truth.
 *
 * Best-effort by construction: every native call is guarded, so a missing or
 * un-decodable asset degrades to voice-only rather than breaking playback.
 */
export function useAmbientBed(): void {
  const playing = usePlayerStore((s) => s.playing);
  const hasMoment = usePlayerStore((s) => s.moment !== null);
  const enabled = usePlayerStore((s) => s.ambientEnabled);

  const player = useAudioPlayer(AMBIENT_SOURCE, { updateInterval: 1000 });
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Loop forever; the bed is not aligned to the voice's length.
  useEffect(() => {
    try {
      player.loop = true;
      player.volume = 0;
    } catch {
      // best-effort
    }
  }, [player]);

  useEffect(() => {
    const wants = shouldPlayBed(playing, hasMoment, enabled);
    const step = AMBIENT_VOLUME * (AMBIENT_FADE_TICK_MS / AMBIENT_FADE_MS);

    if (fadeRef.current) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    }

    try {
      if (wants) player.play();
    } catch {
      // best-effort
    }

    const target = wants ? AMBIENT_VOLUME : 0;
    fadeRef.current = setInterval(() => {
      try {
        const v = nextFadeVolume(player.volume, target, step);
        player.volume = v;
        if (v === target) {
          if (fadeRef.current) {
            clearInterval(fadeRef.current);
            fadeRef.current = null;
          }
          if (!wants) player.pause();
        }
      } catch {
        if (fadeRef.current) {
          clearInterval(fadeRef.current);
          fadeRef.current = null;
        }
      }
    }, AMBIENT_FADE_TICK_MS);

    return () => {
      if (fadeRef.current) {
        clearInterval(fadeRef.current);
        fadeRef.current = null;
      }
    };
  }, [playing, hasMoment, enabled, player]);
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx eslint src/features/player/useAmbientBed.ts`
Expected: no errors. (If the `require` line still lints, prefer `import AMBIENT_SOURCE from '../../../assets/audio/ambient-loop.mp3';` with the project's asset module typing; keep whichever the codebase already uses for bundled media.)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/player/useAmbientBed.ts
git commit -m "feat(player): ambient-bed hook (looping low-volume player, fades)"
```

---

## Task 5: Mount the bed in the tab layout

**Files:**

- Modify: `apps/mobile/app/(tabs)/_layout.tsx:~4,22`

**Interfaces:**

- Consumes: `useAmbientBed` from `@/features/player/useAmbientBed`.

- [ ] **Step 1: Add the import and the call**

In `apps/mobile/app/(tabs)/_layout.tsx`, add the import beside the `usePlayback` import:

```ts
import { useAmbientBed } from '@/features/player/useAmbientBed';
```

And call it directly under `usePlayback();` in `TabsLayout`:

```ts
usePlayback();
// The ambient bed rides alongside the voice for the same reason usePlayback
// lives here: mounted once, it outlives the cover and follows playback across
// tabs. It reads the store's play state and never drives the voice.
useAmbientBed();
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile/app/(tabs)/_layout.tsx"
git commit -m "feat(player): mount the ambient bed once in the tab layout"
```

---

## Task 6: Settings toggle

**Files:**

- Modify: `apps/mobile/src/copy/settings.ts`
- Modify: `apps/mobile/app/settings/index.tsx`

**Interfaces:**

- Consumes: `usePlayerStore` (`ambientEnabled`, `setAmbientEnabled`); `settingsCopy.ambient`.

- [ ] **Step 1: Add the copy**

In `apps/mobile/src/copy/settings.ts`, add to the `settingsCopy` object (beside `notifications`):

```ts
  ambient: {
    /** Row title for the ambient-music toggle. */
    title: 'Ambient music',
    /** One quiet line saying what it does. */
    subtitle: 'A soft bed of sound under each moment',
  },
```

- [ ] **Step 2: Add the toggle row**

In `apps/mobile/app/settings/index.tsx`:

1. Add imports:

```ts
import { ScrollView, Switch } from 'react-native';
import { usePlayerStore } from '@/features/player/playerStore';
```

(Replace the existing `import { ScrollView } from 'react-native';` line.)

2. Inside `SettingsRoute`, read the store:

```ts
const ambientEnabled = usePlayerStore((s) => s.ambientEnabled);
const setAmbientEnabled = usePlayerStore((s) => s.setAmbientEnabled);
```

3. Add a row to the first `RowGroup` (the "how the app behaves" group, with the notifications row):

```tsx
<ListRow
  title={settingsCopy.ambient.title}
  subtitle={settingsCopy.ambient.subtitle}
  trailing={
    <Switch
      value={ambientEnabled}
      onValueChange={setAmbientEnabled}
      testID="settings-ambient-switch"
    />
  }
  testID="settings-ambient-row"
/>
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd apps/mobile && npx tsc --noEmit && npx eslint app/settings/index.tsx src/copy/settings.ts`
Expected: no errors.

- [ ] **Step 4: Write a render test**

Create `apps/mobile/app/settings/settings-ambient.test.tsx` (or add to an existing settings test if present):

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';

import SettingsRoute from './index';
import { usePlayerStore } from '@/features/player/playerStore';

// Reuse the app's standard test providers/wrapper if one exists; otherwise wrap
// in ThemeProvider as the other screen tests do.
describe('Settings ambient toggle', () => {
  it('reflects and flips the ambientEnabled preference', () => {
    usePlayerStore.getState().setAmbientEnabled(true);
    render(<SettingsRoute />);
    const sw = screen.getByTestId('settings-ambient-switch');
    fireEvent(sw, 'valueChange', false);
    expect(usePlayerStore.getState().ambientEnabled).toBe(false);
    usePlayerStore.getState().setAmbientEnabled(true);
  });
});
```

If `SettingsRoute` pulls in navigation/sheets that are awkward to render in jest, downgrade this to a focused test that renders a small wrapper using the same `ListRow`+`Switch`+store wiring, and keep the full-screen check for on-device.

- [ ] **Step 5: Run test**

Run: `cd apps/mobile && npx jest settings-ambient`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/copy/settings.ts apps/mobile/app/settings/index.tsx apps/mobile/app/settings/settings-ambient.test.tsx
git commit -m "feat(settings): Ambient music toggle"
```

---

## Task 7: On-device verification (Moto) + regression

**Files:** none (verification).

- [ ] **Step 1: Full check + build**

Run: `cd apps/mobile && npx tsc --noEmit && npx eslint . && npx jest src/features/player`
Expected: all green.

Then build and install the standalone release APK:

```bash
cd apps/mobile/android && SENTRY_DISABLE_AUTO_UPLOAD=true ./gradlew :app:assembleRelease -q
adb install -r app/build/outputs/apk/release/app-release.apk
```

- [ ] **Step 2: Verify the bed on-device**

Launch, play a moment. Confirm by ear (or headphones): a soft music bed fades in under the voice, loops, and does not drown the voice.

If the bed is SILENT: the `doNotMix` session may be suppressing it. Do NOT change `audioMode.ts` blindly — first confirm the bed player is playing (log `player.playing`/`player.volume`). Only if confirmed silenced by the session, open a separate, tested change to relax the session for the moment surface.

- [ ] **Step 3: Verify the toggle**

Profile → gear → Settings → toggle "Ambient music" OFF while a moment plays: the bed fades out within ~1 s; the voice continues unchanged. Toggle ON: it fades back in. Kill and relaunch the app: the toggle state persisted.

- [ ] **Step 4: Regression — the fixes still hold**

- Single voice: with a moment playing, run `adb shell dumpsys audio | grep "AudioPlaybackConfiguration" | grep "state:started" | grep -c "USAGE_MEDIA"`. Expect **2** while music is on (voice + bed), **1** with the toggle off — and never a second _voice_.
- Scrub the waveform: voice seeks; the bed keeps playing smoothly (no restart, no second voice).
- Synced lyrics still fill from the top and the ember word-glow still sweeps.

- [ ] **Step 5: Final commit (if any tuning)**

```bash
git add -A
git commit -m "test(player): verify ambient bed on device; tune volume/fade if needed"
```

---

## Self-Review Notes

- **Spec coverage:** universal bundled loop (Task 3), on-by-default persisted toggle (Tasks 2, 6), moments-only (bed keys off the global store, Letter untouched), best-effort (Task 4 guards), no backend changes (none in file list), `audioMode.ts` untouched (Global Constraints + Task 7 gate).
- **Type consistency:** `shouldPlayBed`/`nextFadeVolume`/constants defined in Task 1 are consumed with the same signatures in Task 4; `ambientEnabled`/`setAmbientEnabled` defined in Task 2 are consumed in Tasks 4 and 6.
- **Placeholder scan:** the one asset placeholder is deliberate and called out (licensed file, same path). The `require` vs asset-import note in Task 4 Step 2 tells the implementer to match the codebase's existing bundled-media convention.
