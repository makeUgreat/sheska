import { toProseLength } from './prose-length';
import { MAX_SENTENCES, MIN_SENTENCES } from './sentence-count.gate';
import { MAX_SUMMARY_RATIO } from './summary-ratio.gate';

const TYPICAL_SENTENCE_LENGTH = 88;

export function toSentenceLimit(body: string): number {
  const summaryBudget = toProseLength(body) * MAX_SUMMARY_RATIO;
  const sentences = Math.round(summaryBudget / TYPICAL_SENTENCE_LENGTH);

  return Math.min(MAX_SENTENCES, Math.max(MIN_SENTENCES, sentences));
}
