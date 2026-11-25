import { type Gate } from '../../support/gate';

const MIN_HANGUL_RATIO = 0.3;
const CODE_SPAN = /`[^`]*`/g;
const HANGUL = /[가-힣]/g;
const LATIN = /[A-Za-z]/g;

export const KOREAN_GATE: Gate<readonly string[]> = {
  name: 'korean',
  judge(sentences) {
    const text = sentences.join(' ').replace(CODE_SPAN, '');
    const hangul = text.match(HANGUL)?.length ?? 0;
    const latin = text.match(LATIN)?.length ?? 0;
    const ratio = hangul + latin === 0 ? 1 : hangul / (hangul + latin);

    return { passed: ratio >= MIN_HANGUL_RATIO, explanation: `한글 비율 ${Math.round(ratio * 100)}%` };
  },
};
