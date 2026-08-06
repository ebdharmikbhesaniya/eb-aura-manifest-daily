import type { JobStatusResponse } from '@aura/shared';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

/** Poll cadence (04 §2). Terminal states stop the poll. */
const POLL_INTERVAL_MS = 1500;

const TERMINAL: ReadonlySet<JobStatusResponse['status']> = new Set([
  'succeeded',
  'failed',
  'qa_failed',
]);

/**
 * Whether a job has reached a state it will never leave. Exported so callers that
 * react to job completion (e.g. Home's manifest reveal) gate on the SAME
 * definition the poll uses — reacting to an in-flight `running` was the bug that
 * stopped the manifest poll early and left the sheet open.
 */
export function isTerminalJobStatus(status: JobStatusResponse['status'] | undefined): boolean {
  return status !== undefined && TERMINAL.has(status);
}

/**
 * Polls a generation job until it reaches a terminal state (04 §2). The
 * generating ritual screen (Phase 6) reads this; when `status` is `succeeded`,
 * `momentId` names the row to load from Supabase.
 */
export function useGenerationJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ['generationJob', jobId],
    queryFn: () => api.jobStatus(jobId as string),
    enabled: Boolean(jobId),
    // Stop polling once the job is done; keep polling while it runs.
    refetchInterval: (query) =>
      isTerminalJobStatus(query.state.data?.status) ? false : POLL_INTERVAL_MS,
  });
}
