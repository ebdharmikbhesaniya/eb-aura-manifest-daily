import { LIMITS } from '@aura/shared';

import { validateEnv } from './env.schema';

/**
 * The env contract's crash-on-boot guarantee (04 §6) has a sharp edge in
 * production: a host like Render stores an unset variable as an EMPTY STRING,
 * not as absent. `z.coerce.number().default(n)` only fills `undefined`, so an
 * empty string coerced to `0` failed `.positive()` and killed boot — the exact
 * "MANIFEST_WEEKLY_LIMIT: Number must be greater than 0" deploy failure.
 *
 * A blank value must mean "use the default", identically to an absent one.
 */

/** The two required fields, so the schema has enough to parse in every case. */
const REQUIRED = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

describe('validateEnv — blank tunable limits fall back to defaults', () => {
  it('treats empty-string limits as unset (the Render deploy failure)', () => {
    const env = validateEnv({
      ...REQUIRED,
      MANIFEST_WEEKLY_LIMIT: '',
      REFINE_PER_MOMENT: '',
      PREGEN_INACTIVE_SKIP_DAYS: '',
      PREGEN_BUFFER_MINUTES: '',
    });

    expect(env.MANIFEST_WEEKLY_LIMIT).toBe(LIMITS.MANIFEST_WEEKLY_LIMIT);
    expect(env.REFINE_PER_MOMENT).toBe(LIMITS.REFINE_PER_MOMENT);
    expect(env.PREGEN_INACTIVE_SKIP_DAYS).toBe(LIMITS.PREGEN_INACTIVE_SKIP_DAYS);
    expect(env.PREGEN_BUFFER_MINUTES).toBe(LIMITS.PREGEN_BUFFER_MINUTES);
  });

  it('treats a blank PORT as unset rather than crashing on port 0', () => {
    const env = validateEnv({ ...REQUIRED, PORT: '' });
    expect(env.PORT).toBe(3000);
  });

  it('still honours a real numeric override', () => {
    const env = validateEnv({ ...REQUIRED, MANIFEST_WEEKLY_LIMIT: '9' });
    expect(env.MANIFEST_WEEKLY_LIMIT).toBe(9);
  });

  it('still rejects a genuinely invalid value (0 is not a blank)', () => {
    expect(() => validateEnv({ ...REQUIRED, REFINE_PER_MOMENT: '0' })).toThrow(/REFINE_PER_MOMENT/);
  });
});
