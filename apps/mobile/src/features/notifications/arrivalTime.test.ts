import { formatArrivalTime } from './arrivalTime';

/**
 * The seconds field is the whole reason this exists: Postgres hands back
 * "08:00:00" for a `time` column and that string was rendering inside the
 * permission sheet's sentence.
 */
describe('formatArrivalTime', () => {
  it('drops the seconds Postgres adds to a time column', () => {
    expect(formatArrivalTime('08:00:00')).toBe('08:00');
  });

  it('leaves an already-short time alone', () => {
    expect(formatArrivalTime('20:00')).toBe('20:00');
  });

  it('falls back when she has no arrival time yet', () => {
    expect(formatArrivalTime(null)).toBe('07:00');
    expect(formatArrivalTime(undefined)).toBe('07:00');
    expect(formatArrivalTime('')).toBe('07:00');
  });

  it('honours a caller-supplied fallback', () => {
    expect(formatArrivalTime(null, '09:30')).toBe('09:30');
  });

  it('passes an unrecognised value through rather than guessing', () => {
    expect(formatArrivalTime('sunrise')).toBe('sunrise');
  });
});
