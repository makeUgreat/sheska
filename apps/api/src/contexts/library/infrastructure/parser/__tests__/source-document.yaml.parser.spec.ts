import { describe, expect, it } from 'vitest';
import { SourceDocumentYamlParser } from '../source-document.yaml.parser';

describe('SourceDocumentYamlParser', () => {
  const parser = new SourceDocumentYamlParser();

  it('frontmatter 전체와 본문을 분리하고 frontmatter 값은 바꾸지 않는다', () => {
    const result = parser.parse(`---
title: " Retry Amplification "
aliases:
  - Nested Retries
custom:
  published: false
---
# Body`);

    expect(result).toEqual({
      body: '# Body',
      frontmatter: {
        title: ' Retry Amplification ',
        aliases: ['Nested Retries'],
        custom: { published: false },
      },
    });
  });

  it('frontmatter가 없으면 전체 내용을 본문으로 사용한다', () => {
    expect(parser.parse('# Body')).toEqual({
      body: '# Body',
      frontmatter: {},
    });
  });

  it('library.source-5: 비어 있는 frontmatter는 빈 metadata로 읽는다', () => {
    expect(parser.parse('---\n---\n# Body')).toEqual({
      body: '# Body',
      frontmatter: {},
    });
  });

  it('library.source-5: BOM으로 시작해도 frontmatter를 떼어낸다', () => {
    expect(parser.parse('\uFEFF---\ntitle: Retry\n---\n# Body')).toEqual({
      body: '# Body',
      frontmatter: { title: 'Retry' },
    });
  });

  it('CRLF 줄바꿈도 같은 구분선으로 읽는다', () => {
    expect(parser.parse('---\r\ntitle: Retry\r\n---\r\n# Body')).toEqual({
      body: '# Body',
      frontmatter: { title: 'Retry' },
    });
  });

  it('library.source-5: 구분선 뒤 공백은 구분선으로 인정한다', () => {
    expect(parser.parse('---\ntitle: Retry\n--- \n# Body').body).toBe('# Body');
  });

  it('library.source-4: 대시가 더 긴 줄은 닫는 구분선으로 보지 않는다', () => {
    expect(() => parser.parse('---\ntitle: Retry\n----\n# Body')).toThrow(
      expect.objectContaining({
        code: 'source_document.unclosed_frontmatter',
      }),
    );
  });

  it('library.source-4: frontmatter가 mapping이 아니면 예외를 던진다', () => {
    expect(() => parser.parse('---\n- Retry\n---\n# Body')).toThrow(
      expect.objectContaining({
        code: 'source_document.frontmatter_not_mapping',
      }),
    );
  });

  it('library.source-4: 유효하지 않은 YAML이면 틀린 위치를 message에 담는다', () => {
    const parseInvalidYaml = () => parser.parse('---\ntitle: [\n---\nBody');

    expect(parseInvalidYaml).toThrow(
      expect.objectContaining({ code: 'source_document.invalid_yaml' }),
    );
    expect(parseInvalidYaml).toThrow(/at line \d+, column \d+/);
  });
});
