# Profile Control Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Profile tab into a clear control center — a plan chip + an Account section (subscription status + anonymous "Secure your account") + labeled Memory / Trust & privacy sections — reusing existing hooks and flows, no new backend or data.

**Architecture:** Presentation + information-architecture only. `ProfileTab` wires `useEntitlement` + `useAccountStatus`, derives the plan label / subtitle / claim visibility, and composes four self-labeled sections. A new `ProfilePlanChip` (pure) and `ProfileAccountSection` (subscription row + conditional claim row) are added; existing section components each gain their own `Label`. The claim flow reuses the exact `ClaimSheet` Settings uses.

**Tech Stack:** React Native / Expo, expo-router, `@tanstack/react-query`, `@gorhom/bottom-sheet`, jest + `@testing-library/react-native`.

## Global Constraints

- **Presentation/IA only** — no new backend, stored fields, subscription logic, or claim logic. Reuse `useEntitlement`, `useAccountStatus`, `ClaimSheet` (spec §1–§5).
- **No gamification** — no avatar, stats, streaks, badges (product 14; spec §2).
- **Plan chip label** from `useEntitlement()`: `premium && inTrial` → "Trial"; `premium` → "Premium"; else → "Free" (spec §3).
- **Plan chip tint:** Premium/Trial = `'accent'`; Free = `'neutral'` (Free must never read as an alert) (spec §3).
- **Subscription subtitle** = the SAME mapping Settings uses: `premium ? (inTrial ? paywallCopy.subscription.trial : paywallCopy.subscription.premium) : paywallCopy.subscription.free` (spec §3, §5). No new subscription copy.
- **"Secure your account" row shows only when `claimed === false`** — hidden for `true` and `undefined` (in-flight) (spec §3, §7).
- **Routing:** plan chip AND subscription row → `router.push('/settings/subscription')`; gear → `/settings` (unchanged) (spec §5).
- **Section labels:** each section component renders its OWN `Label` as its first child (spec §3 "Label placement").
- **New copy** lives in `profileCopy.account` and must pass `copy-lint.test.ts` (spec §6).
- **Commit after every task**, ending the message with the repo `Co-Authored-By` trailer.

---

### Task 1: Copy — `profileCopy.account` block

**Files:**

- Modify: `apps/mobile/src/copy/profile.ts`
- Test: `apps/mobile/src/copy/copy-lint.test.ts` (existing — run, don't edit)

**Interfaces:**

- Produces: `profileCopy.account.{label, memoryLabel, trustLabel, plan.{premium,trial,free}, secure.{title,subtitle}}`.

- [ ] **Step 1: Add the block** — edit `apps/mobile/src/copy/profile.ts`

Add an `account` key to the exported `profileCopy` object (place it after `tagline`, before `rows`):

```ts
  /** Control-center sections (spec 2026-07-31). Section headings + plan words. */
  account: {
    label: 'Account',
    memoryLabel: 'Memory',
    trustLabel: 'Trust & privacy',
    plan: {
      premium: 'Premium',
      trial: 'Trial',
      free: 'Free',
    },
    secure: {
      title: 'Secure your account',
      subtitle: 'Sign in so it’s waiting on any phone.',
    },
  },
```

- [ ] **Step 2: Run the copy lint + typecheck**

Run: `cd apps/mobile && pnpm exec jest src/copy/copy-lint.test.ts && pnpm exec tsc --noEmit`
Expected: copy-lint PASS, tsc no errors. (The strings are plain and guilt-free; if the lint flags a banned word, reword and re-run.)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/copy/profile.ts
git commit -m "$(cat <<'EOF'
feat(mobile): profile control-center copy (account/memory/trust labels, plan words)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `ProfilePlanChip` component

A small status pill — pure presentation, no hooks.

**Files:**

- Create: `apps/mobile/src/features/profile/ProfilePlanChip.tsx`
- Create: `apps/mobile/src/features/profile/ProfilePlanChip.test.tsx`

**Interfaces:**

- Produces: `ProfilePlanChip({ label, tint, onPress })` where `tint: 'accent' | 'neutral'`.

- [ ] **Step 1: Write the failing test** — `apps/mobile/src/features/profile/ProfilePlanChip.test.tsx`

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { ProfilePlanChip } from './ProfilePlanChip';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider forceScheme="light">{children}</ThemeProvider>;
}

describe('ProfilePlanChip', () => {
  it('renders its label', async () => {
    await render(<ProfilePlanChip label="Premium" tint="accent" onPress={() => {}} />, { wrapper });
    expect(screen.getByText('Premium')).toBeTruthy();
  });

  it('fires onPress', async () => {
    const onPress = jest.fn();
    await render(<ProfilePlanChip label="Free" tint="neutral" onPress={onPress} />, { wrapper });
    fireEvent.press(screen.getByText('Free'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `cd apps/mobile && pnpm exec jest src/features/profile/ProfilePlanChip.test.tsx`
Expected: FAIL — `Cannot find module './ProfilePlanChip'`.

- [ ] **Step 3: Implement** — `apps/mobile/src/features/profile/ProfilePlanChip.tsx`

```tsx
import { Pressable, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

export interface ProfilePlanChipProps {
  label: string;
  /** 'accent' for Premium/Trial; 'neutral' for Free (never reads as an alert). */
  tint: 'accent' | 'neutral';
  onPress: () => void;
}

/**
 * The subscription-status pill beside the name (spec §3). Pure presentation —
 * the caller maps entitlement to label/tint. Neutral Free uses the card surface
 * + border so it reads as a quiet fact, not a warning.
 */
export function ProfilePlanChip({ label, tint, onPress }: ProfilePlanChipProps) {
  const { colors, spacing, radii } = useTheme();
  const scale = clampedFontScale();

  const accent = tint === 'accent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID="profile-plan-chip"
      style={({ pressed }) => ({
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs / 2,
        borderRadius: radii.chip,
        backgroundColor: accent ? colors.accent.oliveSoft : colors.surface.card,
        borderWidth: accent ? 0 : 1,
        borderColor: colors.surface.border,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text
        allowFontScaling={false}
        style={[
          scaledType('bodySmall', scale),
          { color: accent ? colors.text.primary : colors.text.secondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 4: Run — verify it passes**

Run: `cd apps/mobile && pnpm exec jest src/features/profile/ProfilePlanChip.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck + lint**

Run: `cd apps/mobile && pnpm exec tsc --noEmit && pnpm exec eslint src/features/profile/ProfilePlanChip.tsx src/features/profile/ProfilePlanChip.test.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/profile/ProfilePlanChip.tsx apps/mobile/src/features/profile/ProfilePlanChip.test.tsx
git commit -m "$(cat <<'EOF'
feat(mobile): ProfilePlanChip — subscription-status pill for the profile header

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `ProfileAccountSection` component

The Account label + subscription row + conditional "Secure your account" row.

**Files:**

- Create: `apps/mobile/src/features/profile/ProfileAccountSection.tsx`
- Create: `apps/mobile/src/features/profile/ProfileAccountSection.test.tsx`

**Interfaces:**

- Consumes: `profileCopy.account` (Task 1), `paywallCopy.subscription`.
- Produces: `ProfileAccountSection({ subscriptionSubtitle, showClaim, onManage, onSecure })`.

- [ ] **Step 1: Write the failing test** — `apps/mobile/src/features/profile/ProfileAccountSection.test.tsx`

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { profileCopy } from '@/copy/profile';
import { paywallCopy } from '@/copy/paywall';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { ProfileAccountSection } from './ProfileAccountSection';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider forceScheme="light">{children}</ThemeProvider>;
}

const base = {
  subscriptionSubtitle: paywallCopy.subscription.premium,
  onManage: jest.fn(),
  onSecure: jest.fn(),
};

describe('ProfileAccountSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('always shows the Account label and Subscription row', async () => {
    await render(<ProfileAccountSection {...base} showClaim={false} />, { wrapper });
    expect(screen.getByText(profileCopy.account.label)).toBeTruthy();
    expect(screen.getByText(paywallCopy.subscription.title)).toBeTruthy();
  });

  it('opens subscription management on press', async () => {
    await render(<ProfileAccountSection {...base} showClaim={false} />, { wrapper });
    fireEvent.press(screen.getByText(paywallCopy.subscription.title));
    expect(base.onManage).toHaveBeenCalled();
  });

  it('shows "Secure your account" ONLY when showClaim is true', async () => {
    const { rerender } = await render(<ProfileAccountSection {...base} showClaim={false} />, {
      wrapper,
    });
    expect(screen.queryByText(profileCopy.account.secure.title)).toBeNull();

    rerender(<ProfileAccountSection {...base} showClaim />);
    expect(screen.getByText(profileCopy.account.secure.title)).toBeTruthy();
  });

  it('fires onSecure when the claim row is pressed', async () => {
    await render(<ProfileAccountSection {...base} showClaim />, { wrapper });
    fireEvent.press(screen.getByText(profileCopy.account.secure.title));
    expect(base.onSecure).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `cd apps/mobile && pnpm exec jest src/features/profile/ProfileAccountSection.test.tsx`
Expected: FAIL — `Cannot find module './ProfileAccountSection'`.

- [ ] **Step 3: Implement** — `apps/mobile/src/features/profile/ProfileAccountSection.tsx`

```tsx
import { View } from 'react-native';

import { IconTile, Label, ListRow, RowGroup } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { profileCopy } from '@/copy/profile';
import { useTheme } from '@/theme/ThemeProvider';

export interface ProfileAccountSectionProps {
  /** Status line under Subscription — the SAME mapping Settings uses. */
  subscriptionSubtitle: string;
  /** True only for anonymous (claimed === false) users. */
  showClaim: boolean;
  onManage: () => void;
  onSecure: () => void;
}

/**
 * The Account section of the control-center profile (spec §3): the plan status
 * you check most, with an action, plus an anonymous-only nudge to secure the
 * account. Everything else stays behind the gear. Self-labeled, so ProfileTab
 * just stacks the sections.
 */
export function ProfileAccountSection({
  subscriptionSubtitle,
  showClaim,
  onManage,
  onSecure,
}: ProfileAccountSectionProps) {
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <Label>{profileCopy.account.label}</Label>
      <RowGroup separatorInset="leading">
        <ListRow
          title={paywallCopy.subscription.title}
          subtitle={subscriptionSubtitle}
          leading={<IconTile tint="olive" />}
          onPress={onManage}
          testID="profile-subscription-row"
        />
        {showClaim && (
          <ListRow
            title={profileCopy.account.secure.title}
            subtitle={profileCopy.account.secure.subtitle}
            leading={<IconTile tint="blush" />}
            onPress={onSecure}
            testID="profile-secure-row"
          />
        )}
      </RowGroup>
    </View>
  );
}
```

- [ ] **Step 4: Run — verify it passes**

Run: `cd apps/mobile && pnpm exec jest src/features/profile/ProfileAccountSection.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck + lint**

Run: `cd apps/mobile && pnpm exec tsc --noEmit && pnpm exec eslint src/features/profile/ProfileAccountSection.tsx src/features/profile/ProfileAccountSection.test.tsx`
Expected: no errors. (If `IconTile` does not accept `tint="olive"`/`"blush"`, check `src/components` for the allowed tints and pick from those — the memory rows already use `olive`, `blush`, `parchment`.)

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/profile/ProfileAccountSection.tsx apps/mobile/src/features/profile/ProfileAccountSection.test.tsx
git commit -m "$(cat <<'EOF'
feat(mobile): ProfileAccountSection — subscription row + anonymous claim nudge

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Assemble the control-center profile

Wire the header chip, the Account section, section labels on Memory/Trust, and the ClaimSheet into `ProfileTab`; extend the existing test.

**Files:**

- Modify: `apps/mobile/src/features/profile/ProfileHeader.tsx` (accept + render the chip)
- Modify: `apps/mobile/src/features/profile/ProfileMemoryRows.tsx` (add "Memory" label)
- Modify: `apps/mobile/src/features/profile/ProfileTrustLinks.tsx` (add "Trust & privacy" label)
- Modify: `apps/mobile/src/features/profile/ProfileTab.tsx` (wire hooks, section, ClaimSheet)
- Modify: `apps/mobile/src/features/profile/ProfileTab.test.tsx` (mock hooks; assert)

**Interfaces:**

- Consumes: `ProfilePlanChip` (Task 2), `ProfileAccountSection` (Task 3), `useEntitlement` (`@/features/paywall/useEntitlement` → `{ premium, inTrial }`), `useAccountStatus` (`@/features/auth/useAccountStatus` → `{ claimed, appleAvailable }`), `ClaimSheet` (`@/features/paywall/ClaimSheet` → props `ref`, `appleAvailable`, `onDone`).

- [ ] **Step 1: Add the failing assertions** — edit `apps/mobile/src/features/profile/ProfileTab.test.tsx`

Add mocks for the two hooks near the existing `jest.mock` calls (both default to FREE + anonymous so the claim row and "Free" chip appear):

```ts
jest.mock('@/features/paywall/useEntitlement', () => ({
  useEntitlement: () => ({ premium: false, inTrial: false, loading: false, info: null }),
}));
jest.mock('@/features/auth/useAccountStatus', () => ({
  useAccountStatus: () => ({ claimed: false, appleAvailable: false }),
}));
```

Add a test inside the `describe`:

```ts
it('shows the control-center sections and a plan chip', async () => {
  const view = await render(<ProfileTab />, { wrapper });

  // Section labels are the "clearer" win.
  expect(await view.findByText(profileCopy.account.label)).toBeTruthy();
  expect(view.getByText(profileCopy.account.memoryLabel)).toBeTruthy();
  expect(view.getByText(profileCopy.account.trustLabel)).toBeTruthy();

  // Free + anonymous: the chip says Free and the secure-account row is present.
  expect(view.getByTestId('profile-plan-chip')).toBeTruthy();
  expect(view.getByText(profileCopy.account.plan.free)).toBeTruthy();
  expect(view.getByText(profileCopy.account.secure.title)).toBeTruthy();
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `cd apps/mobile && pnpm exec jest src/features/profile/ProfileTab.test.tsx`
Expected: FAIL — the new labels/chip/secure row are not rendered yet.

- [ ] **Step 3: Add the chip to `ProfileHeader`** — edit `apps/mobile/src/features/profile/ProfileHeader.tsx`

Add to `ProfileHeaderProps`:

```ts
  planLabel: string;
  planTint: 'accent' | 'neutral';
  onPressPlan: () => void;
```

Import the chip at the top:

```ts
import { ProfilePlanChip } from './ProfilePlanChip';
```

Render the chip between the name `Pressable` and the gear `Pressable` (inside the row `View`, after the name block):

```tsx
<ProfilePlanChip label={planLabel} tint={planTint} onPress={onPressPlan} />
```

Update the function signature to destructure the three new props:

```tsx
export function ProfileHeader({
  name,
  onEditName,
  onOpenSettings,
  planLabel,
  planTint,
  onPressPlan,
}: ProfileHeaderProps) {
```

- [ ] **Step 4: Add the "Memory" label** — edit `apps/mobile/src/features/profile/ProfileMemoryRows.tsx`

Import `Label` and `View`, and wrap the returned `RowGroup`:

```tsx
import { IconTile, Label, ListRow, RowGroup } from '@/components';
import { View } from 'react-native';
```

Change the `return (` block to:

```tsx
return (
  <View style={{ gap: 8 }}>
    <Label>{profileCopy.account.memoryLabel}</Label>
    <RowGroup separatorInset="leading">{/* ...existing ListRow children unchanged... */}</RowGroup>
  </View>
);
```

(Keep the five `ListRow` children exactly as they are; only the wrapping `View` + `Label` are new. Use `spacing.sm` from `useTheme()` instead of the literal `8` if the file already reads theme — match the file's existing style.)

- [ ] **Step 5: Add the "Trust & privacy" label** — edit `apps/mobile/src/features/profile/ProfileTrustLinks.tsx`

Import `Label`, and add it as the first child of the returned fragment, before the `RowGroup`:

```tsx
import { Card, IconTile, Label, ListRow, RowGroup } from '@/components';
```

```tsx
return (
  <>
    <Label>{profileCopy.account.trustLabel}</Label>
    <RowGroup separatorInset="leading">{/* ...existing rows unchanged... */}</RowGroup>
    {/* ...existing privacy Card unchanged... */}
  </>
);
```

(If the fragment needs consistent spacing with the label, wrap in a `View` with `gap: spacing.sm` matching the other sections.)

- [ ] **Step 6: Wire `ProfileTab`** — edit `apps/mobile/src/features/profile/ProfileTab.tsx`

Add imports:

```ts
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRef } from 'react';

import { paywallCopy } from '@/copy/paywall';
import { useAccountStatus } from '@/features/auth/useAccountStatus';
import { ClaimSheet } from '@/features/paywall/ClaimSheet';
import { useEntitlement } from '@/features/paywall/useEntitlement';

import { ProfileAccountSection } from './ProfileAccountSection';
```

Inside the component, after the existing `useState` lines, derive the control-center values:

```tsx
const { premium, inTrial } = useEntitlement();
const { claimed, appleAvailable } = useAccountStatus();
const claimRef = useRef<BottomSheetModal>(null);

const planLabel = premium
  ? inTrial
    ? profileCopy.account.plan.trial
    : profileCopy.account.plan.premium
  : profileCopy.account.plan.free;
const planTint: 'accent' | 'neutral' = premium ? 'accent' : 'neutral';

const subscriptionSubtitle = premium
  ? inTrial
    ? paywallCopy.subscription.trial
    : paywallCopy.subscription.premium
  : paywallCopy.subscription.free;

const openSubscription = () => router.push('/settings/subscription' as never);
```

Pass the plan props into `ProfileHeader`:

```tsx
<ProfileHeader
  name={name}
  onEditName={() => setEditing({ key: 'name', title: profileCopy.fields.name })}
  onOpenSettings={() => router.push('/settings' as never)}
  planLabel={planLabel}
  planTint={planTint}
  onPressPlan={openSubscription}
/>
```

Add the Account section immediately below the header (before `ProfileMemoryRows`):

```tsx
<ProfileAccountSection
  subscriptionSubtitle={subscriptionSubtitle}
  showClaim={claimed === false}
  onManage={openSubscription}
  onSecure={() => claimRef.current?.present()}
/>
```

Add the `ClaimSheet` beside the other sheets at the bottom of the returned tree (after `ProfilePeopleSheet`):

```tsx
<ClaimSheet
  ref={claimRef}
  appleAvailable={appleAvailable}
  onDone={() => claimRef.current?.dismiss()}
/>
```

- [ ] **Step 7: Run the profile tests — verify they pass**

Run: `cd apps/mobile && pnpm exec jest src/features/profile`
Expected: PASS — the new control-center test plus all existing ProfileTab / component tests.

- [ ] **Step 8: Typecheck + lint + full suite**

Run: `cd apps/mobile && pnpm exec tsc --noEmit && pnpm exec eslint src/features/profile && pnpm exec jest`
Expected: no type errors, no lint errors, all suites PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/src/features/profile/
git commit -m "$(cat <<'EOF'
feat(mobile): assemble the control-center profile

Header gains a plan chip; a new Account section surfaces subscription status
(reusing Settings' mapping) plus an anonymous-only "Secure your account" row via
the existing ClaimSheet; Memory and Trust & privacy sections gain labels. Wiring
only — reuses useEntitlement, useAccountStatus, and ClaimSheet.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**

- §3 header plan chip → Tasks 2, 4. ✓
- §3 Account section (subscription + conditional claim) → Tasks 3, 4. ✓
- §3 Memory / Trust labels; each section self-labeled → Tasks 3, 4 (Steps 4–5). ✓
- §5 reuse useEntitlement / useAccountStatus / ClaimSheet, routing to /settings/subscription → Task 4. ✓
- §6 copy in profileCopy.account, copy-lint → Task 1. ✓
- §7 states (Free default, claim only when `claimed === false`) → Task 4 mocks + `showClaim={claimed === false}`. ✓
- §8 testing (chip, account section, ProfileTab integration, no regression) → Tasks 2, 3, 4. ✓

**Placeholder scan:** Steps 4–5 say "keep existing children unchanged" and show the exact wrapping added around them — the surrounding code is already in the repo and not reproduced to avoid drift; the new lines are shown in full. No `TBD`/vague steps.

**Type consistency:** `planTint: 'accent' | 'neutral'` is identical across `ProfilePlanChip` (Task 2), `ProfileHeader` props (Task 4 Step 3), and the `ProfileTab` derivation (Task 4 Step 6). `ProfileAccountSection` prop names (`subscriptionSubtitle`, `showClaim`, `onManage`, `onSecure`) match between Task 3's definition/test and Task 4's call site. `useEntitlement` destructures `{ premium, inTrial }` and `useAccountStatus` destructures `{ claimed, appleAvailable }` consistently with their real signatures.
