/**
 * The Conversation, S1–S11 (product 07). Verbatim where the doc gives copy;
 * in-voice where it gives intent. The copy lint audits every string here.
 *
 * {name} and {city} are interpolation slots filled by the flow — her name is
 * used within 10 seconds of learning it (product 07 S3).
 */
export const onboardingCopy = {
  // ── Funnel A-screens (restored + combined with the Redesign chrome, 2026-08-26) ──
  a01Splash: {
    tagline: 'Your calmest, most intentional self starts here.',
    brand: 'Aura',
  },

  a02Value: {
    panels: [
      {
        title: 'Rewire your mornings',
        body: 'Three minutes of gratitude, affirmation and intention — before the day gets loud.',
      },
      {
        title: 'Manifest with intention',
        body: 'Affirmations and intentions that actually sound like you.',
      },
      {
        title: 'Feel calm, grateful, unstoppable',
        body: 'Small, daily, and yours — the mood you build in the morning carries the day.',
      },
    ],
    primary: 'Continue',
  },

  a03SocialProof: {
    // PLACEHOLDER numbers and reviews carried over from the design. Per the
    // design's own rule ("real numbers only, once true"), replace with verified
    // figures and real App Store / Play reviews before shipping.
    heading: 'Join half a million building a daily ritual',
    rating: '4.9 ★ · 128k ratings',
    reviews: [
      {
        quote: 'The first one that didn’t feel like it was shouting at me.',
        who: 'Priya · 8 months',
      },
      { quote: 'Three minutes. I’ve never kept a habit this long.', who: 'Danielle · 1 year' },
    ],
    primary: 'Continue',
  },

  a04Goals: {
    question: 'What do you most want to bring into your life?',
    // Reuses the `values` column, capped at two in the DB (02 §1) — so the
    // design's "as many as you like" becomes "up to two" here.
    helper: 'Choose up to two.',
    choices: [
      { label: 'Confidence', icon: '✦' },
      { label: 'Love & relationships', icon: '♡' },
      { label: 'Money & abundance', icon: '◈' },
      { label: 'Career & purpose', icon: '▲' },
      { label: 'Calm & less anxiety', icon: '◐' },
      { label: 'Better habits', icon: '↻' },
    ],
    primary: 'Continue',
  },

  a05Feeling: {
    question: 'How have you been feeling lately?',
    helper: 'There’s no wrong answer here.',
    // Key is stored in `profiles.feeling`; 'anxious'/'stuck' are the gentle-content
    // router's trigger answers (Wood et al. mitigation).
    choices: {
      anxious: 'Anxious or overwhelmed',
      stuck: 'Stuck, low motivation',
      hopeful: 'Hopeful but scattered',
      good: 'Pretty good — I want to grow',
    },
    primary: 'Continue',
  },

  a06Obstacle: {
    question: 'What usually gets in your way?',
    helper: 'We’ll design around it.',
    // Stored as free text in `struggle`, so submit the label (readable for the
    // memory seed and the Letter), not a slug.
    choices: ['I forget', 'I lose motivation', 'Self-doubt', 'Too busy'],
    primary: 'Continue',
  },

  a08RitualTime: {
    question: 'When will you do your ritual?',
    helper: 'Same time each day works best.',
    // Keys map to `arrival_time` via ARRIVAL_PRESETS (commit.ts).
    choices: {
      morning: { label: 'Morning', meta: '7–9 AM' },
      lunch: { label: 'Lunch', meta: '12–2 PM' },
      evening: { label: 'Evening', meta: '6–8 PM' },
      'before-bed': { label: 'Before bed', meta: '9–11 PM' },
    },
    primary: 'Continue',
  },

  a10Commitment: {
    // The A07 identity anchor isn't in this flow, so the sentence stays general.
    eyebrow: 'One moment',
    question: 'Ready to commit three minutes a day?',
    helper: 'That’s all it takes — small, daily, and yours.',
    primary: 'I’m ready',
    secondary: 'Not yet',
  },

  a11Affirmation: {
    eyebrow: 'Your first affirmation',
    // Process-framed on purpose (the app's affirmation voice): learning-to,
    // choose-to, allowed-to — never an absolute claim.
    affirmations: [
      'I am allowed to move at my own pace.',
      'I choose to take one small step today.',
      'I’m learning to trust the version of me that keeps going.',
      'Today I can do one thing that future me will thank me for.',
    ],
    primary: 'This resonates',
    another: 'Show me another',
  },

  a12Reminder: {
    previewApp: 'Aura · 8:00 AM',
    previewBody: 'Good morning. Your three-minute ritual is ready.',
    question: 'This is how I’ll reach you.',
    helper:
      'One gentle arrival at the time you chose — never a stream, never a scorecard. Turn it off in a single tap, anytime.',
    primary: 'Continue',
  },

  s01Welcome: {
    title: 'Create the life you desire.',
    /**
     * Anti-resentment checklist #1: the price appears on the FIRST screen, so
     * effort is never invested blind. `{price}` is filled from the RevenueCat
     * offering, which is localized — a hardcoded dollar figure would be a lie in
     * every other currency, and lying about price is the exact failure mode this
     * line exists to prevent. `priceUnknown` covers the first launch before the
     * offering has loaded: still honest, just less specific.
     */
    priceHonesty: 'Free to begin. Premium from {price} — you’ll see everything before you decide.',
    priceUnknown: 'Free to begin. You’ll see the price before anything starts.',
    primary: 'Begin',
    secondary: 'Restore purchase',
  },

  s02MeetAura: {
    // Redesign 2b: an orb, a greeting, and a short "what to expect" card in place
    // of the animated chat bubbles.
    greeting: 'Hi. I’m Aura.',
    body: 'To write your future I need a little about your present. Everything you share stays between us, and you can see and edit all of it, anytime.',
    expectations: [
      { title: 'Seven questions', body: 'Most are a tap. Two are yours to write.' },
      { title: 'About four minutes', body: 'Then a letter, written for you.' },
      { title: 'Yours to edit', body: 'Nothing is locked in — revise any answer later.' },
    ],
    primary: 'I’m ready',
  },

  s03Name: {
    question: 'What should I call you?',
    // Names the field for the screen reader and gives the empty box something
    // to say; the helper below it stays the guidance.
    placeholder: 'Your name',
    // Quiet guidance under the field (v4 S3).
    helper: 'Just your given name is perfect.',
    primary: 'Continue',
    // Gentle trim, never harsh validation (product 07 S3 edge).
    tooLong: 'That’s a lot of name — what do the people closest to you use?',
  },

  s04SelfDescription: {
    question:
      'Since we’ve just met, {name} — how would you describe yourself? Whatever comes to mind.',
    // "Whatever comes to mind" is already in the question, so the placeholder
    // lowers the bar rather than repeating it — a FEW words is enough.
    placeholder: 'A few words about you',
    primary: 'Continue',
    skip: 'Skip for now',
    // Reflection when she skipped (product 07 S4 edge).
    skippedReflection: 'We’ll fill this in together as we go.',
    emptyNudge: 'even one word helps me',
  },

  s05WorkFeeling: {
    question: 'And the work you do now — how does it feel?',
    choices: {
      love_it: 'Love it',
      fine_for_now: 'It’s fine for now',
      ready_for_new: 'Ready for something new',
      building_side: 'Building something on the side',
    },
    primary: 'Continue',
  },

  s06Values: {
    // V4 splits the limit off the question: serif asks, a quiet helper guides.
    question: 'What matters most to you right now?',
    helper: 'Pick up to two.',
    choices: [
      'Feeling truly fulfilled',
      'Financial freedom',
      'Being recognized',
      'Living with purpose',
      'Being free',
      'Family & love',
    ],
    primary: 'Continue',
  },

  s07DreamHome: {
    question: 'Close your eyes for a second. Where do you live, in the life you want?',
    cards: {
      penthouse: 'Penthouse',
      'beach-house': 'Beach house',
      loft: 'Loft',
      'cozy-cottage': 'Cozy cottage',
      'country-house': 'Country house',
      'mountain-retreat': 'Mountain retreat',
      'minimalist-studio': 'Minimalist studio',
      'anywhere-view': 'Anywhere with a view',
    },
    primary: 'Continue',
  },

  s08DreamCity: {
    question: 'And where is it? A real place, or just a feeling of one.',
    primary: 'Continue',
    skip: 'Not sure yet',
    // Reflection template; {city} is her verbatim answer (product 07 S8).
    reflection: '{city}. I can already hear the mornings there.',
  },

  s09People: {
    question: 'Who’s in this life with you? A name and one word for each.',
    namePlaceholder: 'Name',
    descriptorPlaceholder: 'One word — “safe”, “fun”…',
    addAnother: '+ Add another',
    justMe: 'Just me for now',
    // Reflection proves listening (product 07 S9); {name} is the last person added.
    reflection: '{name}’s in. Your circle is forming.',
    primary: 'Continue',
  },

  s10Struggle: {
    question: 'Last one, and it matters most. What’s the thing that feels heaviest right now?',
    // Invitational, never clinical — the field must not read as an intake form.
    placeholder: 'In your own words',
    primary: 'Continue',
    skip: 'Not today',
    // Gentle, non-clinical; NEVER followed by a sales beat (product 07 S10).
    reflection: 'Thank you for trusting me with that. I’ll hold it carefully.',
  },

  s11ArrivalTime: {
    question: 'Your moments will be written for you daily. When should they arrive?',
    morning: 'Morning',
    // V4 subtitle lines — a time of day with a reason, not a scheduler.
    morningHint: 'Around 7:30 — before the day starts talking',
    evening: 'Evening',
    eveningHint: 'Around 21:00 — to close the day',
    pickTime: 'Pick a time',
    /**
     * The anti-nag promise (v4 S11 note). The design's literal line ends
     * "never a streak", but "streak" sits on the shared guilt-vocabulary ban
     * list (product 14) — the copy lint would fail — so the promise is kept
     * with a word the voice is allowed to say.
     */
    note: 'Only sent when your moment is ready. Never a nudge, never a scorecard.',
    primary: 'Continue',
  },

  /**
   * The commitment beat (2026-08-10) — a quiet "are you ready" moment after the
   * last question, before the Letter. Committing to a goal lifts follow-through;
   * said in the future-self voice, never a coercive hold. `{name}` is filled
   * from the draft (falls back to a nameless "Ready?").
   */
  s13Commit: {
    // Redesign 2j: a small eyebrow over the orb.
    eyebrow: 'One moment',
    question: 'Ready, {name}?',
    questionNoName: 'Ready?',
    helper:
      'Everything you’ve shared becomes a letter from the version of you that already made it. Meeting them is a small act of belief — take it when you’re ready.',
    primary: 'I’m ready',
  },

  /**
   * The notification education screen (2026-08-10, founder decision) — a
   * dedicated screen BEFORE the OS ask that explains why the reminder is the
   * core of the ritual (the moment is delivered by it). Informational only:
   * "Continue" leads to the ask on the next screen.
   */
  s12WhyNotifications: {
    question: 'This is how I’ll reach you.',
    helper:
      'Every day I write a new moment for you. The reminder is simply how it finds you — without it, the words wait in the app until you remember to look.',
    benefits: [
      { title: 'At your time', body: 'Your moment arrives at the hour you chose — not whenever.' },
      { title: 'Once a day', body: 'One gentle arrival. Never a stream, never a scorecard.' },
      { title: 'Always yours', body: 'Turn it off in a single tap, anytime.' },
    ],
    primary: 'Continue',
  },

  s12Notifications: {
    // The closing step (founder decision 2026-07-30): ask for the OS permission
    // while her arrival time is still fresh, so it reads as a reminder she just
    // set up — not a cold system prompt. The "why" now lives on the dedicated
    // education screen before this one, so this stays a short, warm ask.
    question: 'Ready to let them in?',
    helper: 'So the words written for you actually arrive.',
    note: 'One quiet arrival at your time. Never a nudge, never a scorecard — and you can turn it off anytime.',
    primary: 'Turn on reminders',
    skip: 'Maybe later',
  },

  /**
   * The second notification screen (2026-08-10, founder decision) — shown ONCE,
   * only if she declined the OS prompt or chose "Maybe later" on S12. A warm
   * second chance that spells out the concrete loss, NOT a guilt screen: the
   * "Continue without" exit is always right there, and it is never shown again.
   */
  s12NotificationsMore: {
    question: 'Your moment can’t reach you on its own.',
    helper:
      'Without a reminder, the words written for you sit quietly in the app — and most mornings the day gets loud before you remember to open it. One gentle arrival at the time you chose is all it takes.',
    // Reassurance so the ask never tips into pressure.
    note: 'Still just one arrival a day. No nudges, no scorecards — off anytime.',
    // Redesign 2m: a preview of the actual reminder she'd receive.
    previewLabel: 'Tomorrow, 7:30',
    previewApp: 'Aura',
    previewBody: 'Your moment is ready. Two minutes, in your own voice.',
    primary: 'Turn on notifications',
    // If the OS won't prompt again (already declined), we send her to Settings.
    openSettings: 'Open Settings',
    skip: 'Continue without them',
  },

  editGuard: {
    entry: 'Fix an earlier answer',
    /** Spoken label before anything is answered — plain back, nothing to fix. */
    back: 'Back',
    title: 'Which one?',
    // Edits revise, never restart (product 07 rules).
    note: 'Your other answers stay exactly as they are.',
    cancel: 'Never mind',
  },

  reflectionTypingPause: {
    // 600ms typing dots before a reflection lands (product 13 §catalog:
    // "proves someone is listening before replying"). Duration lives with the
    // motion catalog; this key exists so screens don't invent their own copy.
  },
} as const;
