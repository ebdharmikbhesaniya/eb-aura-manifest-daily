/**
 * Companion-voice copy for the memory surfaces (05 §8, product 10 §41–48, 14).
 *
 * Every user-facing string lives in `src/copy/` so the banned-phrase lint has one
 * audit surface (15 §5). Aura speaks as "I" — warm, plain, never clinical, never
 * salesy, never fake-positive.
 *
 * The tone here does real work. This screen is where a woman finds out how much
 * an app knows about her. Written coldly it reads as surveillance; written well
 * it reads as trust (product 10 §43: "the brand promise, not compliance theater").
 */
export const memoryCopy = {
  whatAuraKnows: {
    title: 'What Aura knows',

    // The memory contract, stated plainly rather than buried in a policy.
    contract:
      'Everything I remember, in your words. Edit or remove anything — I forget completely.',

    empty: 'We haven’t talked much yet. Whatever you tell me, I’ll keep here.',

    /**
     * Quiet section labels (v4 §what-aura-knows) — the categories in her
     * language, never the enum's. If it reads like a database, it reads like
     * surveillance.
     */
    groups: {
      identity: 'About you',
      dream: 'Your dream',
      person: 'Your people',
      place_lifestyle: 'Your life',
      struggle: 'What feels heavy',
      phrase: 'In your words',
      milestone: 'Milestones',
      preference: 'What you prefer',
      gratitude_ref: 'From your gratitude',
      temp_context: 'Right now',
    },

    /** Centered under the list — the scope of a removal, said once. */
    footer: 'Removing a memory removes it from every future moment.',

    deleteAction: 'Forget this',
    // Confirmation is honest about scope: it takes effect going forward (09 §6).
    deleteConfirmTitle: 'Forget this?',
    deleteConfirmBody: 'I won’t use it again from now on.',
    deleteConfirmCancel: 'Keep it',
    deleteConfirmAccept: 'Forget it',
  },

  neverInclude: {
    title: 'Never mention',
    description:
      'Some things are better left unsaid. Anything here stays out of everything I write for you.',
    empty: 'Nothing yet.',
    addPlaceholder: 'A word, a name, a topic…',
    addAction: 'Add',
    removeAction: 'Remove',
  },
} as const;
