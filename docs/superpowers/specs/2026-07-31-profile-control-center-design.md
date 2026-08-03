# Profile as a Control Center — Design

- **Date:** 2026-07-31
- **Status:** Approved (brainstorming), pending implementation plan

## 1. Goal

Turn the Profile tab from an unlabeled list into a **clear control center**:
organized labeled sections, subscription status made visible (chip + Account
row), and a way for anonymous users to secure their account — without adding
emotional/gamified elements (Aura bans scorecards, product 14). It stays a
utility surface: "everything in its place."

The redesign is **presentation + information architecture only**. No new backend,
no new data, no new stored fields. It reuses hooks that already exist.

## 2. Non-goals (YAGNI)

- **No avatar/photo, no journey/stats/streaks, no gamification** (product 14 —
  the "warm personal space" direction was explicitly not chosen).
- **No moving Settings onto Profile.** Notifications, sign-in/out, delete,
  support stay behind the gear. Account here surfaces only subscription status
  (the thing users check most) + the anonymous claim nudge.
- **No new subscription/claim logic.** Reuse the exact flows Settings already
  uses.
- **No copy the lint hasn't audited** — every new string goes in `profileCopy`.

## 3. Layout / information architecture

Top to bottom, replacing the current three-block page:

1. **Header** — name (editable, serif) + **plan chip** on the right of the name,
   then the gear, then the existing tagline underneath (kept, per decision).
   - Plan chip label from `useEntitlement()`: `premium && inTrial` → "Trial";
     `premium` → "Premium"; else → "Free". Tapping the chip →
     `router.push('/settings/subscription')`.
   - Chip is a small status pill (NOT the onboarding `Chip` component, which is a
     selectable filter). Premium/Trial use an accent tint; Free is a quiet
     neutral (bone/border), so "Free" never reads as an alert.

2. **ACCOUNT** section (new, labeled) — a `Label` "Account" over a `RowGroup`:
   - **Subscription** row: title `paywallCopy.subscription.title` ("Subscription");
     subtitle = the same status string Settings uses
     (`premium ? (inTrial ? trial : premium) : free`); onPress →
     `/settings/subscription`.
   - **Secure your account** row — rendered **only when `claimed === false`**
     (hidden while the check is in flight, and for signed-in users). Opens the
     `ClaimSheet` (same component/flow Settings uses). Title/subtitle from a new
     `profileCopy.account` block.

3. **MEMORY** section — a `Label` "Memory" over the existing `ProfileMemoryRows`
   (Basics, Dream city, Dream home, People, Note). Behavior unchanged; it just
   gains a section label instead of floating unlabeled.

4. **TRUST & PRIVACY** section — a `Label` "Trust & privacy" over the existing
   `ProfileTrustLinks` (Never include, What Aura knows) + the parchment privacy
   note. Behavior unchanged; gains a section label.

**Label placement (decided, not optional):** each section component renders its
OWN `Label` as its first child, so a section is a self-contained unit (heading +
rows). `ProfileAccountSection`, `ProfileMemoryRows` and `ProfileTrustLinks` each
own their label; `ProfileTab` just stacks the four blocks. This keeps `ProfileTab`
a thin composition and every section independently testable.

## 4. Components

- **`ProfileHeader`** (modify) — accepts `planLabel: string` and `planTint`
  ('accent' | 'neutral') and `onPressPlan: () => void`; renders the pill beside
  the name. Tagline stays.
- **`ProfilePlanChip`** (new, small) — the status pill. Props:
  `{ label: string; tint: 'accent' | 'neutral'; onPress: () => void }`. Pure
  presentation; no hooks.
- **`ProfileAccountSection`** (new) — the Account `Label` + `RowGroup`:
  Subscription row always, "Secure your account" row when `claimed === false`.
  Props: `{ subscriptionSubtitle: string; showClaim: boolean; onManage: () => void;
onSecure: () => void }`. Catalog-free, testable.
- **`ProfileMemoryRows`** (modify) — render a `Label` "Memory" as its first
  child, above the existing `RowGroup`.
- **`ProfileTrustLinks`** (modify) — render a `Label` "Trust & privacy" as its
  first child, above the existing rows.
- **`ProfileTab`** (modify) — wire `useEntitlement()` and `useAccountStatus()`,
  derive `planLabel`/`planTint`/`subscriptionSubtitle`/`showClaim`, render the new
  section, and host the `ClaimSheet` (ref) exactly as Settings does.

## 5. Data & flows (all existing)

- **`useEntitlement()`** → `{ premium, inTrial }` — drives the chip label and the
  subscription subtitle.
- **`useAccountStatus()`** → `{ claimed, appleAvailable }` — `claimed === false`
  gates the "Secure your account" row; `appleAvailable` is passed to `ClaimSheet`.
- **`ClaimSheet`** — same component Settings renders: props `ref`,
  `appleAvailable`, `onDone`. Triggered by `claimRef.current?.present()`.
- **Routing:** subscription row and plan chip → `/settings/subscription` (its own
  screen already offers upgrade for free users and manage/cancel for paid — no
  divergent routing here). Gear → `/settings` (unchanged).

## 6. Copy (new, in `profileCopy`)

Add an `account` block (banned-phrase lint audits it):

- `account.label`: "Account"
- `account.memoryLabel`: "Memory"
- `account.trustLabel`: "Trust & privacy"
- `account.plan.premium`: "Premium" · `account.plan.trial`: "Trial" ·
  `account.plan.free`: "Free"
- `account.secure.title`: "Secure your account"
- `account.secure.subtitle`: "Sign in so it’s waiting on any phone."

Subscription row reuses `paywallCopy.subscription.{title,premium,trial,free}`
(no duplication).

## 7. States

- **Loading:** while `profile`/entitlement resolve, the chip shows "Free" (safe
  default; `useEntitlement` defaults to free while loading) and the Account
  subscription subtitle shows the free string — corrected on resolve. No
  skeleton needed (single chip + one row).
- **Anonymous (`claimed === false`):** "Secure your account" row visible.
- **Claimed / in-flight (`claimed === true | undefined`):** row hidden.
- **Free vs Premium vs Trial:** chip + subtitle reflect the three states.

## 8. Testing

- `ProfilePlanChip` — renders the label; onPress fires.
- `ProfileAccountSection` — subscription row always present; "Secure your account"
  row present iff `showClaim`; onManage/onSecure fire.
- `ProfileTab` (extend existing `ProfileTab.test.tsx`) — chip label maps from
  entitlement (free/premium/trial); claim row shows only when `claimed === false`;
  section labels ("Account", "Memory", "Trust & privacy") render.
- No regression to memory-edit and people flows (existing tests stay green).

## 9. Risks

- **Low.** Presentation-only, reusing audited flows. The one thing to get right
  is mirroring Settings' subscription-subtitle + claim-sheet wiring exactly so
  the two surfaces never diverge.
- Copy must pass the banned-phrase lint (`copy-lint.test.ts`) — the new strings
  are plain and guilt-free by construction.

## 10. Out of scope / future

- A "warm personal space" (orb identity + gentle journey reflection) remains a
  possible future direction if you later want emotional weight on this tab — it
  was considered and deferred in favor of the control-center clarity.
