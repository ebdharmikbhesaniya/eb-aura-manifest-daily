# 21 — DESIGN REFERENCE REVIEW (screenshot audit → one unified system)

> Input: 4 reference screenshots shared 2026-07-20 — (A) an olive/lime meditation app,
> (B) a mint pastel activity tracker, (C+D) "EMBr", a warm cream/orange cycle companion
> (two screenshots of the same app). This doc scores each against Aura's identity
> (00, 01, 12, 14) and distills the parts worth adopting into one system.

## The bar every borrowed idea must clear

Aura sells one feeling: **"this app knows me."** Warm, calm, literary, quietly magical,
premium — never clinical, never cutesy, never loud (00, 14). Anything we copy from a
reference must survive doc 12's avoid-list (no saturated red/neon, no clinical white,
no confetti) and doc 14's voice (no fake-positive energy).

---

## Reference A — Olive/lime meditation app ("Step Into Your Peaceful Mind")

**Alignment: high on structure, wrong on temperature.**

Take:

- **One dark high-contrast color on a pale field.** Their dark-olive pill CTA against
  pastel lime is exactly our periwinkle-on-warm-white strategy (12 §buttons). It proves
  the pattern: calm apps earn premium feel from *one* assertive color, used rarely.
- **Continuous line-art figures over soft organic blobs.** This is the illustration
  style doc 12 already asks for ("soft line illustrations, diverse and warm, never
  stocky") — single-stroke, abstract-enough to be *anyone*, so the user projects
  herself in. Adopt as our illustration grammar for dream-home cards and onboarding.
- **Waveform player with elapsed/remaining times.** Clean model for our audio player
  and (later) voice gratitude — played bars in accent color, unplayed in border color.
- **Floating pill tab bar** — already in our system (12 §navigation), validated here.

Leave:

- The **lime/yellow-green world**. It reads "fresh/fitness," not "dreamy/known."
  Our warmth comes from lavender + sand, not citrus.
- The **emoji mood-face row** (red angry "Anxious" face). Saturated red on an anxious
  state is precisely the fight-or-flight trigger doc 12 bans, and mood check-ins are
  not our mechanic — Aura asks for one gratitude line, not a mood score.

## Reference B — Mint pastel activity tracker ("Hi, Alice")

**Alignment: low. Closest to our anti-pattern.**

Take (only):

- The **conversational input pill** ("How do you feel today, dear?" + mic) — a strong
  shape for the one-line gratitude entry: borderless, warm placeholder in companion
  voice, single mic/plus affordance.
- Its **generosity of whitespace** around the greeting.

Leave:

- Cartoon character illustrations, candy multi-pastel stat cards, the donut mascot.
  This is Finch's register — playful, young, gamified. It contradicts "premium,
  literary, quietly magical" and would repel the Quiet Dreamer paying for depth (02).
- "You've been doing great!" cheer-copy — doc 14 bans fake-positive; our milestones
  quote the user's own past words instead.

## References C + D — "EMBr" cycle companion (cream/orange, serif)

**Alignment: highest by far. This is Aura's closest visual cousin.**

Take:

- **Serif display as the emotional voice.** Headers, greetings ("Good morning,
  Maria!"), section titles in a literary serif; sans for UI. This is doc 12
  §typography, proven live. Note their serif skews editorial/medical — ours should be
  a touch softer and rounder (a refined transitional serif with warm italics for
  moment titles).
- **Warm cream/sand neutrals** instead of clinical white — identical to our
  warm-white/sand base. Validates the whole neutral family.
- **One gradient surface per screen, owned by the companion.** The orange "Chat with
  EMBr" card is the only loud thing on the screen — everything else is quiet cream.
  Adopt the *pattern*, not the hue: our "Today's Moment" hero card gets the one
  glassy/gradient treatment (12 §cards) and the rest of Home stays sand.
- **The phase orb.** Their soft gradient sphere with a status line under it is
  structurally our Orb (12 §signature). Theirs is static; ours breathes — keep that
  difference, it's our signature.
- **Voice-first input with waveform + delete** — the most intimate input modality;
  matches "in your words, in your ears."
- **Gentle chips** (symptom tags → our feeling/refine chips): sand-tinted, selected =
  filled warm neutral, no borders shouting.
- **Quiet calendar day-tokens** (filled/dashed/dotted states, tiny dot annotations) —
  the model for gratitude history and the moment archive: presence marked softly,
  absence never marked at all (14 §missed days).
- **The affirming toast** ("You're doing your best — and your body notices") — a
  small in-voice line in a soft tinted bar. This is doc 14's register as a component;
  we should have it (`CompanionLine`), used for reflections after gratitude entries.
- **Photography used sparingly and sensory** (sunlight on skin) — matches our
  affirmation-share flow's user-photo backgrounds; never stock-smiley.

Leave:

- The **orange itself** — it's their brand. Ours is lavender/periwinkle; our "warm
  glow" comes from blush + a dawn-peach gradient stop (below), not brand orange.
- Their density on the chat screen — Aura is *not a chatbot* in V1 (00); the
  companion speaks in moments and letters, so we never build an open chat surface.

---

## The unified system: **Dawn & Dusk**

Everything above collapses into one language that our docs mostly already define and
`apps/mobile/src/theme/` mostly already implements. What follows is the synthesis plus
the concrete additions the references earned.

1. **Base world (from C/D):** warm-white `#FBF9F6` + sand `#EDE6DD` surfaces. Already
   in `palette.ts`. No change.
2. **One assertive color (validated by A):** periwinkle `#6C63B5` for CTA, active tab,
   play. Already in tokens. No change.
3. **Emotional gradient arc (new, replaces "one gradient fits all"):** doc 12 already
   says color follows the user's journey (dawn → dusk). Make it literal with two
   gradient families:
   - `gradient.dawn` — warm-white → blush `#F3D9DE` → soft peach `#F6E3D7` → pale
     lavender. Morning surfaces: Home at morning, Today's Moment hero, gratitude.
     This is how we get EMBr's warmth without orange.
   - `gradient.dusk` — warm-white → lavender → `#2A2540`. The Letter, evening
     surfaces, the player. (Current `bg.gradient*` tokens are this family.)
4. **Typography (validated by C/D):** display serif for letters/affirmations/titles
   (italic titles), humanist sans for UI, uppercase letter-spaced labels. As doc 12.
5. **Companion presence:** the breathing Orb is the brand mark; the single
   glassy/gradient hero card per screen is the companion's "voice" on that screen.
   Never two loud surfaces at once.
6. **Illustration grammar (from A):** continuous single-line figures over soft
   organic blob shapes, in lavender/sage/blush line weights — diverse, abstract,
   projectable. Used for dream cards and onboarding; the Orb everywhere else.
7. **Inputs (from B/C):** borderless pill with in-voice placeholder + mic; waveform
   recording state with delete; lavender focus glow; no validation reds.
8. **Quiet history (from C/D):** calendar/dots mark presence softly (filled sand
   token, tiny accent dot for "a moment lives here"); missed days are visually
   silent — extend `WeekDots` into this grammar, never streak-flame territory.
9. **Micro-affirmation component (from C):** `CompanionLine` — one serif/soft-sans
   sentence in a blush- or sage-tinted bar, used for post-entry reflections.

### Hard avoid-list (each seen in a reference, each off-brand)

Emoji mood faces · saturated red on emotional states · cartoon mascots ·
candy multi-pastel stat grids · cheer-copy ("You've been doing great!") ·
streak counters/badges · brand-orange gradients · open chat UI in V1.

## Gap list vs current code (`apps/mobile/src/theme`, `src/components`)

| Gap | Action |
| --- | --- |
| Only the dusk gradient family exists (`bg.gradientTop/Mid/Bottom`) | Add `gradient.dawn` + `gradient.dusk` token groups to `tokens.ts`; add `#F6E3D7` (dawn peach) to `palette.ts` |
| No waveform component | Add `Waveform` (player + recording variants): played = `accent.lavender`, unplayed = `surface.border` |
| No in-voice toast | Add `CompanionLine` component (tinted bar + one sentence, blush/sage variants) |
| `WeekDots` only | Extend to `MonthDots`/calendar day-token states: filled (entry), accent dot (moment), plain (nothing — never "missed") |
| No illustration guideline | Add line-art spec (single stroke, blob backing, palette line colors) to this doc's grammar §6 when the first dream-card art is commissioned |

Everything else the references validate is already specified in doc 12 and largely
implemented — the system is right; these are the finishing pieces.

## Related docs

Vision → 00 · Principles → 01 · Audience → 02 · Design system → 12 · Motion → 13 · Voice → 14
