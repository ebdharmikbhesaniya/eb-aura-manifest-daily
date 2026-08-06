# Player Synced Lyrics (calm word-glow) — Design

- **Date:** 2026-08-06
- **Status:** Approved (brainstorming), pending implementation plan

## 1. Goal

Make the moment **player's** synced lyrics read as "proper" — the way Apple Music
does it — but in Aura's calm, literary register. Today the player reuses the
onboarding Letter's `KaraokeLetter`, which reveals whole **lines** as they're
spoken and hides everything upcoming, leaving dead space and no word-level sync
(even though each line already carries per-word timings). The new view shows all
lines, centers the active one, dims the past, keeps the upcoming faint, and adds
a **soft word-by-word "glow"** through the active line.

**Scope:** player only. The onboarding **Letter** (`KaraokeLetter`) and its
"materialize with the voice" wow are **untouched**.

## 2. Non-goals (YAGNI)

- No change to `KaraokeLetter` or the onboarding Letter.
- No tap-to-seek on lines, no new player controls.
- No backend/data change — `word_timings` already exist and are grouped into
  `KaraokeLine[]` with per-word `WordTiming[]`.
- No bouncing "karaoke ball" / energetic fill — the glow is a gentle brightness
  sweep, not a wipe.
- Read mode (`ReadMode`) and the no-timings fallback are unchanged.

## 3. Architecture — a new, isolated component

Add **`SyncedLyrics`** (`apps/mobile/src/features/player/SyncedLyrics.tsx`) and
swap it into `PlayerScreen` at the single play-mode call site
(`PlayerScreen.tsx:137–139`), replacing `<KaraokeLetter … testID="player-karaoke">`.
Everything reads `positionMs` in reanimated worklets on the UI thread, matching
the existing pattern.

```
PlayerScreen (mode !== 'read', lines.length > 0)
  → SyncedLyrics { lines: KaraokeLine[], positionMs: SharedValue<number>, testID }
```

Reuses existing types from `features/letter/karaoke.ts`:
`KaraokeLine { index; text; words: WordTiming[]; startMs }`,
`WordTiming { word; startMs; endMs }`.

## 4. Behavior

### Line states (per line, worklet-driven opacity)

- **Active** (the line currently being spoken) → opacity 1, primary color, and it
  is the scroll target (centered).
- **Past** (spoken, before active) → opacity ~0.45.
- **Upcoming** (after active) → opacity ~0.30 — the look-ahead.

The active index is found the same way `KaraokeLetter` does: the last line whose
`startMs <= positionMs` (inlined in a worklet).

### Word-glow (within the active line only)

Using the active line's `words[]`, each word resolves to one of three states from
`positionMs`:

- **Spoken** (`positionMs > word.endMs`) → full brightness (primary, opacity 1).
- **Current** (`word.startMs <= positionMs <= word.endMs`) → a soft **ember glow**:
  full opacity + a tint toward `colors.accent.ember` (ember is reserved for
  voice/audio in the design system, so it ties the highlight to the voice). No
  scale/bounce.
- **Upcoming-in-line** (`positionMs < word.startMs`) → mid-dim (opacity ~0.5) so
  the active line reads as "half-lit, filling in."

Only the **active** line renders its words as individual animated nodes (2–6 at a
time); past/upcoming lines render as a single static dimmed `Text`. The active
index change is the one JS-thread transition (≈ once per line, every few seconds),
which re-splits the newly-active line into word nodes; per-frame work stays on the
UI thread.

### Auto-scroll & layout

- The active line smoothly scrolls to the **vertical center** of the lyrics area.
- Top/bottom padding = ~half the lyrics-area height so the first and last lines
  can also center. No dead space.
- The lyrics area is the flex region between the player header and the
  waveform/controls (unchanged around it).

### Reduce Motion

Honored: no glow-tint animation and no smooth scroll easing — jump to the states
and positions. Same posture as `KaraokeLetter` today.

## 5. Components & boundaries

- **`SyncedLyrics`** — the scroll view + line list + auto-scroll worklet. Owns
  layout and the active-line reaction.
- **`SyncedLyricsLine`** (internal) — one line; when active, maps `words[]` to
  `SyncedWord` nodes; otherwise a static dimmed `Text`.
- **`SyncedWord`** (internal) — one animated word; its worklet computes
  spoken/current/upcoming from `positionMs` + its `startMs`/`endMs`.
- **`lyricsState.ts`** (pure, `features/player/`) — the state math, extracted so
  it is unit-testable without reanimated: `activeLineIndex(lines, positionMs)`,
  `lineState(index, activeIndex)` → 'active'|'past'|'upcoming',
  `wordState(word, positionMs)` → 'spoken'|'current'|'upcoming'.

## 6. Colors / tokens

All from the theme (no raw hex — feature-code lint forbids it):

- Active/spoken text: `colors.text.primary`.
- Past: `colors.text.primary` @ ~0.45 opacity. Upcoming: ~0.30.
- Current-word glow tint: `colors.accent.ember`.
- Opacity constants live as named consts in the component (like
  `KARAOKE_DIM_OPACITY`).

## 7. Testing

- **`lyricsState.test.ts`** (pure): `activeLineIndex` picks the last line at/behind
  position (and −∞ before the first); `lineState` maps active/past/upcoming;
  `wordState` maps spoken/current/upcoming at boundary conditions (exactly at
  `startMs`, exactly at `endMs`, between words).
- **`SyncedLyrics.test.tsx`**: the active line renders per-word nodes
  (testIDs), non-active lines render a single text; upcoming lines are present
  (look-ahead) but dimmed; hidden-from-a11y where placeholders would confuse
  screen readers (follow existing patterns).
- No regression to `KaraokeLetter`, `ReadMode`, or the Letter tests.

## 8. Risks

- **Low.** Isolated new component; the wow is untouched. The one thing to verify
  on-device is the auto-scroll centering across short/long moments and that the
  active-line JS transition doesn't visibly stutter (it changes every few
  seconds, not per frame).
