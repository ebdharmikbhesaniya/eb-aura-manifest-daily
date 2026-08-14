import { scrubExceptionEvent, MAX_EXCEPTION_VALUE_LEN } from './errorScrub';

describe('scrubExceptionEvent', () => {
  it('passes a non-exception (catalog) event through untouched', () => {
    const evt = { event: 'purchase_completed', properties: { sku: 'annual' } };
    expect(scrubExceptionEvent(evt)).toBe(evt);
  });

  it('passes null through', () => {
    expect(scrubExceptionEvent(null)).toBeNull();
  });

  it('keeps the error type and a short technical message', () => {
    const evt = {
      event: '$exception',
      properties: { $exception_list: [{ type: 'TypeError', value: 'x is undefined' }] },
    };
    const out = scrubExceptionEvent(evt);
    expect(JSON.stringify(out)).toContain('TypeError');
    expect(JSON.stringify(out)).toContain('x is undefined');
  });

  it('redacts a long free-text value that could echo user content', () => {
    const secret = 'my dream is '.repeat(40); // > cap
    expect(secret.length).toBeGreaterThan(MAX_EXCEPTION_VALUE_LEN);
    const evt = {
      event: '$exception',
      properties: { $exception_list: [{ type: 'Error', value: secret }] },
    };
    const out = scrubExceptionEvent(evt);
    expect(JSON.stringify(out)).not.toContain('my dream is');
    expect(JSON.stringify(out)).toContain('[redacted');
    expect(JSON.stringify(out)).toContain('Error'); // type still kept
  });
});
