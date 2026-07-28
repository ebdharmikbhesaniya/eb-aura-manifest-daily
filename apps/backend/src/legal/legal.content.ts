/**
 * The legal documents, as structured data (04 §7 style: content is code, no CMS).
 * The single source of truth — the mobile app links to the rendered pages rather
 * than carrying its own copy. Company specifics are deliberate placeholders for
 * the founder/lawyer to complete before publishing.
 */

export interface LegalSection {
  heading: string;
  /** One <p> per entry. */
  body: string[];
}

export interface LegalDocument {
  title: string;
  effectiveDate: string;
  /** Lead paragraphs, before the first section. */
  intro: string[];
  sections: LegalSection[];
}

const APP = 'Aura: Manifest Daily';
const COMPANY = 'EmperorBrains';
const CONTACT = 'emperorbrains.official@gmail.com';
const JURISDICTION = 'Hyderabad, India';
const EFFECTIVE = 'July 28, 2026';

export const PRIVACY: LegalDocument = {
  title: 'Privacy Policy',
  effectiveDate: EFFECTIVE,
  intro: [
    `This Privacy Policy explains how ${COMPANY} ("we", "us") collects, uses, and protects your information when you use ${APP} (the "app"). By using the app you agree to this policy.`,
  ],
  sections: [
    {
      heading: 'Information We Collect',
      body: [
        'Account information: the email address you sign up with, and — if you use Google or Apple sign-in — the identity those providers return to us.',
        'Your content: the answers, intentions, journal and gratitude entries you write, and the letters and affirmations generated for you.',
        'Usage and diagnostics: anonymous product-usage events and crash reports that help us keep the app working.',
        'Purchases: your subscription status. We never see or store your card details — payment is handled by the app store.',
      ],
    },
    {
      heading: 'How We Use Your Information',
      body: [
        'To create your personalized letters, affirmations and moments.',
        'To operate, secure, and improve the app.',
        'To manage your subscription and provide support.',
      ],
    },
    {
      heading: 'AI Processing',
      body: [
        'To generate your content, the text you write is sent to our AI providers: a large-language-model provider (OpenAI) generates the words, and a text-to-speech provider (ElevenLabs) synthesizes the voice. These providers process your text to return a result and act as our processors under agreement.',
      ],
    },
    {
      heading: 'Service Providers',
      body: [
        'We share data only with the providers that run the app on our behalf: Supabase (authentication, database, file storage), OpenAI (text generation), ElevenLabs (voice), RevenueCat (subscription management), PostHog (product analytics), and Sentry (crash diagnostics). We do not sell your personal information.',
      ],
    },
    {
      heading: 'Data Retention',
      body: [
        'We keep your information for as long as your account is active. When you delete your account, we delete your content and personal data, except where we must retain limited records to meet legal obligations.',
      ],
    },
    {
      heading: 'Your Rights',
      body: [
        'You can access and correct your information from within the app. You can delete your account and its data at any time from Settings. For any request, or to reach us about your data, contact ' +
          CONTACT +
          '.',
      ],
    },
    {
      heading: "Children's Privacy",
      body: [
        'The app is not directed to children under 13 (or the minimum age in your jurisdiction), and we do not knowingly collect their information.',
      ],
    },
    {
      heading: 'Changes to This Policy',
      body: [
        'We may update this policy from time to time. Material changes will be reflected here with a new effective date.',
      ],
    },
    {
      heading: 'Contact',
      body: [`Questions about this policy: ${CONTACT} (${COMPANY}).`],
    },
  ],
};

export const TERMS: LegalDocument = {
  title: 'Terms of Service',
  effectiveDate: EFFECTIVE,
  intro: [
    `These Terms of Service ("Terms") govern your use of ${APP} (the "app"), provided by ${COMPANY}. By using the app you agree to these Terms.`,
  ],
  sections: [
    {
      heading: 'The Service',
      body: [
        `${APP} helps you set intentions and receive personalized letters, affirmations and moments. It is a self-reflection and wellbeing tool — it is not medical, psychological, legal, or financial advice, and it is not a substitute for professional care.`,
      ],
    },
    {
      heading: 'Eligibility',
      body: [
        'You must be at least 13 years old, or the minimum age required in your jurisdiction, to use the app.',
      ],
    },
    {
      heading: 'Your Account',
      body: [
        'You are responsible for the activity under your account and for keeping your sign-in method secure.',
      ],
    },
    {
      heading: 'Subscriptions and Billing',
      body: [
        'Premium features are offered by subscription. Subscriptions are billed and auto-renew through your app store account, and you manage or cancel them there. Charges are subject to the app store’s terms.',
      ],
    },
    {
      heading: 'Acceptable Use',
      body: [
        'Do not misuse the app: no unlawful use, no attempts to disrupt or reverse-engineer the service, and no use that infringes the rights of others.',
      ],
    },
    {
      heading: 'Your Content',
      body: [
        'The words you write remain yours. You grant us the limited license needed to process and store your content in order to provide the app’s features, including sending it to the AI providers described in our Privacy Policy.',
      ],
    },
    {
      heading: 'Disclaimers',
      body: [
        'The app is provided "as is" without warranties of any kind. We do not guarantee any particular outcome from using it.',
      ],
    },
    {
      heading: 'Limitation of Liability',
      body: [
        `To the fullest extent permitted by law, ${COMPANY} is not liable for any indirect, incidental, or consequential damages arising from your use of the app.`,
      ],
    },
    {
      heading: 'Termination',
      body: [
        'You may stop using the app and delete your account at any time. We may suspend or end access if these Terms are violated.',
      ],
    },
    {
      heading: 'Governing Law',
      body: [`These Terms are governed by the laws of ${JURISDICTION}.`],
    },
    {
      heading: 'Changes to These Terms',
      body: [
        'We may update these Terms from time to time. Continued use after a change means you accept the updated Terms.',
      ],
    },
    {
      heading: 'Contact',
      body: [`Questions about these Terms: ${CONTACT} (${COMPANY}).`],
    },
  ],
};

/**
 * The public account-deletion page (Google Play / App Store data-deletion
 * requirement). Must be reachable without signing in — the store reviewer and
 * users without the app both need it.
 */
export const DELETION: LegalDocument = {
  title: 'Delete Your Account',
  effectiveDate: EFFECTIVE,
  intro: [
    `This page explains how to delete your ${APP} account and the data associated with it, as required by the app stores' data-deletion policies.`,
  ],
  sections: [
    {
      heading: 'Delete from within the app',
      body: [
        'Open the app, go to your Profile, tap the gear to open Settings, then tap "Delete account" and confirm. Your account and its data are removed right away — no email or waiting required.',
      ],
    },
    {
      heading: 'Request deletion without the app',
      body: [
        `If you can no longer access the app, email ${CONTACT} from the address on your account and ask us to delete it. We verify the request and complete the deletion within 30 days.`,
      ],
    },
    {
      heading: 'What is deleted',
      body: [
        'Your account and email; the details you shared during onboarding; your journal, gratitude and memory entries; the letters, affirmations and moments generated for you, including their audio; and your analytics identity.',
      ],
    },
    {
      heading: 'What may be retained',
      body: [
        'We may keep limited records where the law requires it — for example, billing and subscription records held by the app store and our payment processor. Your subscription itself is managed by the app store; cancel it there.',
      ],
    },
    {
      heading: 'Contact',
      body: [`Questions about account deletion: ${CONTACT} (${COMPANY}).`],
    },
  ],
};
