import { type Gate } from '../../support/gate';

const UNRENDERED_SYNTAX = [
  { name: 'math', pattern: /\$[^\s$](?:[^$\n]*[^\s$])?\$/ },
  { name: 'bold', pattern: /\*\*/ },
  { name: 'wikilink', pattern: /\[\[/ },
  { name: 'link', pattern: /\]\(/ },
];

export const PLAIN_TEXT_GATE: Gate<readonly string[]> = {
  name: 'plain-text',
  judge(sentences) {
    const findings = sentences.flatMap((sentence, index) =>
      UNRENDERED_SYNTAX.filter(({ pattern }) => pattern.test(sentence)).map(({ name }) => `${index + 1}번 문장: ${name}`),
    );

    return { passed: findings.length === 0, explanation: findings.join(', ') };
  },
};
