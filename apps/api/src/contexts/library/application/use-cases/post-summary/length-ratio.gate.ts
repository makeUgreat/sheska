import { Guard } from '@core/guard';
import { type Gate, type GateResult } from '@kernels/application';
import { type PostSummaryDraft } from './generate-post-summary.prompt';

const CODE_BLOCK = /```[\s\S]*?```/g;
const EMBED = /!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)/g;
const WIKILINK = /\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;
const HEADING_LINE = /^#+ .*$/gm;
const WHITESPACE = /\s+/g;

export interface LengthRatioGateOptions {
  /** 요약 길이 ÷ 본문 산문 길이의 최대 백분율. 0~100 정수 */
  readonly maxPercent: number;
}

export class LengthRatioGate implements Gate<PostSummaryDraft> {
  readonly name = 'length-ratio';

  constructor(private readonly options: LengthRatioGateOptions) {
    if (!Guard.isPercent(options.maxPercent)) {
      throw new Error(`maxPercent must be an integer from 0 to 100: ${options.maxPercent}`);
    }
  }

  judge({ body, sentences }: PostSummaryDraft): GateResult {
    const summaryLength = sentences.reduce((total, sentence) => total + sentence.length, 0);
    const proseLength = toProseLength(body);

    return {
      passed: summaryLength * 100 <= this.options.maxPercent * proseLength,
      explanation: `요약 ${summaryLength}자 / 산문 ${proseLength}자 = ${Math.round((summaryLength * 100) / proseLength)}% (${this.options.maxPercent}% 이하여야 함)`,
    };
  }
}

function toProseLength(body: string): number {
  const prose = body
    .replace(CODE_BLOCK, '')
    .replace(EMBED, '')
    .replace(WIKILINK, '$1')
    .replace(LINK, '$1')
    .replace(HEADING_LINE, '')
    .replace(WHITESPACE, ' ')
    .trim();

  return prose.length;
}
