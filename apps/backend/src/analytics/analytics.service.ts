import type { EventName, EventPayload } from '@aura/shared';
import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

import type { Env } from '../config/env.schema';

/** Metadata-only shape for a PostHog AI-Observability generation event. */
export interface AiGenerationMeta {
  model: string;
  artifact: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  isError: boolean;
}

/**
 * The backend's PostHog wrapper (13 §1): server events carry the same Supabase
 * `user_id` the mobile SDK identifies with, so identity unifies automatically.
 *
 * Same compile-time privacy property as mobile: `capture` accepts only catalog
 * events from `@aura/shared`, whose payloads are enums/booleans/buckets — user
 * content cannot be passed without a type error (13 §2).
 *
 * Without POSTHOG_SERVER_KEY (local dev, CI) this is a silent no-op (16 §1).
 */
@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly client: PostHog | null;

  constructor(config: ConfigService<Env, true>) {
    const key = config.get('POSTHOG_SERVER_KEY', { infer: true });

    this.client = key ? new PostHog(key, { flushAt: 20, flushInterval: 10_000 }) : null;
    if (!this.client) this.logger.log('PostHog disabled (no POSTHOG_SERVER_KEY)');
  }

  capture<E extends EventName>(userId: string, event: E, payload: EventPayload<E>): void {
    this.client?.capture({
      distinctId: userId,
      event,
      properties: payload,
    });
  }

  /**
   * Report an unexpected exception to PostHog Error Tracking (13 §monitoring).
   * id-only `distinctId` and no request body/user content in the properties —
   * exception payloads must never carry PII (14 §privacy). No-op without a key.
   */
  captureException(userId: string | undefined, error: unknown): void {
    this.client?.captureException(error, userId, { source: 'backend' });
  }

  /**
   * Emit a PostHog AI-Observability generation event (LLM analytics) —
   * METADATA ONLY. The prompt and the response are the user's memory context and
   * the Letter itself; `$ai_input`/`$ai_output` are deliberately NOT sent, so no
   * user content leaves the server (14 §privacy). What ships is model, token
   * counts, latency and success — the cost/throughput signal, nothing readable.
   */
  captureAiGeneration(userId: string, meta: AiGenerationMeta): void {
    this.client?.capture({
      distinctId: userId,
      event: '$ai_generation',
      properties: {
        $ai_provider: 'openai',
        $ai_model: meta.model,
        $ai_input_tokens: meta.inputTokens ?? 0,
        $ai_output_tokens: meta.outputTokens ?? 0,
        $ai_latency: meta.latencyMs / 1000, // PostHog expects seconds
        $ai_is_error: meta.isError,
        artifact: meta.artifact,
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    // Buffered events must not die with the process on deploy.
    await this.client?.shutdown();
  }
}
