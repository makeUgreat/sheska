import { type Gate } from '../../support/gate';

export const MIN_SENTENCES = 1;
export const MAX_SENTENCES = 5;

export const SENTENCE_COUNT_GATE: Gate<readonly string[]> = {
  name: 'sentence-count',
  judge(sentences) {
    const count = sentences.length;

    return { passed: count >= MIN_SENTENCES && count <= MAX_SENTENCES, explanation: `${count}문장` };
  },
};
