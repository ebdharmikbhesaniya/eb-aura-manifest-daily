# Legal Pages: Privacy Policy & Terms — Design

**Date:** 2026-07-28
**Status:** Approved, pre-implementation

## Problem

The app must surface a Privacy Policy and Terms & Conditions — both for users and
because app stores require reachable legal links before a subscription build passes
review. Today `EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL` are unset, so the
paywall footer links (already wired to `Linking.openURL`) never render, and there is
nowhere else in the app to reach the policies. There is no canonical copy of either
document anywhere.

## Goals

- Serve both documents as standalone web pages from the backend, reachable directly
  by URL (e.g. `https://<backend>/privacy`, `https://<backend>/terms`).
- Surface them in the mobile app as tappable links that open those web pages.
- Keep the legal text in exactly ONE place (the backend) — no duplicated copy to
  drift out of sync. Updating a policy is a backend edit + redeploy, no app release.

## Non-goals

- No native in-app rendering of the legal text (links only).
- No in-app WebView (opens in the system browser, matching the existing paywall
  pattern).
- No legal review or jurisdiction-accurate wording — the content is a realistic
  template grounded in actual data practices, with company specifics as clearly
  marked placeholders for the founder/lawyer to complete.
- No CMS / admin editing — content is code.

## Approach

**Chosen: version-neutral NestJS controller returning self-contained HTML** built by
a small TypeScript template function. Rejected alternatives: `ServeStaticModule` with
static `.html` files (needs nest-cli asset-copy config + static middleware, awkward
with the global guard/versioning) and a templating engine (a whole view layer for two
pages — overkill). The chosen approach adds no dependencies, compiles straight into
`dist/`, and matches the thin-backend style.

## Backend (`apps/backend/src/legal/`)

The backend applies global URI versioning (`defaultVersion: '1'`, so API routes are
`/v1/*`) and a global auth guard (`SupabaseAuthGuard` via `APP_GUARD`). The legal
pages must sit OUTSIDE both: clean unversioned URLs, and public (no JWT).

- **`legal.content.ts`** — the policy text as structured data. A `LegalDocument` is
  `{ title, effectiveDate, intro, sections: { heading, body }[] }`. Two exported
  documents, `PRIVACY` and `TERMS`. Privacy content is grounded in the real stack:
  - Account/auth: email (Supabase Auth); Google/Apple sign-in identity.
  - User content: manifestation answers, journal/gratitude entries, generated
    letters and affirmations.
  - AI processing: text sent to the LLM provider (OpenAI) for generation; text sent
    to the TTS provider (ElevenLabs) to synthesize voice.
  - Analytics: product events (PostHog).
  - Purchases: subscription state (RevenueCat).
  - Diagnostics: crash/error reports (Sentry).
  - User rights: access, deletion (the app's existing account-delete path), contact.
  - Company specifics as placeholders: `[COMPANY NAME]`, `[CONTACT EMAIL]`,
    `[JURISDICTION]`, `[EFFECTIVE DATE]`.
- **`legal.template.ts`** — `renderLegalPage(doc: LegalDocument): string`. One shared,
  branded, mobile-responsive HTML layout with inline CSS (no external assets, so it
  renders offline/CSP-safe). Escapes interpolated text. Both pages share this layout;
  only the `LegalDocument` differs.
- **`legal.controller.ts`** — `@Controller({ version: VERSION_NEUTRAL })`. Two routes,
  each `@Public()` + `@Get('privacy')` / `@Get('terms')`, returning the rendered HTML
  with `@Header('Content-Type', 'text/html; charset=utf-8')`.
- **`legal.module.ts`** — declares the controller; registered in `app.module.ts`.

### Interfaces / boundaries

- `legal.content.ts` depends on nothing (pure data). Testable in isolation.
- `legal.template.ts` depends only on the `LegalDocument` type. Pure function:
  document in, HTML string out. Testable without HTTP.
- `legal.controller.ts` depends on both; its only job is routing + headers + public
  exposure.

## Mobile

- **Env:** set `EXPO_PUBLIC_TERMS_URL` and `EXPO_PUBLIC_PRIVACY_URL` in both
  `apps/mobile/dev.env` (canonical) and `apps/mobile/.env.local` (loaded) to
  `https://eb-aura-manifest-daily.onrender.com/terms` and `/privacy`. This alone
  makes the already-wired paywall footer links render and work.
- **Settings:** add a "Legal" section to `app/settings/index.tsx` with a Terms row and
  a Privacy row, each `Linking.openURL(...)` the corresponding env URL. Rows render
  only when their env URL is set (guard mirrors the paywall pattern), so a dev build
  without the URLs still runs.

## Data flow

```
mobile (paywall footer / settings row)
  └─ Linking.openURL(EXPO_PUBLIC_*_URL)
       └─ system browser → GET https://<backend>/privacy | /terms
            └─ LegalController (@Public, VERSION_NEUTRAL)
                 └─ renderLegalPage(PRIVACY | TERMS) → HTML
```

## Error handling

- Routes are static and take no input — no user-supplied data to validate, minimal
  failure surface. A missing route is a normal 404.
- Template escapes interpolated strings defensively even though content is static, so
  a future dynamic value can't break the markup.
- Mobile link rows are guarded on env presence; an unset URL simply hides the row
  rather than opening `undefined`.

## Testing

- `legal.template.spec.ts` — renders a `LegalDocument` and asserts the title,
  effective date, and each section heading appear; asserts HTML escaping.
- `legal.controller.spec.ts` — `GET /privacy` and `/terms` return 200 with
  `text/html`; routes carry `@Public()` (reachable without a JWT); body contains a
  known section heading.
- Mobile: extend the existing settings screen test to assert the Legal rows render
  when the env URLs are set and open the correct URL on press. Reuse the existing
  paywall test coverage for the footer links (no behavior change there).

## Rollout

1. Land backend + mobile changes on `feature/theme-improve`.
2. Push → Render redeploys → `/privacy` and `/terms` live.
3. Founder fills the `[PLACEHOLDER]` values in `legal.content.ts` (and, before a
   store submission, has the text reviewed).

## Files touched

- New: `apps/backend/src/legal/{legal.module,legal.controller,legal.content,legal.template}.ts`
- New: `apps/backend/src/legal/{legal.controller,legal.template}.spec.ts`
- Edit: `apps/backend/src/app.module.ts` (register `LegalModule`)
- Edit: `apps/mobile/app/settings/index.tsx` (Legal section)
- Edit: `apps/mobile/dev.env`, `apps/mobile/.env.local` (set the two URLs)
- Edit: mobile settings test
