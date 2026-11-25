import { Guard } from '@core/guard';
import { type Gate, type GateResult } from '@kernels/application';
import { type PostSummaryDraft } from './generate-post-summary.prompt';

const CODE_SPAN = /`[^`]*`/g;
const HANGUL = /[가-힣]/g;
const LATIN = /[A-Za-z]/g;

export interface HangulRatioGateOptions {
  /** 백틱 밖의 한글과 라틴 문자 중 한글이 차지해야 하는 최소 백분율. 0~100 정수 */
  readonly minPercent: number;
}

export class HangulRatioGate implements Gate<PostSummaryDraft> {
  readonly name = 'hangul-ratio';

  constructor(private readonly options: HangulRatioGateOptions) {
    if (!Guard.isPercent(options.minPercent)) {
      throw new Error(`minPercent must be an integer from 0 to 100: ${options.minPercent}`);
    }
  }

  judge({ sentences }: PostSummaryDraft): GateResult {
    const text = sentences.join(' ').replace(CODE_SPAN, '');
    const hangul = text.match(HANGUL)?.length ?? 0;
    const latin = text.match(LATIN)?.length ?? 0;
    const letters = hangul + latin;
    if (letters === 0) return { passed: true, explanation: '한글 비율 100%' };

    return {
      passed: hangul * 100 >= this.options.minPercent * letters,
      explanation: `한글 비율 ${Math.round((hangul * 100) / letters)}%`,
    };
  }
}
