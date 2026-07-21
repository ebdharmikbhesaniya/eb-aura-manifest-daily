import type { AffirmationTone, JobArtifact } from '@aura/shared';
import { Injectable } from '@nestjs/common';

import { ARTIFACT_SPEC } from '../artifact-spec';
import type { MemoryContext } from '../types';
import { PROMPT_VERSION, VOICE_CONSTITUTION, renderContextBlock } from './voice';

export interface BuiltPrompt {
  system: string;
  prompt: string;
  promptVersion: string;
  maxTokens: number;
}

/** Rough tokens-per-word for a maxTokens budget with headroom for JSON scaffolding. */
const TOKENS_PER_WORD = 2.2;
const JSON_OVERHEAD_TOKENS = 60;

/**
 * Both affirmation artifacts also emit a `whyLine` alongside the body, which the
 * `maxWords` ceiling (which counts only the affirmation text) does not include.
 * Budgeting for the text alone truncated the JSON mid-object — the model stopped
 * on `max_tokens`, the parse failed, and the job died as `malformed_output`.
 */
const AFFIRMATION_WHYLINE_WORDS = 25;
/** The guided flow returns three candidates to choose between (product 09 §9.3b). */
const GUIDED_CANDIDATES = 3;

/**
 * Prompt builders, one per artifact (08 §3). Every builder shares the voice
 * constitution and the rendered memory block; only the artifact spec differs.
 *
 * Builders are the ONLY place prompt text lives (08 §1) — swapping LLM vendors
 * never touches them. `promptVersion` is stamped onto every `qa_report` so the
 * quality dashboard can attribute a regression to a prompt change (08 §9).
 */
@Injectable()
export class PromptService {
  build(
    artifact: JobArtifact,
    context: MemoryContext,
    refineInput?: RefineInput,
    guided?: GuidedPromptInput,
  ): BuiltPrompt {
    switch (artifact) {
      case 'letter':
        return this.letter(context);
      case 'daily':
      case 'ondemand':
        return this.dailyOrOndemand(artifact, context);
      case 'refine':
        return this.refine(context, refineInput);
      case 'milestone':
        return this.milestone(context);
      case 'winback':
        return this.winback(context);
      case 'affirmation_daily':
        return this.affirmationDaily(context);
      case 'affirmation_guided':
        return this.affirmationGuided(context, guided);
    }
  }

  /**
   * The Letter (08 §3, product 08) — the wow. Structure the QA gate enforces:
   * name in the first sentence, dream city, ≥1 person, struggle→memory framing,
   * ≥1 exact phrase, dynamic date close.
   */
  private letter(context: MemoryContext): BuiltPrompt {
    const spec = ARTIFACT_SPEC.letter;
    const dateClose =
      context.startedWeekday && context.startedMonth
        ? `You started this on a ${context.startedWeekday} in ${context.startedMonth}. I remember. Keep going.`
        : 'I remember when you started. Keep going.';

    return this.assemble(
      spec,
      `Write her a letter from her future self — the woman she is becoming, writing back to who she is today.

Requirements:
- Open with her name in the very first sentence.
- Set it in her dream city.
- Name at least one of her people, with the feeling they carry.
- Reference what feels heaviest to her, once, in her own words — then show the morning it became a memory instead of a weight.
- Use at least a few of her exact phrases, unchanged.
- Warm, sensory, specific. ${spec.minWords}–${spec.maxWords} words.
- Close with this line, adapted lightly to your voice: "${dateClose}"

Return JSON: { "title": "a short italic-serif title", "body": "the letter" }`,
      context,
    );
  }

  private dailyOrOndemand(artifact: JobArtifact, context: MemoryContext): BuiltPrompt {
    const spec = ARTIFACT_SPEC[artifact];
    const anchor =
      artifact === 'ondemand' && context.memoryItems.length
        ? 'Anchor it to what she asked for, in her words, woven with what you know of her.'
        : 'A small, specific scene from the life she is building.';

    return this.assemble(
      spec,
      `Write her a daily moment — a first-person glimpse of her future life, as if she is living it right now.

Requirements:
- ${anchor}
- Agency framing: this is a life she is building, not one handed to her.
- Use at least three of her own words or details, literally.
- ${spec.minWords}–${spec.maxWords} words. Present tense, sensory, calm.

Return JSON: { "title": "a short italic-serif title", "body": "the moment" }`,
      context,
    );
  }

  private refine(context: MemoryContext, input?: RefineInput): BuiltPrompt {
    const spec = ARTIFACT_SPEC.refine;
    const direction = REFINE_DIRECTION_COPY[input?.direction ?? 'note'];
    const noteLine = input?.note ? `\nHer note: "${input.note}"` : '';

    return this.assemble(
      spec,
      `Rewrite this moment for her. Keep everything true to her, but ${direction}.${noteLine}

The moment to rewrite:
"""
${input?.previousBody ?? ''}
"""

Same rules as always — her words, agency framing, ${spec.minWords}–${spec.maxWords} words.
Return JSON: { "title": "a short italic-serif title", "body": "the rewritten moment" }`,
      context,
    );
  }

  private milestone(context: MemoryContext): BuiltPrompt {
    const spec = ARTIFACT_SPEC.milestone;
    return this.assemble(
      spec,
      `Seven days ago she began. Write her a short letter marking the week.

Requirements:
- Acknowledge the seven days without counting them like a streak.
- If she has written anything to you this week, quote one line of it back to her, verbatim.
- Identity framing: look who she is becoming. No badges, no congratulations-as-reward.
- ${spec.minWords}–${spec.maxWords} words.

Return JSON: { "title": "a short italic-serif title", "body": "the letter" }`,
      context,
    );
  }

  private winback(context: MemoryContext): BuiltPrompt {
    const spec = ARTIFACT_SPEC.winback;
    return this.assemble(
      spec,
      `She has been away a little while. Write her a small, warm moment about the dream she told you — no pressure, no guilt, no mention of her absence. Just a door left open.

${spec.minWords}–${spec.maxWords} words.
Return JSON: { "title": "a short italic-serif title", "body": "the moment" }`,
      context,
    );
  }

  /**
   * The exact strings that satisfy the QA verbatim gate — the SAME set the gate
   * itself collects (name, dream city, people, exact phrases). Affirmations are
   * short, and the model reliably drops the anchor unless it is handed the literal
   * list and told the line is rejected without one. Making the gate's requirement
   * explicit is what turns the recurring `verbatim_tokens` failure into a pass.
   */
  private verbatimAnchors(context: MemoryContext): string[] {
    return [
      context.name,
      context.dreamCity,
      ...context.people.map((person) => person.name),
      ...context.exactPhrases,
    ].filter((value): value is string => Boolean(value && value.trim()));
  }

  /** The hard-requirement line naming the anchors; empty when there are none to name. */
  private anchorRequirement(context: MemoryContext, where: string): string {
    const anchors = this.verbatimAnchors(context);
    if (anchors.length === 0) return '';
    const list = anchors.map((anchor) => `"${anchor}"`).join(', ');
    return `\nHARD REQUIREMENT — ${where} must contain at least one of these exact strings, word-for-word and unchanged: ${list}. A line without one is rejected.\n`;
  }

  private affirmationDaily(context: MemoryContext): BuiltPrompt {
    const spec = ARTIFACT_SPEC.affirmation_daily;
    return this.assemble(
      spec,
      `Write her one affirmation for today.

Requirements:
- Present tense, positive frame (never "I am not..."), identity form preferred ("I am someone who...").
- Anchored to one of her exact phrases or a specific detail she gave you, reused literally. Her values may colour the tone, but they come from a fixed list every user sees — echoing one back is not quoting her, and the QA gate will not count it.
- If the phrase you reach for is negatively framed or too long to fit, reach for a different one of her words rather than bending this into a negative or over-long line.
- A plausible stretch — a truth she is growing into, not a lie.
- ${spec.maxWords} words or fewer.
${this.anchorRequirement(context, 'the affirmation')}
Return JSON: { "title": "a two-or-three word mantra", "body": "the affirmation", "whyLine": "one line explaining why this works, grounded not mystical" }`,
      context,
      { words: spec.maxWords + AFFIRMATION_WHYLINE_WORDS },
    );
  }

  private affirmationGuided(context: MemoryContext, guided?: GuidedPromptInput): BuiltPrompt {
    const spec = ARTIFACT_SPEC.affirmation_guided;
    // Her studio selections steer the set; goalText is her own free words, so it
    // is offered as a phrase to anchor on, not as an instruction.
    const steer = guided
      ? `\nShe chose this for ${guided.goalArea}, wants to feel ${guided.feeling}, and picked a ${guided.tone} tone.${
          guided.goalText ? ` In her words: "${guided.goalText}".` : ''
        }\n`
      : '';
    return this.assemble(
      spec,
      `Write her three affirmation candidates to choose from.
${steer}
Each: present tense, positive frame, identity form preferred, ≤${spec.maxWords} words, a plausible stretch, and anchored to one of her exact phrases or a specific detail she gave you, reused literally — a value word from the fixed list is not quoting her and the QA gate will not count it.
${this.anchorRequirement(context, 'EACH of the three affirmations')}
Return JSON: { "candidates": [ { "text": "...", "whyLine": "why it works", "technique": "identity|present_tense|three_six_nine|scripting" }, ... three of them ] }`,
      context,
      {
        words: GUIDED_CANDIDATES * (spec.maxWords + AFFIRMATION_WHYLINE_WORDS),
        items: GUIDED_CANDIDATES,
      },
    );
  }

  /**
   * Shared assembly: constitution + context block + artifact instructions.
   *
   * `output` describes the real shape the model must emit so the token budget
   * fits it: `words` is the total across every text field (body + any why-line,
   * summed across candidates), and `items` scales the flat JSON overhead by how
   * many objects the response nests. Most artifacts return one {title, body};
   * the affirmations are the exceptions and pass their own numbers.
   */
  private assemble(
    spec: { maxWords: number },
    instructions: string,
    context: MemoryContext,
    output?: { words?: number; items?: number },
  ): BuiltPrompt {
    const words = output?.words ?? spec.maxWords;
    const items = output?.items ?? 1;
    return {
      system: VOICE_CONSTITUTION,
      prompt: `${renderContextBlock(context)}\n\n---\n\n${instructions}`,
      promptVersion: PROMPT_VERSION,
      maxTokens: Math.ceil(words * TOKENS_PER_WORD) + JSON_OVERHEAD_TOKENS * items,
    };
  }
}

export interface RefineInput {
  previousBody: string;
  direction: 'more_realistic' | 'softer' | 'more_ambitious' | 'note';
  note?: string;
}

/**
 * The three choices she made in the guided studio (product 09 §9.3b). Threaded
 * into the candidate prompt so the three affirmations actually answer the goal,
 * feeling, and tone she picked — without it the candidates ignore her selections.
 */
export interface GuidedPromptInput {
  goalArea: string;
  goalText?: string;
  feeling: string;
  tone: AffirmationTone;
}

const REFINE_DIRECTION_COPY: Record<RefineInput['direction'], string> = {
  more_realistic: 'make it more grounded and believable — closer to her real reach',
  softer: 'make it gentler and more tender',
  more_ambitious: 'let it reach further — a bigger version of the dream',
  note: 'follow her note below',
};
