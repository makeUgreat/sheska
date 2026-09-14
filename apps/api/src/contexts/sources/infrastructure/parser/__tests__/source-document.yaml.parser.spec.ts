import { describe, expect, it } from 'vitest';
import { SourceDocumentYamlParser } from '../source-document.yaml.parser';

describe('SourceDocumentYamlParser', () => {
  const parser = new SourceDocumentYamlParser();

  it('frontmatter 전체와 본문을 분리하고 title을 정규화한다', () => {
    const result = parser.parse(`---
title: " Retry Amplification "
aliases:
  - Nested Retries
custom:
  published: false
---
# Body`);

    expect(result).toEqual({
      success: true,
      document: {
        body: '# Body',
        frontmatter: {
          title: ' Retry Amplification ',
          aliases: ['Nested Retries'],
          custom: { published: false },
        },
        title: 'Retry Amplification',
      },
    });
  });

  it('frontmatter가 없으면 전체 내용을 본문으로 사용한다', () => {
    expect(parser.parse('# Body')).toEqual({
      success: true,
      document: { body: '# Body', frontmatter: {}, title: null },
    });
  });

  it('유효하지 않은 YAML이면 실패 결과를 반환한다', () => {
    const result = parser.parse('---\ntitle: [\n---\nBody');

    expect(result.success).toBe(false);
  });
});
