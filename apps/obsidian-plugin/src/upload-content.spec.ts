import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { type ImageLink, prepareUploadContent } from '@/upload-content';

function prepared(content: string, filePath = 'notes/회의록.md') {
  const result = prepareUploadContent(content, filePath);
  if (!result.ok) throw new Error(result.reason);
  const [, frontmatter, body] =
    /^---\n([\s\S]*?)---\n([\s\S]*)$/.exec(result.content) ?? [];
  return {
    frontmatter: parse(frontmatter) as Record<string, unknown>,
    body,
  };
}

const MASKED = [
  '---',
  'sheska: true',
  'sheska-mask:',
  '  CertBear: A사',
  '  홍길동:',
  '---',
  '',
].join('\n');

describe('prepareUploadContent', () => {
  // nocap: library-sync-13
  it('replaces masked words regardless of case and inside longer words', () => {
    const { body } = prepared(
      `${MASKED}CertBear는 certbear와 CERTBEAR, CertBearAgent를 쓴다.\n`,
    );

    expect(body).toBe('A사는 A사와 A사, A사Agent를 쓴다.\n');
  });

  it('hides a word without a replacement behind a placeholder', () => {
    const { body } = prepared(`${MASKED}홍길동이 만들었다.\n`);

    expect(body).toBe('●●●이 만들었다.\n');
  });

  it('matches the longest word first when masked words overlap', () => {
    const { body } = prepared(
      [
        '---',
        'sheska: true',
        'sheska-mask:',
        '  Cert: C',
        '  CertBear: A사',
        '---',
        'Cert와 CertBear',
      ].join('\n'),
    );

    expect(body).toBe('C와 A사');
  });

  it('masks code blocks, link text and image paths in the body', () => {
    const { body } = prepared(
      [
        MASKED,
        '```ts',
        "const client = 'certbear';",
        '```',
        '[CertBear 문서](https://certbear.example.com)',
      ].join('\n'),
    );

    expect(body).not.toMatch(/certbear/i);
  });

  it('masks frontmatter values, keeps keys, and drops the mask list', () => {
    const { frontmatter } = prepared(
      [
        '---',
        'sheska: true',
        'title: CertBear 설계',
        'tags: [certbear, infra]',
        'sheska-mask:',
        '  CertBear: A사',
        '---',
        '',
      ].join('\n'),
    );

    expect(frontmatter).toEqual({
      sheska: true,
      title: 'A사 설계',
      tags: ['A사', 'infra'],
    });
  });

  // nocap: library-sync-14
  it.each([
    ['a list', 'sheska-mask: [CertBear]'],
    ['a string', 'sheska-mask: CertBear'],
    ['a number', 'sheska-mask: 3'],
  ])('rejects a mask list written as %s', (_kind, line) => {
    const result = prepareUploadContent(
      ['---', 'sheska: true', line, '---', 'CertBear'].join('\n'),
      'notes/a.md',
    );

    expect(result).toEqual({
      ok: false,
      reason: 'sheska-mask must be a mapping of word: replacement',
    });
  });

  it('leaves the body unchanged when there is no mask list', () => {
    const { body } = prepared('---\nsheska: true\n---\nCertBear 그대로\n');

    expect(body).toBe('CertBear 그대로\n');
  });

  // nocap: library-sync-15
  it('fills a missing title with the masked file name, not the folder path', () => {
    const { frontmatter } = prepared(
      `${MASKED}본문`,
      '20_Projects/주요 작업/CertBear 아키텍처.md',
    );

    expect(frontmatter.title).toBe('A사 아키텍처');
  });

  it.each([
    ['missing', '---\nsheska: true\n---\n'],
    ['empty', '---\nsheska: true\ntitle: "  "\n---\n'],
    ['not a string', '---\nsheska: true\ntitle: 3\n---\n'],
  ])('fills the title when it is %s', (_kind, content) => {
    expect(prepared(content, 'a/b/설계.md').frontmatter.title).toBe('설계');
  });

  it('keeps a title that is already set', () => {
    const { frontmatter } = prepared(
      '---\nsheska: true\ntitle: 직접 쓴 제목\n---\n',
      'a/설계.md',
    );

    expect(frontmatter.title).toBe('직접 쓴 제목');
  });
});

describe('prepareUploadContent image links', () => {
  const HASHED = 'attachments/9f2ccafe.svg';

  function body(content: string, imageLinks: ImageLink[]) {
    const result = prepareUploadContent(content, 'notes/a.md', imageLinks);
    if (!result.ok) throw new Error(result.reason);
    return result.content.slice(result.content.indexOf('---\n', 4) + 4);
  }

  // nocap: library-sync-12
  it.each([
    ['a markdown link', '![도식](20_Projects/주요%20작업/axis.svg)', '![도식]'],
    ['a wiki embed', '![[axis.svg]]', '![]'],
    ['a wiki embed with a width', '![[axis.svg|300]]', '![|300]'],
    ['a wiki embed with a size', '![[axis.svg|300x200]]', '![|300x200]'],
    ['a wiki embed with a caption', '![[axis.svg|도식]]', '![도식]'],
  ])('rewrites %s to the hashed name', (_kind, original, alt) => {
    expect(
      body(`---\nsheska: true\n---\n앞 ${original} 뒤\n`, [
        { original, target: HASHED },
      ]),
    ).toBe(`앞 ${alt}(${HASHED}) 뒤\n`);
  });

  it('removes every trace of the vault path', () => {
    const original = '![](20_Projects/주요%20작업/axis.svg)';

    const result = body(`---\nsheska: true\n---\n${original}\n${original}`, [
      { original, target: HASHED },
    ]);

    expect(result).toBe(`![](${HASHED})\n![](${HASHED})`);
  });

  it('keeps the hashed name intact when a masked word matches its characters', () => {
    const original = '![CertBear 도식](att/certbear.svg)';

    const result = body(
      [
        '---',
        'sheska: true',
        'sheska-mask:',
        '  cafe: X',
        '  CertBear: 제품 C',
        '---',
        `cafe ${original}`,
      ].join('\n'),
      [{ original, target: HASHED }],
    );

    expect(result).toBe(`X ![제품 C 도식](${HASHED})`);
  });
});
