/**
 * PII scrub for outbound PostHog events (14 §privacy).
 *
 * Runs as the SDK's `before_send` hook on EVERY event. Catalog events are already
 * PII-safe by construction (enums / booleans / bucketed counts — 13 §2), so they
 * pass through untouched. The one stream that can carry free text is `$exception`
 * (autocaptured JS errors + rejections): an error thrown with a message built from
 * user content would otherwise leave the device. We keep the error TYPE and short
 * technical messages — which is what makes a stack useful — but redact any
 * long free-text `value` that could echo what the user typed.
 *
 * Kept pure and framework-free so it's unit-tested without the SDK.
 */

/**
 * Minimal shape of the SDK's CaptureEvent we touch. `event` is required (the
 * `before_send` hook always receives a named event or `null`), which keeps this
 * assignable to `@posthog/core`'s `BeforeSendFn` without importing it.
 */
export interface ScrubbableEvent {
  event: string;
  properties?: Record<string, unknown>;
}

/** Anything longer than this in an exception message is treated as possible user content. */
export const MAX_EXCEPTION_VALUE_LEN = 240;

export function scrubExceptionEvent(event: ScrubbableEvent | null): ScrubbableEvent | null {
  if (!event || event.event !== '$exception') return event;

  const list = event.properties?.['$exception_list'];
  if (Array.isArray(list)) {
    for (const item of list) {
      if (item && typeof item === 'object') {
        const value = (item as Record<string, unknown>).value;
        if (typeof value === 'string' && value.length > MAX_EXCEPTION_VALUE_LEN) {
          (item as Record<string, unknown>).value = '[redacted: exceeded length cap]';
        }
      }
    }
  }
  return event;
}
