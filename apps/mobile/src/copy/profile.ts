/**
 * Profile tab copy (product 11: "trust center + memory front door").
 *
 * V4 layout: the tab is a stack of grouped rows — `rows` names each row, the
 * matching `fields` string titles the edit sheet it opens. Both stay here so
 * the banned-phrase lint audits every word she reads.
 */
export const profileCopy = {
  tagline: 'The more I know, the realer it feels.',

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

  /** The gear in the header — Settings lives behind Profile, never on Home. */
  settings: 'Settings',

  /** Section headers that group the memory front door from the trust centre. */
  sections: {
    memory: 'What I know about you',
    trust: 'Privacy & trust',
  },

  /** Row titles in the memory front door (v4 §profile). */
  rows: {
    basics: 'Basics',
    dreamCity: 'Dream city',
    dreamHome: 'Dream home',
    people: 'Your people',
    note: 'Your note',
  },

  fields: {
    name: 'Your name',
    selfDescription: 'How you describe yourself',
    dreamCity: 'Your dream city',
    dreamHome: 'Your dream home',
    note: 'A note for me',
  },

  edit: {
    save: 'Save',
    cancel: 'Never mind',
    // The memory contract on every save (09 §6, product 10 §44): edits take
    // effect on the next generation, and the app says so.
    savedNote: 'I’ll write differently from now on.',
    empty: 'Nothing yet — tap to tell me.',
  },

  people: {
    remove: 'Remove',
    // Deactivation copy — the row survives for history; generation stops using
    // it (02 §1). No guilt, no confirmation drama.
    removed: 'Okay. I won’t bring them up.',
    empty: 'Just you for now — and that’s plenty.',
    done: 'Done',
  },

  links: {
    whatAuraKnows: 'What Aura knows',
    whatAuraKnowsHint: 'See and edit everything I remember',
    neverInclude: 'Never include',
    neverIncludeHint: 'Topics I keep out of everything I write',
  },

  /** The v4 privacy note — the trust centre states the boundary plainly. */
  privacyNote:
    'Your words are used only to write to you. They never appear in analytics, ads, or anyone else’s app.',
} as const;
