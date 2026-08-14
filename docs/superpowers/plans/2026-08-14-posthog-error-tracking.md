# PostHog Error Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture unhandled exceptions and crashes from the Aura mobile app (React Native) and NestJS backend into PostHog Error Tracking, with readable (symbolicated) stack traces and release attribution — replacing the removed Sentry, and lighting up the `$exception` tile on the `Aura · 6 Error Tracking` dashboard.

**Architecture:** Both apps already own a single PostHog wrapper (`apps/mobile/src/lib/analytics.ts`, `apps/backend/src/analytics/analytics.service.ts`). Error tracking is added _through those wrappers only_ — no feature code touches the SDK. Mobile enables the SDK's exception + native-crash autocapture plus a top-level React `ErrorBoundary`; backend adds a global Nest exception filter. A privacy scrub (`beforeSend`) guarantees exception payloads carry no user content, consistent with the app's rule that user content never leaves the device (docs/technical/14 §privacy). Symbols (Hermes source maps, Android ProGuard, iOS dSYM) are uploaded per release with the already-installed `posthog-cli`.

**Tech Stack:** `posthog-react-native@^4.57`, `posthog-node`, NestJS, Expo Router, EAS Build, `posthog-cli`.

## Global Constraints

- **Autocapture of _events_ stays OFF** (privacy design, 13 §1). This plan enables autocapture of _exceptions_ only — a separate stream. They are not the same setting.
- **No PII in exception payloads.** Error messages, stack frames and context must never include user content (Letter text, journal entries, names, struggles). Person context is **id-only** (Supabase uuid), matching 14 §privacy. This is enforced by a `beforeSend`/scrub step, not left to convention.
- **No-key = no-op.** Without `EXPO_PUBLIC_POSTHOG_KEY` (mobile) / `POSTHOG_SERVER_KEY` (backend) the wrappers are already silent no-ops; error tracking must preserve that (local dev / CI capture nothing).
- **Only unexpected errors.** Backend must NOT report expected 4xx `HttpException`s (validation, auth, entitlement) — only 5xx / uncaught. Mobile reports unhandled JS errors, native crashes, and React render errors.
- **Exact SDK option shape must be read from the installed types** (`node_modules/posthog-react-native/**/*.d.ts`) before writing the config — v4.57 exposes `errorTracking.autocaptureExceptions` and `errorTracking.autocapture.nativeCrashes`; confirm the nesting.

---

## File Structure

- `apps/backend/src/analytics/analytics.service.ts` — add `captureException(userId, error)` wrapping posthog-node.
- `apps/backend/src/common/all-exceptions.filter.ts` _(new)_ — global filter: report 5xx/uncaught to PostHog, rethrow/format response unchanged.
- `apps/backend/src/main.ts` — register the filter globally.
- `apps/mobile/src/lib/analytics.ts` — enable `errorTracking` in `initAnalytics`, add `captureException(error, props?)` + a `beforeSend` PII scrub.
- `apps/mobile/src/components/AppErrorBoundary.tsx` _(new)_ — React error boundary → `captureException` + fallback UI.
- `apps/mobile/app/_layout.tsx` — wrap the tree in `AppErrorBoundary`.
- `apps/mobile/src/lib/errorScrub.ts` _(new)_ — pure PII-scrub used by `beforeSend` (unit-tested in isolation).
- `infra/posthog/RUNBOOK.md`, `infra/posthog/SERVICES.md` — flip Error Tracking status + document symbol upload.
- CI/build: symbol upload step (EAS build hook or a `pnpm` script calling `posthog-cli`).

---

### Task 1: Backend — `AnalyticsService.captureException`

**Files:**

- Modify: `apps/backend/src/analytics/analytics.service.ts`
- Test: `apps/backend/src/analytics/analytics.service.spec.ts`

**Interfaces:**

- Produces: `captureException(userId: string | undefined, error: unknown): void` on `AnalyticsService`.

- [ ] **Step 1: Write the failing test**

```ts
// analytics.service.spec.ts
it('captureException forwards to posthog-node with the user id', () => {
  const capture = jest.fn();
  // @ts-expect-error inject a fake client
  service['client'] = { captureException: capture, capture: jest.fn(), shutdown: jest.fn() };
  const err = new Error('boom');
  service.captureException('user_1', err);
  expect(capture).toHaveBeenCalledWith(err, 'user_1', expect.any(Object));
});

it('captureException is a no-op when disabled (no key)', () => {
  // @ts-expect-error simulate disabled
  service['client'] = null;
  expect(() => service.captureException('user_1', new Error('x'))).not.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm --filter @aura/backend test analytics.service` → FAIL (`captureException` undefined).

- [ ] **Step 3: Implement**

```ts
/**
 * Report an unexpected exception (13 §monitoring). id-only distinctId — never
 * any request body/user content in additionalProperties (14 §privacy).
 */
captureException(userId: string | undefined, error: unknown): void {
  this.client?.captureException(error, userId, { source: 'backend' });
}
```

- [ ] **Step 4: Run test** → PASS.

- [ ] **Step 5: Commit** — `feat(analytics): backend captureException wrapper`.

---

### Task 2: Backend — global exception filter (5xx / uncaught only)

**Files:**

- Create: `apps/backend/src/common/all-exceptions.filter.ts`
- Modify: `apps/backend/src/main.ts`
- Test: `apps/backend/src/common/all-exceptions.filter.spec.ts`

**Interfaces:**

- Consumes: `AnalyticsService.captureException` (Task 1).
- Produces: `AllExceptionsFilter` (implements `ExceptionFilter`), registered via `app.useGlobalFilters(...)`.

- [ ] **Step 1: Write the failing test**

```ts
// all-exceptions.filter.spec.ts
const analytics = { captureException: jest.fn() } as any;
const filter = new AllExceptionsFilter(analytics);
const host = mockArgumentsHost({ userId: 'user_1' }); // helper returning switchToHttp().getRequest/getResponse

it('reports a non-HttpException (500) to PostHog', () => {
  filter.catch(new Error('kaboom'), host);
  expect(analytics.captureException).toHaveBeenCalledWith('user_1', expect.any(Error));
});

it('does NOT report an expected 4xx HttpException', () => {
  filter.catch(new BadRequestException('bad'), host);
  expect(analytics.captureException).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test** → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  constructor(private readonly analytics: AnalyticsService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only report the unexpected: 5xx and anything that isn't a handled HttpException.
    if (status >= 500) {
      const userId: string | undefined = req?.user?.id ?? req?.userId;
      this.analytics.captureException(userId, exception);
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    // Preserve the existing response contract (envelope from 07 §5). Keep this
    // identical to the app's current 5xx body — do NOT leak `exception.message`.
    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, error: 'Internal Server Error' };
    res.status(status).json(body);
  }
}
```

- [ ] **Step 4: Register in `main.ts`** — after app creation: `app.useGlobalFilters(app.get(AllExceptionsFilter))` (provide it in the module, or `new AllExceptionsFilter(app.get(AnalyticsService))`). Run the app's e2e/health test → PASS, `/v1/health` still 200.

- [ ] **Step 5: Commit** — `feat(backend): global exception filter reports 5xx to PostHog`.

---

### Task 3: Mobile — PII scrub (pure, unit-tested)

**Files:**

- Create: `apps/mobile/src/lib/errorScrub.ts`
- Test: `apps/mobile/src/lib/errorScrub.test.ts`

**Interfaces:**

- Produces: `scrubException(event: Record<string, unknown>): Record<string, unknown> | null` — returns a sanitized event, or `null` to drop it.

- [ ] **Step 1: Write the failing test**

```ts
it('strips a long free-text message down to its error type', () => {
  const out = scrubException({
    $exception_list: [{ type: 'Error', value: 'user typed: my secret dream is …' }],
  });
  expect(JSON.stringify(out)).not.toContain('secret dream');
});
it('keeps error type + framework frames', () => {
  const out = scrubException({ $exception_list: [{ type: 'TypeError', value: 'x is undefined' }] });
  expect(out).not.toBeNull();
  expect(JSON.stringify(out)).toContain('TypeError');
});
```

- [ ] **Step 2: Run test** → FAIL.

- [ ] **Step 3: Implement** a conservative scrub: keep `type`, keep short technical `value`s, replace any `value` longer than N chars or matching app content markers with `'[redacted]'`; never keep custom properties that could carry user content. (Full code in the file — no placeholders.)

- [ ] **Step 4: Run test** → PASS.

- [ ] **Step 5: Commit** — `feat(analytics): exception PII scrub`.

---

### Task 4: Mobile — enable error tracking + `captureException` in the wrapper

**Files:**

- Modify: `apps/mobile/src/lib/analytics.ts`
- Test: `apps/mobile/src/lib/analytics.errortracking.test.ts`

**Interfaces:**

- Consumes: `scrubException` (Task 3).
- Produces: `captureException(error: unknown, properties?: Record<string, unknown>): void`.

- [ ] **Step 1: Write the failing test** — mock `posthog-react-native`; assert `initAnalytics()` constructs `PostHog` with an `errorTracking` option and a `beforeSend`, and that `captureException(err)` calls `client.captureException(err, …)`; and that with no key it's a no-op.

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** — extend the existing `new PostHog(apiKey, {...})`:

```ts
client = new PostHog(apiKey, {
  defaultOptIn: true,
  disabled: false,
  // Exceptions ONLY — event autocapture stays off (privacy note above).
  // NOTE: confirm the exact option shape against the installed .d.ts (v4.57).
  errorTracking: {
    autocaptureExceptions: true, // unhandled JS errors
    autocapture: { nativeCrashes: true }, // iOS/Android native crashes
  },
  // Last line of defence: scrub every outbound payload; drop if scrub returns null.
  beforeSend: (event) =>
    event?.event === '$exception' ? (scrubException(event) as typeof event) : event,
  ...(env.EXPO_PUBLIC_POSTHOG_HOST ? { host: env.EXPO_PUBLIC_POSTHOG_HOST } : {}),
});
```

```ts
/** Report a caught/render exception. id-only person context; scrubbed by beforeSend. */
export function captureException(error: unknown, properties?: Record<string, unknown>): void {
  client?.captureException(error, { source: 'mobile', ...properties });
}
```

- [ ] **Step 4: Run** the mobile test suite (the analytics mocks in onboarding/etc. already stub named exports; add `captureException: jest.fn()` where a full mock is asserted) → PASS.

- [ ] **Step 5: Commit** — `feat(analytics): enable PostHog exception + native-crash capture`.

---

### Task 5: Mobile — top-level `AppErrorBoundary`

**Files:**

- Create: `apps/mobile/src/components/AppErrorBoundary.tsx`
- Modify: `apps/mobile/app/_layout.tsx`
- Test: `apps/mobile/src/components/AppErrorBoundary.test.tsx`

**Interfaces:**

- Consumes: `captureException` (Task 4).
- Produces: `<AppErrorBoundary>` — catches render errors, calls `captureException`, renders a calm fallback (a "something went wrong, tap to retry" screen in-voice, no error codes shown — 05 §errors).

- [ ] **Step 1: Write the failing test** — render a child that throws; assert `captureException` called and the fallback (testID `app-error-fallback`) shows.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** a class component with `componentDidCatch(error) { captureException(error, { boundary: 'root' }); }` + fallback; wrap the router tree in `_layout.tsx`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(mobile): root error boundary reports render errors`.

---

### Task 6: Symbols + release tagging (readable stack traces)

**Files:**

- Modify: `apps/mobile/package.json` (a `posthog:symbols` script), `apps/mobile/eas.json` (post-build hook or documented manual step), `infra/posthog/RUNBOOK.md`.

- [ ] **Step 1:** Set a stable release identifier — reuse `Constants.expoConfig.version` (already the `app_version` super-property) so exceptions attribute to a release.
- [ ] **Step 2:** Add symbol upload with the installed `posthog-cli` after each store build: Hermes source maps (`posthog-cli hermes upload`), Android ProGuard (`posthog-cli proguard upload`), iOS dSYM (`posthog-cli dsym upload`). Use the CLI credentials fallback (see `infra/posthog/_cliAuth.mjs` precedent) or `POSTHOG_CLI_ENV_ID`/token via EAS secrets.
- [ ] **Step 3:** Document the exact commands + when they run (EAS `eas-build-on-success` hook or a release checklist step) in RUNBOOK §deployment.
- [ ] **Step 4: Commit** — `chore(mobile): upload error-tracking symbols per release`.

---

### Task 7: Verify end-to-end + docs

- [ ] **Step 1:** Add a hidden dev-only "throw test error" affordance (or a one-off) → confirm the exception appears under PostHog → Error Tracking, grouped, with a readable stack.
- [ ] **Step 2:** Confirm the `Err · Exceptions ($exception) — needs autocapture` tile on the `Aura · 6 Error Tracking` dashboard now populates; update its description (drop "needs autocapture") via `dashboards.mjs`.
- [ ] **Step 3:** Flip **Error Tracking** status to ✅ in `infra/posthog/SERVICES.md` and note the wiring in `docs/technical/16-DEPLOYMENT.md` (monitoring rows already point to PostHog Error Tracking).
- [ ] **Step 4:** Verify no PII: inspect a real captured exception's payload in PostHog and confirm no user content/message leakage.
- [ ] **Step 5: Commit** — `docs: mark Error Tracking live; refresh $exception tile`.

---

## Open decision (confirm before Task 4)

**Enable exception _autocapture_, or manual-only?** Recommendation: **enable autocapture** (unhandled JS + native crashes) — it's the whole value of error tracking, and the `beforeSend` scrub (Task 3) + id-only context keep it within the privacy rule. If the team wants to be maximally conservative first, ship Tasks 1–2 (backend) and Task 5 (manual ErrorBoundary) _without_ `autocaptureExceptions`, watch payloads for a week, then flip autocapture on. Both paths use the same code; it's one boolean.

## Self-Review

- **Spec coverage:** RN unhandled + native crashes (T4), RN render errors (T5), backend 5xx (T1–2), symbols/readability (T6), privacy scrub (T3), verification + dashboard (T7). ✓
- **Types consistent:** `captureException(userId, error)` (backend) vs `captureException(error, props?)` (mobile) — intentionally different signatures per platform SDK; both named the same for symmetry, documented here.
- **No placeholders:** each task has real code or a precise instruction; the two "full code in file" notes (scrub bodies, fallback UI) are marked and bounded.
