import { type Gate, type GateResult } from '@kernels/application';
import { type PostSummaryDraft } from './generate-post-summary.prompt';

const UNRENDERED_SYNTAX = [
  { name: 'math', pattern: /\$[^\s$](?:[^$\n]*[^\s$])?\$/ },
  { name: 'bold', pattern: /\*\*/ },
  { name: 'wikilink', pattern: /\[\[/ },
  { name: 'link', pattern: /\]\(/ },
];

export class NoMarkupGate implements Gate<PostSummaryDraft> {
  readonly name = 'no-markup';

  judge({ sentences }: PostSummaryDraft): GateResult {
    const findings = sentences.flatMap((sentence, index) =>
      UNRENDERED_SYNTAX.filter(({ pattern }) => pattern.test(sentence)).map(({ name }) => `${index + 1}번 문장: ${name}`),
    );

    if (findings.length === 0) return { passed: true, explanation: '' };

    return { passed: false, explanation: `${findings.join(', ')} (마크다운, 위키링크, 수식 문법을 쓰면 안 됨)` };
  }
}
