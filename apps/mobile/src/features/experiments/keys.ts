/**
 * The experiment / feature-flag key registry (2026-08-10).
 *
 * ONE typed home for every PostHog flag key the app reads, so a key can't drift
 * between the code, the provisioning script (`infra/posthog/provision.mjs`) and
 * the RUNBOOK. Add a key here, add it to the provisioning config, document it in
 * the RUNBOOK — in that order.
 *
 * Every experiment's `control` variant MUST be the current production behaviour,
 * byte-for-byte, so a flag that never loads (offline / not yet created / disabled)
 * lands on today's shipped experience.
 */
export const EXPERIMENTS = {
  /** Whether the dream-home question shows in onboarding. control = shown (shipped). */
  onboardingDreamHome: 'onboarding-dream-home',
  /** Whether the commitment beat shows before the notification setup. control = shown. */
  onboardingCommitBeat: 'onboarding-commit-beat',
  /** Whether the first-Home welcome card shows. control = shown. */
  homeFirstRun: 'home-first-run',
  /** Paywall presentation: control = single trial-timeline; test = 3-step sequence. */
  paywallLayout: 'paywall-layout',
} as const;

export type ExperimentKey = (typeof EXPERIMENTS)[keyof typeof EXPERIMENTS];

/** The variants every on/off experiment uses. `control` is always today's behaviour. */
export const ON_OFF_VARIANTS = ['control', 'off'] as const;
export type OnOffVariant = (typeof ON_OFF_VARIANTS)[number];
