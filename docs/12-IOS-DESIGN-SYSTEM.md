# 12 — DESIGN SYSTEM — Aura Design v3 "Ember & Bone"

Source of truth: the Claude Design project file `Aura Design v3.dc.html`; implemented 1:1 in `apps/mobile/src/theme/` (`palette.ts` → `tokens.ts` → `typography.ts` → `ThemeProvider`). **Every design value in the app resolves through those files — a raw hex or font size in feature code is a lint error.**

## Design principles

1. **Calm is the brand.** Whitespace, unhurried motion. Nothing shouts.
2. **Editorial warmth.** Bone backgrounds, white cards, serif display type with the signature ember period.
3. **Ember is earned.** The ember gradient appears ONLY where the app speaks or plays (voice, audio, the letter). Actions are ink pills. Everything else is bone, white and olive.
4. **Typography is the hero.** Affirmations and letters ARE the product; type gets the budget. The future self speaks in italic serif, always.
5. **Photography, never illustration.**

## Color tokens

| Token        | Hex                 | Use                                                                            |
| ------------ | ------------------- | ------------------------------------------------------------------------------ |
| Bone / bg    | `#ECE9DF`           | every screen background (`bg.base`; gradient settles into `#E2DECF`)           |
| Surface      | `#FFFFFF`           | cards, sheets, bars                                                            |
| Ink          | `#1B1810`           | headings, CTAs, the FAB (`text.primary`, `cta.background`)                     |
| Ink / body   | `#4A4536`           | long-form body text (`text.body`)                                              |
| Ink / muted  | `#6F6A58`           | secondary text (`text.secondary`)                                              |
| Olive        | `#8A8265`           | captions/labels, selected chips (`text.label`, `accent.olive`)                 |
| Olive / soft | `#DAD5BE`           | hairline borders, resting chips (`surface.border`, `accent.oliveSoft`)         |
| Ember        | `#F2A96F → #E2682F` | voice & audio only — the gradient, the orb (`accent.emberSoft`/`accent.ember`) |
| Ember / deep | `#C9531F`           | links, progress, the voice serif (`cta.link`, `accent.emberDeep`)              |
| Blush        | `#F6D3DF`           | marked days, hearts, gratitude fills (`accent.blush`; soft `#FBEAF0`)          |
| Parchment    | `#F4EBD6`           | affirmation surfaces (`accent.parchment`)                                      |
| Rust / alert | `#9E2B12`           | errors only (`text.destructive`)                                               |
| Cream        | `#F5F2E8`           | text/glyphs on ink fills (`text.onCta`)                                        |

Dark mode is the same warm world after sundown — ink-brown bases (`#171410`/`#242019`, never grey or black), cream pills for action, ember untouched. Derived in `tokens.ts`.

**Avoid:** saturated red/neon, cold clinical greys, decorative ember, celebratory confetti near vulnerable content.

## Typography

Newsreader (serif) + Figtree (sans), bundled via expo-google-fonts.

- **display** — Newsreader 500 · 34/40 · −1% (hero statements; the ember period is the brand mark)
- **title** — Newsreader 500 · 24/30 · **sheetTitle** — 22/30 · **momentTitle** — 22/28
- **letterLine (the voice)** — Newsreader italic 500 · 22/38 — ONLY when the future self speaks · **affirmationHero** — italic 30/45
- **headline** — Figtree 700 · 16/22 · **body** — Figtree 400 · 15/24 · **bodySmall/caption** — Figtree 500 · 13/19
- **label** — Figtree 600 · 11/15, uppercase, letter-spaced ("TODAY'S MOMENT" wayfinding)
- **button** — Figtree 600 · 15/20. Weight always lives in the font family, never `fontWeight`.
- Dynamic Type: everything scales; serif display surfaces clamp 0.85–1.4 via `clampedFontScale()`/`scaledType()`; chips reflow to lists past fontScale 1.3.

## Spacing · 4pt grid

8 chip gaps · 12 inside rows/gutters · 20 card padding & screen margins · 32 section gaps · 56 hero breathing room. Whitespace is the premium signal — when in doubt, add space and cut an element.

## Radius & elevation

chip 14 · field 16 · card 22 · pill/FAB fully round. One shadow: `0 12 32 ink/10` (`shadows.card`); a softer `shadows.field` for focused fields; dashed outlines mark future/empty slots.

## Components

- **Buttons:** primary = ink pill 54pt, cream label; secondary = white outline pill 50; text link = ember-deep, 44; disabled = `#E5E1D2` fill. Press: opacity .85, scale .98.
- **Chips:** selected = olive fill, rest = white with hairline. No color-per-tag.
- **Day marks:** blush = wrote gratitude · olive = today · dashed = future. Missed days look like nothing — never red.
- **Inputs:** white on card surface, olive focus glow (`shadows.focusGlow`), never harsh validation reds.
- **Cards:** white on bone, radius 22; parchment for affirmations; photo cards with parchment caption strips.
- **Tab bar:** floating white pill, ink FAB with ember halo, ember underline on the active tab.
- **The Orb:** blush-highlight → ember radial sphere (`orb.shimmer/core/halo`), breathing; it is the companion's body — onboarding, generation, player. Never bounces, never cartoons.
- **Voice & audio surfaces:** the ember gradient card = the app is listening/speaking; waveforms use ember for progress, `emberFaint` for the remainder.
- **Loading / empty states:** the orb + one line of in-voice copy — never bare spinners; skeletons shimmer softly on bone.
