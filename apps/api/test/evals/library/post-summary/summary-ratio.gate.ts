import { type Gate } from '../../support/gate';
import { toProseLength } from './prose-length';

export const MAX_SUMMARY_RATIO = 0.4;

export interface SummaryRatioInput {
  readonly body: string;
  readonly sentences: readonly string[];
}

export const SUMMARY_RATIO_GATE: Gate<SummaryRatioInput> = {
  name: 'summary-ratio',
  judge({ body, sentences }) {
    const summaryLength = sentences.reduce((total, sentence) => total + sentence.length, 0);
    const proseLength = toProseLength(body);
    const ratio = summaryLength / proseLength;

    return {
      passed: ratio <= MAX_SUMMARY_RATIO,
      explanation: `요약 ${summaryLength}자 / 산문 ${proseLength}자 = ${Math.round(ratio * 100)}%`,
    };
  },
};
