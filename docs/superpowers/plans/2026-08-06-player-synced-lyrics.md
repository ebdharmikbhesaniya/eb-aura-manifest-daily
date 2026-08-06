# Player Synced Lyrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the moment player a calm, "proper" synced-lyrics view — all lines visible, active line centered, past dimmed, upcoming faint, with a soft ember word-by-word glow through the active line — without touching the onboarding Letter.

**Architecture:** A new isolated `SyncedLyrics` component replaces `KaraokeLetter` at the player's play-mode call site. The state math lives in a pure, worklet-safe `lyricsState` module (unit-tested); the component reads `positionMs` in reanimated worklets on the UI thread, splitting only the active line into per-word animated nodes.

**Tech Stack:** React Native / Expo, `react-native-reanimated` (worklets, `useAnimatedReaction`, `useAnimatedStyle`, `scrollTo`), jest (`jest-expo`, reanimated globally mocked).

## Global Constraints

- **Player only.** Do NOT modify `KaraokeLetter`, the onboarding Letter, `ReadMode`, or the no-timings fallback (spec §2).
- **No backend/data change** — reuse `KaraokeLine { index; text; words: WordTiming[]; startMs; endMs }` and `WordTiming { word; startMs; endMs }` from `@/features/letter/karaoke` (spec §3).
- **Line opacities:** active = 1, past = 0.45, upcoming = 0.30 (spec §4).
- **Word glow (active line):** spoken = full primary; current = full opacity + `colors.accent.ember` tint; upcoming-in-line = 0.5 opacity (spec §4). Gentle — no scale/bounce/wipe.
- **Reduce Motion:** no per-word glow (active line renders uniformly bright, line-level only) and no smooth scroll (spec §4). Line states still apply.
- **No raw hex in feature code** — colors come from `useTheme()` tokens only.
- **Worklet-safety:** functions called inside reanimated worklets carry the `'worklet'` directive.
- **Commit after every task**, ending the message with the repo `Co-Authored-By` trailer.

---

### Task 1: Pure state math — `lyricsState.ts`

**Files:**

- Create: `apps/mobile/src/features/player/lyricsState.ts`
- Create: `apps/mobile/src/features/player/lyricsState.test.ts`

**Interfaces:**

- Consumes: `KaraokeLine`, `WordTiming` from `@/features/letter/karaoke`.
- Produces:
  - `activeLineIndex(lines: KaraokeLine[], positionMs: number): number` — `'worklet'`.
  - `lineState(index: number, activeIndex: number): 'active' | 'past' | 'upcoming'` — `'worklet'`.
  - `wordState(word: WordTiming, positionMs: number): 'spoken' | 'current' | 'upcoming'` — `'worklet'`.

- [ ] **Step 1: Write the failing test** — `apps/mobile/src/features/player/lyricsState.test.ts`

```ts
import type { KaraokeLine } from '@/features/letter/karaoke';

import { activeLineIndex, lineState, wordState } from './lyricsState';

const line = (index: number, startMs: number): KaraokeLine => ({
  index,
  text: `line ${index}`,
  words: [],
  startMs,
  endMs: startMs + 1000,
});

describe('activeLineIndex', () => {
  const lines = [line(0, 0), line(1, 1000), line(2, 2000)];

  it('is -1 before the first line starts', () => {
    // startMs of the first line is 0, so strictly before is negative time.
    expect(activeLineIndex(lines, -1)).toBe(-1);
  });

  it('picks the last line whose start is at or behind the position', () => {
    expect(activeLineIndex(lines, 0)).toBe(0);
    expect(activeLineIndex(lines, 1500)).toBe(1);
    expect(activeLineIndex(lines, 9999)).toBe(2);
  });
});

describe('lineState', () => {
  it('maps active, past and upcoming around the active index', () => {
    expect(lineState(2, 2)).toBe('active');
    expect(lineState(1, 2)).toBe('past');
    expect(lineState(3, 2)).toBe('upcoming');
  });
});

describe('wordState', () => {
  const word = { word: 'hi', startMs: 1000, endMs: 1500 };

  it('is upcoming before the word starts', () => {
    expect(wordState(word, 999)).toBe('upcoming');
  });

  it('is current from startMs through endMs inclusive', () => {
    expect(wordState(word, 1000)).toBe('current');
    expect(wordState(word, 1250)).toBe('current');
    expect(wordState(word, 1500)).toBe('current');
  });

  it('is spoken once past endMs', () => {
    expect(wordState(word, 1501)).toBe('spoken');
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `cd apps/mobile && pnpm exec jest src/features/player/lyricsState.test.ts`
Expected: FAIL — `Cannot find module './lyricsState'`.

- [ ] **Step 3: Implement** — `apps/mobile/src/features/player/lyricsState.ts`

```ts
import type { KaraokeLine, WordTiming } from '@/features/letter/karaoke';

export type LineGlow = 'active' | 'past' | 'upcoming';
export type WordGlow = 'spoken' | 'current' | 'upcoming';

/**
 * Index of the line being spoken: the last line whose start is at or behind the
 * position. -1 before the first line. `'worklet'` so the auto-scroll reaction can
 * call it on the UI thread; it runs as ordinary JS under jest and in unit tests.
 */
export function activeLineIndex(lines: KaraokeLine[], positionMs: number): number {
  'worklet';
  let found = -1;
  for (let i = 0; i < lines.length; i++) {
    if ((lines[i]?.startMs ?? 0) <= positionMs) found = i;
    else break;
  }
  return found;
}

/** Where a line sits relative to the one being spoken. */
export function lineState(index: number, activeIndex: number): LineGlow {
  'worklet';
  if (index === activeIndex) return 'active';
  return index < activeIndex ? 'past' : 'upcoming';
}

/**
 * Where a word sits in the glow sweep. Current spans [startMs, endMs] inclusive so
 * a word never blinks dark between its own start and end.
 */
export function wordState(word: WordTiming, positionMs: number): WordGlow {
  'worklet';
  if (positionMs > word.endMs) return 'spoken';
  if (positionMs >= word.startMs) return 'current';
  return 'upcoming';
}
```

- [ ] **Step 4: Run — verify it passes**

Run: `cd apps/mobile && pnpm exec jest src/features/player/lyricsState.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + lint**

Run: `cd apps/mobile && pnpm exec tsc --noEmit && pnpm exec eslint src/features/player/lyricsState.ts src/features/player/lyricsState.test.ts`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/player/lyricsState.ts apps/mobile/src/features/player/lyricsState.test.ts
git commit -m "$(cat <<'EOF'
feat(mobile): pure state math for player synced lyrics (line + word glow)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `SyncedLyrics` component

**Files:**

- Create: `apps/mobile/src/features/player/SyncedLyrics.tsx`
- Create: `apps/mobile/src/features/player/SyncedLyrics.test.tsx`

**Interfaces:**

- Consumes: `activeLineIndex`, `wordState` from `./lyricsState`; `KaraokeLine`, `WordTiming` from `@/features/letter/karaoke`; `useMotion` from `@/theme/motion` (`{ reduceMotion, scale }`); `useTheme`.
- Produces: `SyncedLyrics({ lines, positionMs, testID })` where `positionMs: SharedValue<number>`.

- [ ] **Step 1: Write the failing test** — `apps/mobile/src/features/player/SyncedLyrics.test.tsx`

Reanimated is globally mocked (jest.setup), so `useAnimatedReaction` is a no-op and the active index stays at its initial `-1` — every line renders as static text. The test therefore verifies structure: all line text renders, and the container is present.

```tsx
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import type { KaraokeLine } from '@/features/letter/karaoke';
import { MotionProvider } from '@/theme/motion';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { SyncedLyrics } from './SyncedLyrics';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider forceScheme="light">
      <MotionProvider>{children}</MotionProvider>
    </ThemeProvider>
  );
}

const LINES: KaraokeLine[] = [
  { index: 0, text: 'the first evening', words: [], startMs: 0, endMs: 900 },
  { index: 1, text: 'it feels easy', words: [], startMs: 900, endMs: 1800 },
];

function Harness() {
  const positionMs = useSharedValue(0);
  return <SyncedLyrics lines={LINES} positionMs={positionMs} testID="synced" />;
}

const hidden = { includeHiddenElements: true } as const;

describe('SyncedLyrics', () => {
  it('renders every line of the moment', async () => {
    await render(<Harness />, { wrapper });

    expect(screen.getByText('the first evening')).toBeTruthy();
    expect(screen.getByText('it feels easy')).toBeTruthy();
  });

  it('exposes its container by testID', async () => {
    await render(<Harness />, { wrapper });
    expect(screen.getByTestId('synced', hidden)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `cd apps/mobile && pnpm exec jest src/features/player/SyncedLyrics.test.tsx`
Expected: FAIL — `Cannot find module './SyncedLyrics'`.

- [ ] **Step 3: Implement** — `apps/mobile/src/features/player/SyncedLyrics.tsx`

```tsx
import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  runOnJS,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { KaraokeLine, WordTiming } from '@/features/letter/karaoke';
import { useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, fonts, typography } from '@/theme/typography';

import { activeLineIndex, wordState } from './lyricsState';

/** Line opacities (spec §4). */
const PAST_LINE_OPACITY = 0.45;
const UPCOMING_LINE_OPACITY = 0.3;
/** A not-yet-spoken word inside the active line still half-shows so the line reads as filling in. */
const UPCOMING_WORD_OPACITY = 0.5;

export interface SyncedLyricsProps {
  lines: KaraokeLine[];
  positionMs: SharedValue<number>;
  testID?: string;
}

/**
 * The moment player's synced lyrics (spec 2026-08-06): all lines visible, the
 * active line centered and brightest, past dimmed, upcoming faint, with a soft
 * ember word-by-word glow sweeping the active line. Distinct from the Letter's
 * `KaraokeLetter` "materialize with the voice" reveal, which is untouched.
 *
 * Per-frame work is on the UI thread (worklets read `positionMs`); the only JS
 * transition is the active-line index changing every few seconds, which re-splits
 * the newly-active line into per-word nodes.
 */
export function SyncedLyrics({ lines, positionMs, testID }: SyncedLyricsProps) {
  const { colors, spacing } = useTheme();
  const motion = useMotion();
  const { height } = useWindowDimensions();
  const scale = clampedFontScale();

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const offsets = useSharedValue<number[]>([]);
  const [active, setActive] = useState(-1);

  // One reaction: recompute the spoken line on the UI thread, scroll it toward
  // centre, and (only on change) re-split it into words on the JS thread.
  useAnimatedReaction(
    () => activeLineIndex(lines, positionMs.value),
    (index, previous) => {
      if (index < 0 || index === previous) return;
      const y = offsets.value[index];
      if (y !== undefined) {
        // Park the spoken line a little above centre — reading sits naturally high.
        scrollTo(scrollRef, 0, Math.max(0, y - height * 0.4), !motion.reduceMotion);
      }
      runOnJS(setActive)(index);
    },
    [lines, height, motion.reduceMotion],
  );

  const lineTextStyle = {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic' as const,
    fontSize: (typography.letterLine.fontSize ?? 22) * scale,
    lineHeight: (typography.letterLine.lineHeight ?? 38) * scale,
    color: colors.text.primary,
    marginBottom: spacing.md,
  };

  const onLayoutY = (index: number, y: number) => {
    const next = [...offsets.value];
    next[index] = y;
    offsets.value = next;
  };

  return (
    <Animated.ScrollView
      ref={scrollRef}
      testID={testID}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: height * 0.4,
        paddingBottom: height * 0.5,
        paddingHorizontal: spacing.lg,
      }}
    >
      {lines.map((line, index) =>
        index === active && !motion.reduceMotion ? (
          <ActiveLine
            key={line.index}
            line={line}
            positionMs={positionMs}
            textStyle={lineTextStyle}
            onLayoutY={(y) => onLayoutY(index, y)}
          />
        ) : (
          <Animated.Text
            key={line.index}
            accessibilityRole="text"
            allowFontScaling={false}
            onLayout={(e) => onLayoutY(index, e.nativeEvent.layout.y)}
            style={[
              lineTextStyle,
              {
                opacity:
                  index === active ? 1 : index < active ? PAST_LINE_OPACITY : UPCOMING_LINE_OPACITY,
              },
            ]}
          >
            {line.text}
          </Animated.Text>
        ),
      )}
    </Animated.ScrollView>
  );
}

interface ActiveLineProps {
  line: KaraokeLine;
  positionMs: SharedValue<number>;
  textStyle: object;
  onLayoutY: (y: number) => void;
}

/** The spoken line, rendered as words so the glow can sweep through it. */
function ActiveLine({ line, positionMs, textStyle, onLayoutY }: ActiveLineProps) {
  return (
    <Animated.Text
      accessibilityRole="text"
      allowFontScaling={false}
      onLayout={(e) => onLayoutY(e.nativeEvent.layout.y)}
      style={textStyle}
    >
      {line.words.map((word, i) => (
        <SyncedWord key={i} word={word} positionMs={positionMs} />
      ))}
    </Animated.Text>
  );
}

function SyncedWord({ word, positionMs }: { word: WordTiming; positionMs: SharedValue<number> }) {
  const { colors } = useTheme();

  const style = useAnimatedStyle(() => {
    const state = wordState(word, positionMs.value);
    if (state === 'current') return { color: colors.accent.ember, opacity: 1 };
    if (state === 'upcoming') return { color: colors.text.primary, opacity: UPCOMING_WORD_OPACITY };
    return { color: colors.text.primary, opacity: 1 };
  });

  return <Animated.Text style={style}>{`${word.word} `}</Animated.Text>;
}

/** Exported for tests / reuse — the dim figures are product numbers (spec §4). */
export const SYNCED_PAST_OPACITY = PAST_LINE_OPACITY;
export const SYNCED_UPCOMING_OPACITY = UPCOMING_LINE_OPACITY;
```

- [ ] **Step 4: Run — verify it passes**

Run: `cd apps/mobile && pnpm exec jest src/features/player/SyncedLyrics.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck + lint**

Run: `cd apps/mobile && pnpm exec tsc --noEmit && pnpm exec eslint src/features/player/SyncedLyrics.tsx src/features/player/SyncedLyrics.test.tsx`
Expected: no errors. (If `typography.letterLine` typing complains about optional fontSize, keep the `?? 22` / `?? 38` fallbacks shown — they mirror `KaraokeLetter`.)

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/player/SyncedLyrics.tsx apps/mobile/src/features/player/SyncedLyrics.test.tsx
git commit -m "$(cat <<'EOF'
feat(mobile): SyncedLyrics — calm word-glow lyrics view for the player

All lines visible, active line centered + brightest, past dimmed, upcoming faint,
with a soft ember word-by-word glow sweeping the active line (own-created voice
timings). Reduce Motion falls back to line-level highlight + no smooth scroll.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Swap it into the player

**Files:**

- Modify: `apps/mobile/src/features/player/PlayerScreen.tsx:137–139` (the play-mode karaoke call site)

**Interfaces:**

- Consumes: `SyncedLyrics` from `./SyncedLyrics` (Task 2).

- [ ] **Step 1: Add the import** — edit `apps/mobile/src/features/player/PlayerScreen.tsx`

Beside the existing `KaraokeLetter` import (near the top):

```ts
import { SyncedLyrics } from './SyncedLyrics';
```

- [ ] **Step 2: Replace the play-mode renderer** — same file, lines 137–139

Change:

```tsx
        ) : moment.lines.length > 0 ? (
          // When timings exist the karaoke IS the cover (v4 §player).
          <KaraokeLetter lines={moment.lines} positionMs={position} testID="player-karaoke" />
        ) : (
```

to:

```tsx
        ) : moment.lines.length > 0 ? (
          // Synced lyrics ARE the cover (v4 §player). Distinct from the Letter's
          // reveal — see SyncedLyrics (spec 2026-08-06).
          <SyncedLyrics lines={moment.lines} positionMs={position} testID="player-karaoke" />
        ) : (
```

Leave the `ReadMode` branch (130–136) and the no-timings fallback (140+) unchanged. If `KaraokeLetter` is now an unused import in this file, remove that import line (only if nothing else in the file uses it — check first).

- [ ] **Step 3: Typecheck + lint + player tests**

Run: `cd apps/mobile && pnpm exec tsc --noEmit && pnpm exec eslint src/features/player/PlayerScreen.tsx && pnpm exec jest src/features/player`
Expected: no type/lint errors; all player tests PASS (`player-karaoke` testID still present, so any test asserting it still passes).

- [ ] **Step 4: Full mobile suite (no regression to Letter/player)**

Run: `cd apps/mobile && pnpm exec jest`
Expected: all suites PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/player/PlayerScreen.tsx
git commit -m "$(cat <<'EOF'
feat(mobile): use SyncedLyrics in the moment player (Letter reveal unchanged)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**

- §3 new isolated `SyncedLyrics`, swapped at PlayerScreen 137–139 → Tasks 2, 3. ✓
- §4 line states (active/past/upcoming opacities) → Task 2 (`PAST_LINE_OPACITY`/`UPCOMING_LINE_OPACITY`). ✓
- §4 word glow (spoken/current-ember/upcoming) → Tasks 1 (`wordState`), 2 (`SyncedWord`). ✓
- §4 active line centered + auto-scroll → Task 2 (`scrollTo` on the reaction). ✓
- §4 Reduce Motion (no glow, no smooth scroll) → Task 2 (`!motion.reduceMotion` gates the word split and the `scrollTo` animated flag). ✓
- §5 pure `lyricsState` extracted + unit-tested → Task 1. ✓
- §6 tokens only (`text.primary`, `accent.ember`), opacity consts named → Task 2. ✓
- §7 tests (pure state math + structural render) → Tasks 1, 2. ✓
- §2 non-goals: `KaraokeLetter`/Letter/`ReadMode`/fallback untouched → only PlayerScreen 137–139 changes (Task 3). ✓

**Placeholder scan:** none — every step has full code and exact commands. The one judgment call (remove the now-possibly-unused `KaraokeLetter` import) is explicitly conditioned on checking the file first.

**Type consistency:** `activeLineIndex(lines, positionMs)`, `wordState(word, positionMs)`, `lineState(index, activeIndex)` signatures match between Task 1's definitions/tests and Task 2's usage. `SyncedLyrics({ lines, positionMs, testID })` matches between Task 2 and the Task 3 call site. `KaraokeLine`/`WordTiming` field names (`index`, `text`, `words`, `startMs`, `endMs` / `word`, `startMs`, `endMs`) match the real types in `@/features/letter/karaoke`.
