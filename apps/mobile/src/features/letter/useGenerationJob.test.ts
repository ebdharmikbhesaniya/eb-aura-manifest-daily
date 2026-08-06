import { isTerminalJobStatus } from './useGenerationJob';

describe('isTerminalJobStatus', () => {
  it('is true only for terminal job states', () => {
    expect(isTerminalJobStatus('succeeded')).toBe(true);
    expect(isTerminalJobStatus('failed')).toBe(true);
    expect(isTerminalJobStatus('qa_failed')).toBe(true);
  });

  it('is false while the job is still in flight or unknown', () => {
    // These are the states that used to trip the manifest reveal into stopping
    // the poll early — leaving the sheet open and the list stale.
    expect(isTerminalJobStatus('queued')).toBe(false);
    expect(isTerminalJobStatus('running')).toBe(false);
    expect(isTerminalJobStatus('retrying')).toBe(false);
    expect(isTerminalJobStatus(undefined)).toBe(false);
  });
});
