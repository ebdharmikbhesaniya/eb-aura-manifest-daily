# Legal Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve a Privacy Policy and Terms of Service as standalone web pages from the backend, and surface them in the mobile app as links that open those pages.

**Architecture:** A new version-neutral, public NestJS `legal` module renders two HTML pages from structured content via a pure template function (no view engine, no static assets, no new deps). The mobile app links to those URLs from the paywall footer (already wired) and a new Settings "Legal" card. Legal text lives only in the backend — single source of truth.

**Tech Stack:** NestJS 11 (backend), Expo / React Native + expo-router (mobile), Jest + ts-jest (backend tests), Jest + @testing-library/react-native (mobile tests), pnpm workspace + turbo.

## Global Constraints

- Node `>=22.12.0 <23`, pnpm `>=10.4.1`. Run backend commands from `apps/backend`, mobile from `apps/mobile`; workspace installs from repo root.
- Backend applies global URI versioning (`defaultVersion: '1'`) — API routes are `/v1/*`. Legal pages MUST be `VERSION_NEUTRAL` so their URLs are `/privacy` and `/terms`.
- A global auth guard (`SupabaseAuthGuard` via `APP_GUARD`) protects every route. Legal routes MUST carry `@Public()` (from `src/auth/public.decorator.ts`, metadata key `IS_PUBLIC_KEY = 'aura:isPublic'`).
- No new dependencies. HTML is a self-contained string with inline CSS (no external assets).
- Company specifics stay as literal placeholders: `[COMPANY NAME]`, `[CONTACT EMAIL]`, `[JURISDICTION]`, `[EFFECTIVE DATE]`. App name is `Aura: Manifest Daily`.
- `EXPO_PUBLIC_*` values are inlined by Metro at build time and are referenced by full literal name (no destructuring). Mobile env schema (`src/lib/env.ts`): `EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL` are `z.string().url().optional()` — must be a valid URL or absent, never empty.
- Backend URLs in mobile env are the bare origin (`https://eb-aura-manifest-daily.onrender.com`); the paths `/terms` and `/privacy` are absolute.
- Commit trailers on every commit:
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Jd3JuMo9GhMqeS6Au7Me2i
  ```

---

## File Structure

- `apps/backend/src/legal/legal.content.ts` — `LegalDocument`/`LegalSection` types + `PRIVACY` and `TERMS` data. Pure, no imports.
- `apps/backend/src/legal/legal.template.ts` — `renderLegalPage(doc)` → HTML string. Depends only on the content types.
- `apps/backend/src/legal/legal.template.spec.ts` — template unit tests.
- `apps/backend/src/legal/legal.controller.ts` — `VERSION_NEUTRAL` + `@Public()` routes `GET /privacy`, `GET /terms`.
- `apps/backend/src/legal/legal.controller.spec.ts` — controller unit tests.
- `apps/backend/src/legal/legal.module.ts` — declares the controller.
- `apps/backend/src/app.module.ts` — register `LegalModule` (modify).
- `apps/mobile/src/copy/settings.ts` — add `legal` copy (modify).
- `apps/mobile/src/features/settings/LegalRowGroup.tsx` — the Settings Legal card.
- `apps/mobile/src/features/settings/LegalRowGroup.test.tsx` — component test.
- `apps/mobile/app/settings/index.tsx` — render `<LegalRowGroup />` (modify).
- `apps/mobile/dev.env`, `apps/mobile/.env.local` — set the two URLs (modify).

---

## Task 1: Legal content + HTML template

**Files:**

- Create: `apps/backend/src/legal/legal.content.ts`
- Create: `apps/backend/src/legal/legal.template.ts`
- Test: `apps/backend/src/legal/legal.template.spec.ts`

**Interfaces:**

- Produces: `interface LegalSection { heading: string; body: string[] }`; `interface LegalDocument { title: string; effectiveDate: string; intro: string[]; sections: LegalSection[] }`; `const PRIVACY: LegalDocument`; `const TERMS: LegalDocument` (PRIVACY.title === `'Privacy Policy'`, TERMS.title === `'Terms of Service'`); `function renderLegalPage(doc: LegalDocument): string` returning a full HTML document that starts with `<!doctype html>`.

- [ ] **Step 1: Write the content file**

Create `apps/backend/src/legal/legal.content.ts`:

```ts
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
const COMPANY = '[COMPANY NAME]';
const CONTACT = '[CONTACT EMAIL]';
const JURISDICTION = '[JURISDICTION]';
const EFFECTIVE = '[EFFECTIVE DATE]';

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
```

- [ ] **Step 2: Write the failing template test**

Create `apps/backend/src/legal/legal.template.spec.ts`:

```ts
import type { LegalDocument } from './legal.content';
import { renderLegalPage } from './legal.template';

const doc: LegalDocument = {
  title: 'Privacy Policy',
  effectiveDate: '[EFFECTIVE DATE]',
  intro: ['An intro paragraph.'],
  sections: [{ heading: 'Information We Collect', body: ['We collect your email.'] }],
};

describe('renderLegalPage', () => {
  it('is a complete HTML document', () => {
    expect(renderLegalPage(doc).startsWith('<!doctype html>')).toBe(true);
  });

  it('renders the title, effective date, intro, and section content', () => {
    const html = renderLegalPage(doc);
    expect(html).toContain('<h1>Privacy Policy</h1>');
    expect(html).toContain('[EFFECTIVE DATE]');
    expect(html).toContain('An intro paragraph.');
    expect(html).toContain('<h2>Information We Collect</h2>');
    expect(html).toContain('We collect your email.');
  });

  it('escapes HTML in content so it cannot break the markup', () => {
    const html = renderLegalPage({
      ...doc,
      sections: [{ heading: 'A & B', body: ['x < y > z'] }],
    });
    expect(html).toContain('A &amp; B');
    expect(html).toContain('x &lt; y &gt; z');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/backend && npx jest src/legal/legal.template.spec.ts`
Expected: FAIL — cannot find module `./legal.template`.

- [ ] **Step 4: Write the template**

Create `apps/backend/src/legal/legal.template.ts`:

```ts
import type { LegalDocument } from './legal.content';

/** Defensive even though content is static — a stray `<` must never break markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2.5rem 1.25rem 4rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6; color: #2b2622; background: #faf6f0;
  }
  main { max-width: 720px; margin: 0 auto; }
  h1 { font-size: 1.9rem; margin: 0 0 .25rem; }
  .meta { color: #8a7f74; margin: 0 0 2rem; font-size: .95rem; }
  h2 { font-size: 1.2rem; margin: 2rem 0 .5rem; }
  p { margin: 0 0 .85rem; }
  footer { margin-top: 3rem; color: #8a7f74; font-size: .85rem; }
`;

/** Renders a legal document into a self-contained, responsive HTML page. */
export function renderLegalPage(doc: LegalDocument): string {
  const intro = doc.intro.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const sections = doc.sections
    .map(
      (s) =>
        `<section><h2>${escapeHtml(s.heading)}</h2>` +
        s.body.map((p) => `<p>${escapeHtml(p)}</p>`).join('') +
        `</section>`,
    )
    .join('');

  return (
    `<!doctype html><html lang="en"><head>` +
    `<meta charset="utf-8"/>` +
    `<meta name="viewport" content="width=device-width, initial-scale=1"/>` +
    `<title>${escapeHtml(doc.title)} · Aura: Manifest Daily</title>` +
    `<style>${STYLE}</style></head><body><main>` +
    `<h1>${escapeHtml(doc.title)}</h1>` +
    `<p class="meta">Effective ${escapeHtml(doc.effectiveDate)}</p>` +
    intro +
    sections +
    `<footer>Aura: Manifest Daily</footer>` +
    `</main></body></html>`
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/backend && npx jest src/legal/legal.template.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no output (exit 0).

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/legal/legal.content.ts apps/backend/src/legal/legal.template.ts apps/backend/src/legal/legal.template.spec.ts
git commit -m "$(cat <<'EOF'
Legal: content documents + self-contained HTML template

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Jd3JuMo9GhMqeS6Au7Me2i
EOF
)"
```

---

## Task 2: Legal controller + module + registration

**Files:**

- Create: `apps/backend/src/legal/legal.controller.ts`
- Create: `apps/backend/src/legal/legal.module.ts`
- Modify: `apps/backend/src/app.module.ts`
- Test: `apps/backend/src/legal/legal.controller.spec.ts`

**Interfaces:**

- Consumes: `PRIVACY`, `TERMS` (Task 1); `renderLegalPage` (Task 1); `Public` and `IS_PUBLIC_KEY` from `src/auth/public.decorator.ts`.
- Produces: `class LegalController` with `privacy(): string` and `terms(): string`; `class LegalModule`.

- [ ] **Step 1: Write the failing controller test**

Create `apps/backend/src/legal/legal.controller.spec.ts`:

```ts
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { LegalController } from './legal.controller';

describe('LegalController', () => {
  let controller: LegalController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [LegalController],
    }).compile();
    controller = moduleRef.get(LegalController);
  });

  it('serves the privacy policy as an HTML document', () => {
    const html = controller.privacy();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<h1>Privacy Policy</h1>');
  });

  it('serves the terms of service as an HTML document', () => {
    const html = controller.terms();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<h1>Terms of Service</h1>');
  });

  it('exposes both routes publicly so the browser needs no JWT', () => {
    const reflector = new Reflector();
    expect(reflector.get<boolean>(IS_PUBLIC_KEY, controller.privacy)).toBe(true);
    expect(reflector.get<boolean>(IS_PUBLIC_KEY, controller.terms)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/backend && npx jest src/legal/legal.controller.spec.ts`
Expected: FAIL — cannot find module `./legal.controller`.

- [ ] **Step 3: Write the controller**

Create `apps/backend/src/legal/legal.controller.ts`:

```ts
import { Controller, Get, Header, VERSION_NEUTRAL } from '@nestjs/common';

import { Public } from '../auth/public.decorator';
import { PRIVACY, TERMS } from './legal.content';
import { renderLegalPage } from './legal.template';

/**
 * The public legal pages. `VERSION_NEUTRAL` keeps them at `/privacy` and
 * `/terms` rather than under `/v1`; `@Public()` opts them out of the global
 * SupabaseAuthGuard so a browser with no session can read them (07 §4 style).
 */
@Controller({ version: VERSION_NEUTRAL })
export class LegalController {
  @Public()
  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  privacy(): string {
    return renderLegalPage(PRIVACY);
  }

  @Public()
  @Get('terms')
  @Header('Content-Type', 'text/html; charset=utf-8')
  terms(): string {
    return renderLegalPage(TERMS);
  }
}
```

- [ ] **Step 4: Write the module**

Create `apps/backend/src/legal/legal.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { LegalController } from './legal.controller';

@Module({ controllers: [LegalController] })
export class LegalModule {}
```

- [ ] **Step 5: Register the module in app.module.ts**

In `apps/backend/src/app.module.ts`, add the import near the other feature-module imports:

```ts
import { LegalModule } from './legal/legal.module';
```

Then add `LegalModule` to the `imports: [...]` array of the `@Module({...})` decorator (place it alongside the other feature modules such as `HealthModule`). Example — if the array contains `HealthModule,` add the line after it:

```ts
    HealthModule,
    LegalModule,
```

- [ ] **Step 6: Run the controller test to verify it passes**

Run: `cd apps/backend && npx jest src/legal/legal.controller.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Build and smoke-test the live routes locally**

Run (from repo root):

```bash
pnpm turbo run build --filter=@aura/backend
cd apps/backend && PORT=4610 SUPABASE_URL=https://iaxfkgbfaguevlbuunve.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=x node dist/main >/tmp/legal-boot.log 2>&1 &
sleep 6
curl -s -o /dev/null -w "privacy: HTTP %{http_code} %{content_type}\n" http://127.0.0.1:4610/privacy
curl -s -o /dev/null -w "terms:   HTTP %{http_code} %{content_type}\n" http://127.0.0.1:4610/terms
curl -s -o /dev/null -w "v1 guard still on: HTTP %{http_code}\n" http://127.0.0.1:4610/v1/generation/letter
kill %1 2>/dev/null
```

Expected: `privacy` and `terms` → `HTTP 200 text/html; charset=utf-8`; the `/v1/generation/letter` GET → `404` or `401` (proves the guard/versioning are unaffected). Note: boot only needs the two Supabase vars; the service-role key can be any non-empty string for this smoke test since no request touches the DB.

- [ ] **Step 8: Typecheck, lint, commit**

```bash
cd apps/backend && npx tsc --noEmit && npx eslint src/legal
git add apps/backend/src/legal/legal.controller.ts apps/backend/src/legal/legal.module.ts apps/backend/src/legal/legal.controller.spec.ts apps/backend/src/app.module.ts
git commit -m "$(cat <<'EOF'
Legal: serve /privacy and /terms as public, version-neutral pages

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Jd3JuMo9GhMqeS6Au7Me2i
EOF
)"
```

---

## Task 3: Mobile Settings Legal card (component + test)

**Files:**

- Modify: `apps/mobile/src/copy/settings.ts`
- Create: `apps/mobile/src/features/settings/LegalRowGroup.tsx`
- Test: `apps/mobile/src/features/settings/LegalRowGroup.test.tsx`

**Interfaces:**

- Consumes: `ListRow`, `RowGroup` from `@/components`; `env` from `@/lib/env` (`env.EXPO_PUBLIC_TERMS_URL`, `env.EXPO_PUBLIC_PRIVACY_URL`, both `string | undefined`); `Linking` from `react-native`; `settingsCopy` from `@/copy/settings`.
- Produces: `function LegalRowGroup(): JSX.Element | null`. Renders `settings-terms-row` and `settings-privacy-row` when their URL is set; returns `null` when neither is.

- [ ] **Step 1: Add the copy**

In `apps/mobile/src/copy/settings.ts`, add a `legal` block inside the `settingsCopy` object (after the `signIn` block, before `deleteAccount`):

```ts
  legal: {
    terms: {
      title: 'Terms of Service',
      subtitle: 'The agreement you accept by using Aura',
    },
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'What we collect — and what we never do',
    },
  },
```

- [ ] **Step 2: Write the failing component test**

Create `apps/mobile/src/features/settings/LegalRowGroup.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Linking } from 'react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { LegalRowGroup } from './LegalRowGroup';

jest.mock('@/lib/env', () => ({
  env: {
    EXPO_PUBLIC_TERMS_URL: 'https://api.example.com/terms',
    EXPO_PUBLIC_PRIVACY_URL: 'https://api.example.com/privacy',
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('LegalRowGroup', () => {
  it('opens the Terms web page when the Terms row is pressed', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    await render(<LegalRowGroup />, { wrapper });

    fireEvent.press(screen.getByTestId('settings-terms-row'));

    expect(openURL).toHaveBeenCalledWith('https://api.example.com/terms');
  });

  it('opens the Privacy web page when the Privacy row is pressed', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    await render(<LegalRowGroup />, { wrapper });

    fireEvent.press(screen.getByTestId('settings-privacy-row'));

    expect(openURL).toHaveBeenCalledWith('https://api.example.com/privacy');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/mobile && npx jest src/features/settings/LegalRowGroup.test.tsx`
Expected: FAIL — cannot find module `./LegalRowGroup`.

- [ ] **Step 4: Write the component**

Create `apps/mobile/src/features/settings/LegalRowGroup.tsx`:

```tsx
import { Linking } from 'react-native';

import { ListRow, RowGroup } from '@/components';
import { settingsCopy } from '@/copy/settings';
import { env } from '@/lib/env';

/**
 * The Legal card in Settings: Terms and Privacy, each opening the
 * backend-served web page in the browser (03/07 — legal text lives only on the
 * backend, the app links to it). A row appears only when its URL is configured,
 * mirroring the paywall footer, so a dev build without the URLs simply omits it
 * rather than opening `undefined`.
 */
export function LegalRowGroup() {
  const terms = env.EXPO_PUBLIC_TERMS_URL;
  const privacy = env.EXPO_PUBLIC_PRIVACY_URL;

  if (!terms && !privacy) return null;

  return (
    <RowGroup separatorInset="edge">
      {terms ? (
        <ListRow
          title={settingsCopy.legal.terms.title}
          subtitle={settingsCopy.legal.terms.subtitle}
          onPress={() => void Linking.openURL(terms)}
          testID="settings-terms-row"
        />
      ) : null}
      {privacy ? (
        <ListRow
          title={settingsCopy.legal.privacy.title}
          subtitle={settingsCopy.legal.privacy.subtitle}
          onPress={() => void Linking.openURL(privacy)}
          testID="settings-privacy-row"
        />
      ) : null}
    </RowGroup>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/mobile && npx jest src/features/settings/LegalRowGroup.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Typecheck, lint, commit**

```bash
cd apps/mobile && npx tsc --noEmit && npx eslint src/features/settings src/copy/settings.ts
git add apps/mobile/src/copy/settings.ts apps/mobile/src/features/settings/LegalRowGroup.tsx apps/mobile/src/features/settings/LegalRowGroup.test.tsx
git commit -m "$(cat <<'EOF'
Settings: a Legal card that opens the backend Terms and Privacy pages

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Jd3JuMo9GhMqeS6Au7Me2i
EOF
)"
```

---

## Task 4: Wire the card into Settings + set the env URLs

**Files:**

- Modify: `apps/mobile/app/settings/index.tsx`
- Modify: `apps/mobile/dev.env`
- Modify: `apps/mobile/.env.local`

**Interfaces:**

- Consumes: `LegalRowGroup` from `@/features/settings/LegalRowGroup` (Task 3).

- [ ] **Step 1: Import and render the card**

In `apps/mobile/app/settings/index.tsx`:

1. Add the import with the other `@/features/...` imports:

```tsx
import { LegalRowGroup } from '@/features/settings/LegalRowGroup';
```

2. Render it inside the `<ScrollView>`, immediately after the closing `</RowGroup>` of the account group and before `</ScrollView>`:

```tsx
        <LegalRowGroup />
      </ScrollView>
```

(The account group is the second `<RowGroup>`, the one ending with the `settings-delete-row` `ListRow`. Place `<LegalRowGroup />` right after that group's `</RowGroup>`.)

- [ ] **Step 2: Set the URLs in dev.env**

In `apps/mobile/dev.env`, replace the commented legal-links block:

```
# EXPO_PUBLIC_TERMS_URL=https://aura.app/terms
# EXPO_PUBLIC_PRIVACY_URL=https://aura.app/privacy
```

with the live backend URLs:

```
EXPO_PUBLIC_TERMS_URL=https://eb-aura-manifest-daily.onrender.com/terms
EXPO_PUBLIC_PRIVACY_URL=https://eb-aura-manifest-daily.onrender.com/privacy
```

- [ ] **Step 3: Set the URLs in .env.local**

In `apps/mobile/.env.local`, add the same two lines (append near the other `EXPO_PUBLIC_*` values):

```
EXPO_PUBLIC_TERMS_URL=https://eb-aura-manifest-daily.onrender.com/terms
EXPO_PUBLIC_PRIVACY_URL=https://eb-aura-manifest-daily.onrender.com/privacy
```

- [ ] **Step 4: Verify env files stay gitignored**

Run: `git check-ignore apps/mobile/dev.env apps/mobile/.env.local`
Expected: both paths printed (both ignored). `git status --short` must NOT list either file.

- [ ] **Step 5: Typecheck and run the affected mobile tests**

Run:

```bash
cd apps/mobile && npx tsc --noEmit && npx jest src/features/settings
```

Expected: `tsc` exit 0; the `LegalRowGroup` suite passes.

- [ ] **Step 6: Commit (code only — env files are ignored)**

```bash
git add apps/mobile/app/settings/index.tsx
git commit -m "$(cat <<'EOF'
Settings: show the Legal card, pointing at the deployed backend pages

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Jd3JuMo9GhMqeS6Au7Me2i
EOF
)"
```

---

## Final verification (after all tasks)

- [ ] **Backend full suite:** `cd apps/backend && npx jest` → all pass.
- [ ] **Mobile full suite:** `cd apps/mobile && npx jest` → all pass (was 609; now +2).
- [ ] **Monorepo typecheck:** from repo root `pnpm turbo run typecheck` → all pass.
- [ ] **Deploy:** push `feature/theme-improve`; after Render redeploys, confirm `https://eb-aura-manifest-daily.onrender.com/privacy` and `/terms` return the pages in a browser.
- [ ] **Device (optional):** `expo start --clear` (Metro re-inlines the new `EXPO_PUBLIC_*`), open Settings → tap Terms/Privacy → the browser opens the page; open the paywall → footer Terms/Privacy links now render and work.
- [ ] **Handoff note:** remind the user to fill `[COMPANY NAME]`, `[CONTACT EMAIL]`, `[JURISDICTION]`, `[EFFECTIVE DATE]` in `apps/backend/src/legal/legal.content.ts` before publishing, and to have the text reviewed before a store submission.
