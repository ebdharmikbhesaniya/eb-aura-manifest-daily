import type { JobArtifact } from '@aura/shared';
import { findBannedLanguage } from '@aura/shared';

import { MockLlmProvider } from '../providers/llm/mock-llm.provider';
import { buildContext } from './__fixtures__/memory-context.fixture';
import { PERSONAS, type Persona } from './__fixtures__/personas';
import { ARTIFACT_SPEC, countWords } from './artifact-spec';
import { PromptService } from './prompt/prompt.service';
import { QaService } from './qa/qa.service';
import type { GeneratedArtifact, MemoryContext } from './types';

/**
 * Generation-quality golden tests (15 §5).
 *
 * 20 synthetic personas run the real path — prompt builder → MockLlm → defensive
 * parse → QA gate — and are asserted on PROPERTIES, never exact text: her words
 * present, no banned language, no excluded term, name-first, date-close, length.
 * Exact-text assertions would break on every prompt tweak and tell us nothing
 * about quality; properties are the actual contract.
 *
 * This is the suite that catches a prompt and the gate drifting out of agreement
 * — an artifact the model was instructed to produce but the gate would reject
 * fails here, not in production on a retry loop.
 */
describe('golden personas', () => {
  const prompts = new PromptService();
  const qa = new QaService();
  const llm = new MockLlmProvider();

  /** The pipeline's defensive parse (08 §3), mirrored for the harness. */
  const parse = (raw: string): GeneratedArtifact => {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('mock returned unparseable output');
    const obj = JSON.parse(match[0]) as { title?: unknown; body?: unknown };
    if (typeof obj.body !== 'string') throw new Error('mock returned no body');
    return { title: typeof obj.title === 'string' ? obj.title : '', body: obj.body };
  };

  const generate = async (artifact: JobArtifact, context: MemoryContext) => {
    const built = prompts.build(artifact, context);
    const response = await llm.generate({
      system: built.system,
      prompt: built.prompt,
      maxTokens: built.maxTokens,
      timeoutMs: 30_000,
      json: true,
    });
    const parsed = parse(response.text);
    return { parsed, result: qa.check(artifact, parsed, context), built };
  };

  it('covers twenty personas across all three archetypes (product 02)', () => {
    expect(PERSONAS).toHaveLength(20);
    expect(new Set(PERSONAS.map((p) => p.archetype))).toEqual(
      new Set(['quiet_dreamer', 'self_improver', 'believer']),
    );
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(20);
  });

  describe.each<JobArtifact>(['letter', 'daily', 'affirmation_daily'])('%s', (artifact) => {
    const spec = ARTIFACT_SPEC[artifact];

    describe.each(PERSONAS)('$id', ({ context }: Persona) => {
      it('passes the QA gate', async () => {
        const { result } = await generate(artifact, context);

        expect(result.flaggedRules).toEqual([]);
        expect(result.passed).toBe(true);
      });

      it('quotes her own words at or above the floor', async () => {
        const { result } = await generate(artifact, context);

        expect(result.tokensFound.length).toBeGreaterThanOrEqual(spec.minVerbatimTokens);
      });

      it('uses no banned or guilt language', async () => {
        const { parsed } = await generate(artifact, context);

        expect(findBannedLanguage(`${parsed.title}\n${parsed.body}`)).toEqual([]);
      });

      it('mentions nothing she excluded', async () => {
        const { parsed } = await generate(artifact, context);
        const combined = `${parsed.title}\n${parsed.body}`.toLowerCase();

        for (const term of context.neverInclude) {
          expect(combined).not.toContain(term.toLowerCase());
        }
      });

      it('stays inside the length bounds', async () => {
        const { parsed } = await generate(artifact, context);
        const words = countWords(parsed.body);

        expect(words).toBeGreaterThanOrEqual(spec.minWords);
        expect(words).toBeLessThanOrEqual(spec.maxWords);
      });

      it('keeps her sensitive struggle out of the title', async () => {
        const { parsed } = await generate(artifact, context);
        const title = parsed.title.toLowerCase();

        const distinctive = (context.struggle ?? '')
          .toLowerCase()
          .split(/[^a-z0-9]+/i)
          .filter((w) => w.length > 3);

        for (const word of distinctive) {
          expect(title).not.toContain(word);
        }
      });
    });
  });

  describe('letter-specific structure', () => {
    it.each(PERSONAS)('$id opens with her name', async ({ context }: Persona) => {
      const { parsed } = await generate('letter', context);
      const firstSentence = parsed.body.split(/[.!?]/)[0] ?? '';

      expect(firstSentence.toLowerCase()).toContain((context.name ?? '').toLowerCase());
    });

    it.each(PERSONAS)('$id closes on a weekday and a month', async ({ context }: Persona) => {
      const { parsed } = await generate('letter', context);
      const sentences = parsed.body
        .split(/[.!?]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const closing = sentences.slice(-3).join(' ').toLowerCase();

      expect(closing).toMatch(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/);
      expect(closing).toMatch(
        /january|february|march|april|may|june|july|august|september|october|november|december/,
      );
    });
  });

  describe('the affirmation voice (no forced token-stuffing)', () => {
    it('no longer forces her name or exact phrase, word-for-word, into a 20-word line', () => {
      // A 20-word affirmation carrying her name/city/phrase verbatim reads like a
      // filled-in template. Affirmations are personalized by THEME in the prompt
      // (her goal, how she describes herself), not by a verbatim token floor.
      const { prompt } = prompts.build('affirmation_daily', buildContext());

      expect(prompt).not.toContain('word-for-word');
      expect(prompt).toContain('do not paste her exact phrases');
    });

    it('accepts a natural affirmation that quotes none of her exact words', () => {
      const result = qa.check(
        'affirmation_daily',
        { title: 'Becoming', body: 'I am becoming the calm I keep looking for in other people.' },
        buildContext({ values: ['honesty', 'craft'] }),
      );

      expect(result.flaggedRules).not.toContain('verbatim_tokens');
    });
  });

  describe('sparse profiles: a name is required, but few words no longer blocks', () => {
    it('fails a letter for a user who never gave a name', async () => {
      const { result } = await generate('letter', buildContext({ name: null }));

      expect(result.flaggedRules).toContain('name_first');
    });

    it('generates a letter for a name-only profile — the floor caps at what she gave', async () => {
      // Previously this rejected: the floor of three was unsatisfiable with one
      // word. Now the floor caps at her one word (her name), which the letter
      // reuses, so she gets her letter instead of nothing.
      const { result } = await generate(
        'letter',
        buildContext({ dreamCity: null, people: [], exactPhrases: [] }),
      );

      expect(result.flaggedRules).not.toContain('verbatim_tokens');
    });

    it('still emits no banned language for a nearly-empty profile', async () => {
      const context = buildContext({
        selfDescription: null,
        dreamCity: null,
        dreamHome: null,
        values: [],
        people: [],
        memoryItems: [],
        exactPhrases: [],
        struggle: null,
        recentTitles: [],
      });
      const { parsed } = await generate('daily', context);

      expect(findBannedLanguage(`${parsed.title}\n${parsed.body}`)).toEqual([]);
    });
  });
});
