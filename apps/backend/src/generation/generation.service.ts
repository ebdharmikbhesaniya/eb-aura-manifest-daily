import type { GenerationFailureReason, JobArtifact, Json } from '@aura/shared';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { AnalyticsService } from '../analytics/analytics.service';
import { MemoryContextService } from '../memory/memory-context.service';
import {
  LLM_PROVIDER,
  type LlmGenerateRequest,
  type LlmGenerateResponse,
  type LlmProvider,
} from '../providers/llm/llm-provider.interface';
import { TTS_PROVIDER, type TtsProvider } from '../providers/tts/tts-provider.interface';
import { CrisisDetectionService } from '../safety/crisis-detection.service';
import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import {
  ARTIFACT_MODEL_TIER,
  type GeneratedArtifact,
  type MemoryContext,
  type ModelTier,
} from './types';
import { ARTIFACT_SPEC } from './artifact-spec';
import { AudioMixService } from './audio-mix.service';
import { CreditsService } from './credits.service';
import { JobsService, QaFailedError, type JobRow } from './jobs/jobs.service';
import { PromptService, type GuidedPromptInput, type RefineInput } from './prompt/prompt.service';
import { QaService } from './qa/qa.service';
import { StorageService } from './storage.service';

/**
 * The generation orchestrator (08 §4) — the pipeline every artifact runs through:
 *
 *   CrisisCheck → MemoryContext → Prompt → LLM → QA → TTS → Storage → moments row
 *
 * It registers itself as the JobsService runner, which owns the retry lanes; the
 * orchestrator's job is to compose the steps and translate their failures into
 * the two error kinds the state machine understands (QaFailedError vs. any other).
 */
@Injectable()
export class GenerationService implements OnModuleInit {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    private readonly jobs: JobsService,
    private readonly credits: CreditsService,
    private readonly memory: MemoryContextService,
    private readonly prompts: PromptService,
    private readonly qa: QaService,
    private readonly crisis: CrisisDetectionService,
    private readonly storage: StorageService,
    private readonly audioMix: AudioMixService,
    private readonly analytics: AnalyticsService,
    private readonly config: ConfigService<Env, true>,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    @Inject(TTS_PROVIDER) private readonly tts: TtsProvider,
    @Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient,
  ) {}

  onModuleInit(): void {
    this.jobs.registerRunner((job) => this.runPipeline(job));
  }

  /**
   * Runs one job end-to-end. Throws `QaFailedError` (→ corrective retry) or any
   * other error (→ provider backoff retry); the JobsService state machine catches
   * both. Returns the created moment id.
   */
  private async runPipeline(job: JobRow): Promise<{ momentId: string | null }> {
    const started = Date.now();
    if (job.artifact === 'letter')
      this.analytics.capture(job.user_id, 'letter_generation_started', {});

    try {
      const context = await this.memory.assemble(job.user_id, job.artifact);

      // The letter's crisis edge (Phase 5 edge cases): never block the wow. If the
      // struggle is crisis-flagged, generate the letter WITHOUT the struggle theme
      // and flag it supportive — the manifest/refine paths 422 instead (14 §5),
      // but the letter is the one thing she is promised no matter what.
      let supportive = false;
      if (job.artifact === 'letter' && context.struggle) {
        const { isCrisis } = await this.crisis.screen(context.struggle);
        if (isCrisis) {
          supportive = true;
          context.struggle = null;
        }
      }

      // Refine and Manifest carry input from the request through the job row
      // (04 §4), so a crash re-queue regenerates the SAME thing rather than a
      // generic moment she never asked for.
      const input = parseJobInput(job.input);

      // The guided studio is the one artifact that is not a single {title, body}
      // moment: it produces three candidate affirmations she chooses between, so
      // it parses and persists differently (product 09 §9.3b). It writes rows to
      // `affirmations`, not `moments`, and so returns no moment id.
      if (job.artifact === 'affirmation_guided') {
        await this.runGuided(job, context, input.guided);
        return { momentId: null };
      }

      const artifact = await this.generateWithQa(
        job.user_id,
        job.artifact,
        context,
        input.refine,
        input.desire,
      );

      // A cadence directive that actually reached the output is a micro-wow
      // landing (09 §5). Reported so the "it remembers me" effect is measurable
      // rather than assumed — the directives were being computed and never counted.
      for (const directive of context.directives) {
        this.analytics.capture(job.user_id, 'callback_delivered', { type: directive.kind });
      }

      const momentId = await this.persist(job, context, artifact, supportive, input);

      // Refining teaches the memory what she prefers (product 09 §9.1) — the
      // point of the feature is not this one rewrite, it is that the next moment
      // already sounds more like her.
      if (job.artifact === 'refine' && input.refine) {
        await this.recordRefinePreference(job.user_id, input.refine.direction);
      }

      if (job.artifact === 'letter') {
        this.analytics.capture(job.user_id, 'letter_generation_succeeded', {
          latency_s: Math.round((Date.now() - started) / 1000),
        });
      }
      return { momentId };
    } catch (error) {
      const reason = this.classify(error);
      // The job row stores only the classified `reason` (and the worker further
      // collapses everything non-QA to `provider_error`), so the underlying
      // cause is invisible without this. The message is safe to log — it names
      // the failure mode ("OpenAI 429…", "unparseable output"), never the prompt
      // or her content, which live in the request, not the error.
      this.logger.warn(
        `Pipeline ${job.artifact} failed (${reason}): ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
      );
      if (job.artifact === 'letter') {
        this.analytics.capture(job.user_id, 'letter_generation_failed', { reason });
      }
      this.analytics.capture(job.user_id, 'generation_failed', {
        surface: job.artifact,
        reason,
      });

      // A Manifest credit is reserved BEFORE generation to close the
      // two-requests-see-the-last-credit race, which means every failure after
      // that point owes her the credit back. Product 09 §9.2: "Error: retry,
      // credit not consumed" — and a provider timeout or a QA double-fail is
      // exactly the error she did not cause. Refunding only on enqueue failure
      // (which is where this used to stop) left the common failures charged.
      if (job.artifact === 'ondemand' && this.isFinalAttempt(error, job)) {
        await this.credits.refund(job.user_id);
      }

      throw error;
    }
  }

  /**
   * Call the LLM and emit a PostHog AI-Observability event (metadata only — token
   * counts, latency, model, success). The prompt/response never leave the server
   * (14 §privacy); `captureAiGeneration` omits `$ai_input`/`$ai_output` by design.
   */
  private async tracedGenerate(
    userId: string,
    artifact: JobArtifact,
    req: LlmGenerateRequest,
  ): Promise<LlmGenerateResponse> {
    const started = Date.now();
    try {
      const response = await this.llm.generate(req);
      this.analytics.captureAiGeneration(userId, {
        model: req.model ?? 'default',
        artifact,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        latencyMs: Date.now() - started,
        isError: false,
      });
      return response;
    } catch (error) {
      this.analytics.captureAiGeneration(userId, {
        model: req.model ?? 'default',
        artifact,
        latencyMs: Date.now() - started,
        isError: true,
      });
      throw error;
    }
  }

  /**
   * LLM call → defensive JSON parse → QA gate. Throws QaFailedError on a gate
   * failure; the state machine turns that into one corrective regeneration whose
   * retry re-enters here with no change (the corrective note lives in the prompt
   * for a future refinement — at V1 the retry is a fresh sample, which is enough).
   */
  private async generateWithQa(
    userId: string,
    artifact: JobArtifact,
    context: MemoryContext,
    refineInput?: RefineInput,
    desire?: string,
  ): Promise<GeneratedArtifact> {
    // A Manifest desire is HER request in her own words, so it joins the context
    // as an exact phrase rather than as an instruction — the prompt already
    // tells the model to reuse those literally (08 §3).
    const withDesire = desire
      ? { ...context, exactPhrases: [desire, ...context.exactPhrases] }
      : context;
    const built = this.prompts.build(artifact, withDesire, refineInput);

    const response = await this.tracedGenerate(userId, artifact, {
      system: built.system,
      prompt: built.prompt,
      maxTokens: built.maxTokens,
      timeoutMs: artifact === 'letter' ? 30_000 : 15_000,
      model: this.modelFor(ARTIFACT_MODEL_TIER[artifact]),
      json: true,
    });

    const parsed = this.parseArtifact(response.text);

    const result = this.qa.check(artifact, parsed, withDesire);
    for (const rule of result.flaggedRules) {
      this.analytics.capture(userId, 'generation_qa_flagged', { rule });
    }
    if (!result.passed) throw new QaFailedError(result.flaggedRules);

    return parsed;
  }

  /**
   * Defensive parse (08 §3): the model is asked for strict JSON, but a stray code
   * fence or leading prose must not crash the job. Extract the first JSON object;
   * a genuinely unparseable body is a malformed-output error (provider retry).
   */
  private parseArtifact(raw: string): GeneratedArtifact {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new MalformedOutputError();

    try {
      const obj = JSON.parse(match[0]) as { title?: unknown; body?: unknown };
      if (typeof obj.body !== 'string' || obj.body.trim() === '') throw new MalformedOutputError();
      return { title: typeof obj.title === 'string' ? obj.title : '', body: obj.body };
    } catch {
      throw new MalformedOutputError();
    }
  }

  /**
   * The guided studio pipeline (product 09 §9.3b): prompt → LLM → parse the
   * candidate array → QA each candidate → persist as `affirmations` rows she can
   * choose between. Mirrors `generateWithQa` but for the three-candidate shape;
   * throws the same `QaFailedError`/`MalformedOutputError` the state machine reads.
   */
  private async runGuided(
    job: JobRow,
    context: MemoryContext,
    guided: GuidedPromptInput | undefined,
  ): Promise<void> {
    const built = this.prompts.build('affirmation_guided', context, undefined, guided);

    const response = await this.tracedGenerate(job.user_id, 'affirmation_guided', {
      system: built.system,
      prompt: built.prompt,
      maxTokens: built.maxTokens,
      timeoutMs: 15_000,
      model: this.modelFor(ARTIFACT_MODEL_TIER.affirmation_guided),
      json: true,
    });

    const candidates = this.parseCandidates(response.text);

    // Every candidate is held to the same gate a single affirmation is (the text
    // rides her collection just the same). One failure fails the pass, which the
    // state machine turns into a single corrective regeneration.
    for (const candidate of candidates) {
      const result = this.qa.check(
        'affirmation_guided',
        { title: '', body: candidate.text },
        context,
      );
      for (const rule of result.flaggedRules) {
        this.analytics.capture(job.user_id, 'generation_qa_flagged', { rule });
      }
      if (!result.passed) throw new QaFailedError(result.flaggedRules);
    }

    await this.persistCandidates(job.user_id, guided, candidates);
  }

  /** Defensive parse of the `{ candidates: [...] }` guided shape (see `parseArtifact`). */
  private parseCandidates(raw: string): GuidedCandidate[] {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new MalformedOutputError();

    try {
      const obj = JSON.parse(match[0]) as { candidates?: unknown };
      if (!Array.isArray(obj.candidates)) throw new MalformedOutputError();

      const candidates = obj.candidates
        .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === 'object')
        .map((c) => ({
          text: typeof c.text === 'string' ? c.text.trim() : '',
          whyLine: typeof c.whyLine === 'string' && c.whyLine.trim() !== '' ? c.whyLine : null,
          technique: typeof c.technique === 'string' ? c.technique : null,
        }))
        .filter((c) => c.text !== '')
        // The studio shows three; a model that over-produces is trimmed rather
        // than failed, and one that under-produces still gives her a choice.
        .slice(0, 3);

      if (candidates.length === 0) throw new MalformedOutputError();
      return candidates;
    } catch (error) {
      if (error instanceof MalformedOutputError) throw error;
      throw new MalformedOutputError();
    }
  }

  /**
   * Writes the candidate set for her to choose from. A fresh pass first clears any
   * candidates still lingering from an earlier, abandoned pass — the studio shows
   * every `candidate` row, so leftovers would stack. Kept affirmations are left
   * untouched; retiring the siblings of the one she keeps is the keep endpoint's job.
   */
  private async persistCandidates(
    userId: string,
    guided: GuidedPromptInput | undefined,
    candidates: GuidedCandidate[],
  ): Promise<void> {
    await this.supabase
      .from('affirmations')
      .delete()
      .eq('user_id', userId)
      .eq('kind', 'guided')
      .eq('status', 'candidate');

    const rows = candidates.map((candidate) => ({
      user_id: userId,
      kind: 'guided' as const,
      status: 'candidate' as const,
      text: candidate.text,
      why_line: candidate.whyLine,
      technique: candidate.technique,
      goal_area: guided?.goalArea ?? null,
    }));

    const { error } = await this.supabase.from('affirmations').insert(rows);
    if (error) throw new Error(`Persist candidates failed: ${error.message}`);
  }

  /** Persists the moment row, then synthesizes + uploads audio for spoken artifacts. */
  private async persist(
    job: JobRow,
    context: MemoryContext,
    artifact: GeneratedArtifact,
    supportive: boolean,
    input: ParsedJobInput = { refine: undefined, desire: undefined, guided: undefined },
  ): Promise<string> {
    const spec = ARTIFACT_SPEC[job.artifact];

    const { data: moment, error } = await this.supabase
      .from('moments')
      .insert({
        user_id: job.user_id,
        type: momentType(job.artifact),
        status: 'generating',
        title: artifact.title,
        body: artifact.body,
        // Lineage is what caps refine at one per moment (product 09 §9.1) and
        // what lets Home show a refined moment in place of its original.
        ...(input.refine?.momentId ? { refine_of: input.refine.momentId } : {}),
        ...(input.desire ? { desire_text: input.desire } : {}),
        qa_report: {
          prompt_version: this.prompts.build(job.artifact, context).promptVersion,
          supportive,
        },
      })
      .select('id')
      .single();

    if (error || !moment) throw new Error(`Persist failed: ${error?.message}`);

    if (spec.hasAudio) {
      // TTS runs after a successful LLM+QA pass; a TTS failure retries TTS only
      // in spirit (here the whole job retries, but the LLM output is deterministic
      // enough that a re-run is cheap and correct at V1). 10 §2.
      const voiceId = this.config.get('ELEVENLABS_VOICE_ID', { infer: true }) ?? 'default';
      const synth = await this.tts.synthesize({ text: artifact.body, voiceId });
      const audioPath = await this.storage.uploadMomentAudio(job.user_id, moment.id, synth.audio);

      // Best-effort ambient bed: a mix or upload failure must never fail the job.
      // The voice-only file above is the canonical artifact; the music file is a
      // bonus the player picks when the user has ambient on. No DB column: the
      // file lands at the DETERMINISTIC path `{user}/{moment}-music.mp3`, and the
      // app derives that from `audio_path` — so this needs no schema change.
      try {
        const mixed = await this.audioMix.mix(synth.audio);
        await this.storage.uploadMomentMusic(job.user_id, moment.id, mixed);
      } catch (err) {
        this.logger.warn(`ambient mix skipped for ${moment.id}: ${(err as Error).message}`);
      }

      await this.supabase
        .from('moments')
        .update({
          status: 'ready',
          audio_path: audioPath,
          // Plain {word,startMs,endMs} objects — jsonb-serializable, but the
          // generated Json type wants an index signature these interfaces lack.
          word_timings: synth.wordTimings as unknown as Json,
          duration_ms: synth.durationMs,
        })
        .eq('id', moment.id);
    } else {
      await this.supabase.from('moments').update({ status: 'ready' }).eq('id', moment.id);
    }

    return moment.id;
  }

  /**
   * Writes what she asked for as an evolving preference (09 §1, product 09 §9.1).
   *
   * Deliberately records the DIRECTION, never the note's free text: "she prefers
   * gentler" is a durable fact about her voice; the sentence she typed at 7am is
   * a moment, and the memory tier for that is not permanent.
   */
  private async recordRefinePreference(userId: string, direction: string): Promise<void> {
    const content = REFINE_PREFERENCE_MEMORY[direction];
    if (!content) return;

    await this.supabase.from('memory_items').insert({
      user_id: userId,
      category: 'preference',
      tier: 'evolving',
      content,
      source: 'refine',
      emotional_weight: 2,
    });
  }

  private modelFor(tier: ModelTier): string {
    if (tier === 'flagship') return this.config.get('LLM_MODEL_FLAGSHIP', { infer: true });
    if (tier === 'mid') return this.config.get('LLM_MODEL_MID', { infer: true });
    return this.config.get('LLM_MODEL_MINI', { infer: true });
  }

  /**
   * Is this the attempt after which the job gives up?
   *
   * The state machine retries provider errors twice and QA failures once, so a
   * refund on the first failure would hand back a credit for a job that then
   * succeeds. Only the terminal attempt owes one.
   */
  private isFinalAttempt(error: unknown, job: JobRow): boolean {
    return error instanceof QaFailedError ? job.attempt >= 2 : job.attempt >= 3;
  }

  private classify(error: unknown): GenerationFailureReason {
    if (error instanceof QaFailedError) return 'qa_failed';
    if (error instanceof MalformedOutputError) return 'malformed_output';
    if (error instanceof Error && /tim* out|abort/i.test(error.message)) return 'provider_timeout';
    return 'provider_error';
  }
}

/**
 * Job input, parsed defensively.
 *
 * The row is jsonb written by this service's own controller, but it also
 * survives a restart and a re-queue — so it is validated rather than trusted.
 * Anything unrecognisable degrades to "no input", which produces a plain moment
 * instead of throwing on a row that cannot be fixed by retrying.
 */
export interface ParsedJobInput {
  refine: (RefineInput & { momentId: string }) | undefined;
  desire: string | undefined;
  guided: GuidedPromptInput | undefined;
}

/** One parsed candidate from a guided pass, before it becomes an `affirmations` row. */
interface GuidedCandidate {
  text: string;
  whyLine: string | null;
  technique: string | null;
}

const REFINE_DIRECTIONS = new Set(['more_realistic', 'softer', 'more_ambitious', 'note']);

function parseJobInput(raw: unknown): ParsedJobInput {
  if (!raw || typeof raw !== 'object')
    return { refine: undefined, desire: undefined, guided: undefined };

  const value = raw as Record<string, unknown>;
  const desire =
    typeof value.desire === 'string' && value.desire.trim() !== '' ? value.desire : undefined;

  const guidedRaw = value.guided as Record<string, unknown> | undefined;
  const guided =
    guidedRaw && typeof guidedRaw.goalArea === 'string'
      ? {
          goalArea: guidedRaw.goalArea,
          ...(typeof guidedRaw.goalText === 'string' ? { goalText: guidedRaw.goalText } : {}),
        }
      : undefined;

  const refineRaw = value.refine as Record<string, unknown> | undefined;
  const refine =
    refineRaw &&
    typeof refineRaw.momentId === 'string' &&
    typeof refineRaw.previousBody === 'string' &&
    typeof refineRaw.direction === 'string' &&
    REFINE_DIRECTIONS.has(refineRaw.direction)
      ? {
          momentId: refineRaw.momentId,
          previousBody: refineRaw.previousBody,
          direction: refineRaw.direction as RefineInput['direction'],
          ...(typeof refineRaw.note === 'string' ? { note: refineRaw.note } : {}),
        }
      : undefined;

  return { refine, desire, guided };
}

class MalformedOutputError extends Error {
  constructor() {
    super('LLM returned unparseable output');
    this.name = 'MalformedOutputError';
  }
}

/** Direction → the durable fact it implies about her voice. */
const REFINE_PREFERENCE_MEMORY: Record<string, string> = {
  more_realistic: 'She prefers moments that stay close to her real reach',
  softer: 'She prefers a gentler, more tender tone',
  more_ambitious: 'She prefers moments that reach further than she would ask for',
  note: 'She has asked for a moment to be rewritten in her own direction',
};

function momentType(
  artifact: JobArtifact,
): 'letter' | 'daily' | 'ondemand' | 'milestone' | 'winback' {
  if (artifact === 'letter') return 'letter';
  if (artifact === 'milestone') return 'milestone';
  if (artifact === 'winback') return 'winback';
  if (artifact === 'ondemand' || artifact === 'refine') return 'ondemand';
  return 'daily';
}
