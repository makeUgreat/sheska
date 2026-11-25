import { type Gate, type GateResult } from '@kernels/application';
import { type PostSummaryDraft } from './generate-post-summary.prompt';

export interface SentenceCountGateOptions {
  readonly min: number;
  readonly max: number;
}

export class SentenceCountGate implements Gate<PostSummaryDraft> {
  readonly name = 'sentence-count';

  constructor(private readonly options: SentenceCountGateOptions) {}

  judge({ sentences }: PostSummaryDraft): GateResult {
    const count = sentences.length;
    const { min, max } = this.options;

    return { passed: count >= min && count <= max, explanation: `${count}문장` };
  }
}
