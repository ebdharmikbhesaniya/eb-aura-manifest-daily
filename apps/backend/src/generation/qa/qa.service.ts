import { Injectable } from '@nestjs/common';

import { findBannedLanguage, hasMonth, hasWeekday, NEGATIVE_FRAME_MARKERS } from '@aura/shared';
import type { JobArtifact, QaRule } from '@aura/shared';

import { ARTIFACT_SPEC, countWords } from '../artifact-spec';
import type { GeneratedArtifact, MemoryContext, QaResult } from '../types';

/**
 * The letter's date-close can span a few sentences (product 08's example is
 * "…on a Friday in July. I remember. Keep going."), so the check scans the last
 * N sentences rather than only the final one.
 */
const CLOSING_REGION_SENTENCES = 3;

/** The two artifacts that are spoken as first-person affirmations (08 §3, 14 §35). */
const AFFIRMATION_ARTIFACTS: ReadonlySet<JobArtifact> = new Set<JobArtifact>([
  'affirmation_daily',
  'affirmation_guided',
]);

/**
 * The deterministic QA gate (08 §5) — the release-blocking rules that decide
 * whether a generated artifact is allowed to reach her, run with no LLM so they
 * are fast and exhaustively testable (08 §5, 15 §2). Every rule here encodes a
 * product promise from 14: her own words back to her, her guilt-free surfaces,
 * her hard exclusions honoured. A conflict between output and this gate resolves
 * toward the gate — the model retries, it does not win.
 *
 * `check` is pure: same input, same verdict. The pipeline (08 §4) runs it once,
 * appends `correctiveNote` to a single retry prompt on failure, and hard-fails
 * the job on a second miss (08 §5).
 */
@Injectable()
export class QaService {
  check(artifact: JobArtifact, output: GeneratedArtifact, context: MemoryContext): QaResult {
    const spec = ARTIFACT_SPEC[artifact];
    const { title, body } = output;
    // Titles reach the notification and share surfaces, so banned/never-include
    // scans span both; presence scans that must NOT leak to the title (verbatim,
    // date-close) read the body alone.
    const combined = `${title}\n${body}`;
    const flagged: { rule: QaRule; note: string }[] = [];

    // 1. Verbatim tokens (14 §rule 3): the artifact must quote her, not paraphrase
    // her into template language. Falling below the floor means it stopped being
    // about her specifically.
    //
    // The floor is CAPPED at how many of her words actually exist: you cannot
    // require three quotes from a profile that only holds one. Leaving the floor
    // uncapped made every long-form generation (daily/letter/manifest) IMPOSSIBLE
    // to pass for a sparse profile — the model could write the perfect line and
    // still be rejected for a third word she never gave. A profile with only her
    // name now must reuse her name (still hers, not template), and a fuller
    // profile is still held to the full floor of three.
    const candidateTokens = collectVerbatimCandidates(context);
    const tokensFound = candidateTokens.filter((token) =>
      body.toLowerCase().includes(token.toLowerCase()),
    );
    const requiredTokens = Math.min(spec.minVerbatimTokens, candidateTokens.length);
    if (tokensFound.length < requiredTokens) {
      const available = candidateTokens.length > 0 ? `: ${candidateTokens.join(', ')}` : '';
      flagged.push({
        rule: 'verbatim_tokens',
        note: `Use at least ${requiredTokens} of her own words${available}.`,
      });
    }

    // 2. Name-first (14 §letters): a future-self letter opens with her name (08 §5).
    // A null name cannot satisfy this, so it fails closed rather than passing an
    // anonymous letter.
    if (spec.requiresNameFirst) {
      const firstSentence = body.split(/[.!?]/)[0] ?? '';
      const nameInFirst =
        context.name !== null && firstSentence.toLowerCase().includes(context.name.toLowerCase());
      if (!nameInFirst) {
        flagged.push({ rule: 'name_first', note: 'Open with her name in the first sentence.' });
      }
    }

    // 3. Banned phrases (14 §6): the shared list is the single source of truth,
    // read by both the mobile copy lint and this gate so the two never drift.
    const bannedHits = findBannedLanguage(combined);
    if (bannedHits.length > 0) {
      flagged.push({
        rule: 'banned_phrases',
        note: `Remove this banned phrasing: ${bannedHits.join(', ')}.`,
      });
    }

    // 4. Never-Include (09 §6): a re-check even though the prompt already excluded
    // these — a leak is a P1 (08 §5). Word-boundary, not substring: "cat" must not
    // trip on "category". Terms are user-authored, so every one is escaped before
    // it becomes a pattern — an unescaped "." would match anything.
    const neverHits = context.neverInclude.filter((term) => {
      const trimmed = term.trim();
      if (trimmed === '') return false;
      return new RegExp(`\\b${escapeRegExp(trimmed)}\\b`, 'i').test(combined);
    });
    if (neverHits.length > 0) {
      flagged.push({ rule: 'never_include', note: `Never mention: ${neverHits.join(', ')}.` });
    }

    // 5. Length (08 §3): per-artifact word bounds, using the shared word count so
    // the model is graded against the same measure it was instructed on.
    const words = countWords(body);
    if (words < spec.minWords || words > spec.maxWords) {
      flagged.push({
        rule: 'length',
        note: `Keep the body between ${spec.minWords} and ${spec.maxWords} words.`,
      });
    }

    // 6. Negative-frame (14 §35): brains process the negative first, so "anxiety
    // will not beat me" plants "anxiety beats me". Only affirmations are held to
    // this — letters may name a struggle gently in prose.
    if (AFFIRMATION_ARTIFACTS.has(artifact)) {
      const lowered = body.toLowerCase();
      const framed = NEGATIVE_FRAME_MARKERS.some((marker) => lowered.includes(marker));
      if (framed) {
        flagged.push({
          rule: 'negative_frame',
          note: 'Rewrite in positive, present-tense form — no "not", "never", or "won\'t".',
        });
      }
    }

    // 7. Sensitive-title (14 §notifications): her struggle is injected only into
    // body context and must never surface in a title that rides the notification
    // and share surfaces.
    //
    // Only DISTINCTIVE struggle words are checked — over 3 chars AND not a common
    // function word — and they must appear as WHOLE WORDS. Both guards exist
    // because the naive version false-positived constantly: a struggle like "the
    // fear that starting over means I've fallen behind" made every title carrying
    // "that"/"over"/"means" fail (common words), and the substring match rejected
    // "Fearless" (contains "fear") and "Discover" (contains "over"). The real
    // intent — keep the sensitive TOPIC out of the title — needs neither of those
    // misfires; "fallen"/"behind" as whole words still trip it, as they should.
    if (context.struggle !== null) {
      const leaked = distinctiveWords(context.struggle).filter((word) =>
        new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i').test(title),
      );
      if (leaked.length > 0) {
        flagged.push({
          rule: 'sensitive_title',
          note: 'Keep the sensitive topic out of the title.',
        });
      }
    }

    // 8. Date-close (14 §letters): a letter closes with the dynamic date line
    // ("You started this on a {weekday} in {month}"). Product 08's own canonical
    // close is three sentences — "…on a Friday in July. I remember. Keep going." —
    // so the date line is NOT the literal last sentence. The check inspects the
    // CLOSING REGION (the last few sentences) for both a weekday and a month;
    // lenient on format, strict on presence.
    if (spec.requiresDateClose) {
      const sentences = body
        .split(/[.!?]/)
        .map((s) => s.trim())
        .filter((s) => s !== '');
      const closing = sentences.slice(-CLOSING_REGION_SENTENCES).join(' ').toLowerCase();
      const weekdayPresent =
        hasWeekday(closing) ||
        (context.startedWeekday !== null && closing.includes(context.startedWeekday.toLowerCase()));
      const monthPresent =
        hasMonth(closing) ||
        (context.startedMonth !== null && closing.includes(context.startedMonth.toLowerCase()));
      if (!weekdayPresent || !monthPresent) {
        flagged.push({
          rule: 'date_close',
          note: 'End with the date line naming the weekday and month she started.',
        });
      }
    }

    return {
      passed: flagged.length === 0,
      flaggedRules: flagged.map((f) => f.rule),
      correctiveNote: flagged.map((f) => f.note).join(' '),
      tokensFound,
    };
  }
}

/**
 * The tokens that count as "her own words" (08 §5): her name, dream city, the
 * people she named, and her verbatim phrases. Deduped and stripped so an empty
 * or repeated token cannot inflate the verbatim count past its floor.
 */
function collectVerbatimCandidates(context: MemoryContext): string[] {
  const raw = [
    context.name,
    context.dreamCity,
    ...context.people.map((person) => person.name),
    ...context.exactPhrases,
  ];
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const value of raw) {
    if (value === null) continue;
    const trimmed = value.trim();
    if (trimmed === '') continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push(trimmed);
  }
  return tokens;
}

/**
 * Common English function words that are never themselves "the sensitive topic".
 * A struggle phrase routinely contains a few, and without this filter they turn
 * ordinary titles into false positives (Jenny's "…that starting over means…"
 * flagged any title with "that"/"over"/"means"). The topic-bearing words —
 * nouns, adjectives, the actual struggle — are not in here, so real leaks still
 * trip the scan.
 */
const TITLE_STOPWORDS: ReadonlySet<string> = new Set([
  'that',
  'this',
  'these',
  'those',
  'then',
  'than',
  'them',
  'they',
  'their',
  'there',
  'with',
  'from',
  'your',
  'yours',
  'been',
  'being',
  'have',
  'will',
  'would',
  'could',
  'should',
  'into',
  'onto',
  'upon',
  'over',
  'under',
  'about',
  'above',
  'below',
  'just',
  'like',
  'only',
  'more',
  'most',
  'some',
  'such',
  'very',
  'also',
  'even',
  'ever',
  'here',
  'much',
  'many',
  'each',
  'both',
  'when',
  'what',
  'which',
  'while',
  'where',
  'after',
  'before',
  'again',
  'because',
  'means',
  'does',
  'done',
  'around',
  'still',
  'yourself',
]);

/**
 * Distinctive struggle words for the title scan (08 §5) — lowercased, over 3
 * chars, and not a common function word. The stopword filter is what stops a
 * benign title from being rejected for sharing an "over"/"that" with the
 * struggle; see rule 7.
 */
function distinctiveWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((word) => word.length > 3 && !TITLE_STOPWORDS.has(word));
}

/** Escape regex metacharacters so a user-authored term is matched literally. */
function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
