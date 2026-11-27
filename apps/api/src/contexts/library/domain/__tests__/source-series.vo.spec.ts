import { describe, expect, it } from 'vitest';
import { type SourceFrontmatterProps } from '../source-frontmatter.vo';
import { SourceSeries } from '../source-series.vo';

describe('SourceSeries', () => {
  describe('parse', () => {
    it('이름과 순서가 있으면 앞뒤 공백을 지운 이름으로 시리즈를 만든다', () => {
      const series = SourceSeries.parse({ series: '  RAG 파이프라인  ', series_order: 2 });

      expect(series.unpack()).toEqual({ kind: 'member', name: 'RAG 파이프라인', order: 2 });
    });

    // nocap: library-source-9
    it.each<[string, SourceFrontmatterProps]>([
      ['두 키가 모두 없으면', { title: 'Retry' }],
      ['두 키의 값이 모두 비어 있으면', { series: null, series_order: null }],
    ])('%s 시리즈가 없다', (_label, frontmatter) => {
      expect(SourceSeries.parse(frontmatter).unpack()).toEqual({ kind: 'none' });
    });

    function expectRejected(frontmatter: SourceFrontmatterProps, key: 'series' | 'series_order') {
      expect(() => SourceSeries.parse(frontmatter)).toThrow(
        expect.objectContaining({
          kind: 'validation_failed',
          code: 'source.invalid_series',
          details: { fields: [{ path: `frontmatter.${key}`, messages: [expect.any(String)] }] },
        }),
      );
    }

    // nocap: library-source-9
    it.each<[string, SourceFrontmatterProps, 'series' | 'series_order']>([
      ['이름만 있으면 순서', { series: 'RAG' }, 'series_order'],
      ['순서만 있으면 이름', { series_order: 1 }, 'series'],
    ])('%s 키를 짚어 거부한다', (_label, frontmatter, key) => {
      expectRejected(frontmatter, key);
    });

    // nocap: library-source-10
    it.each<[string, SourceFrontmatterProps, 'series' | 'series_order']>([
      ['이름이 빈 문자열', { series: '', series_order: 1 }, 'series'],
      ['이름이 공백', { series: '   ', series_order: 1 }, 'series'],
      ['이름이 숫자', { series: 3, series_order: 1 }, 'series'],
      ['순서가 0', { series: 'RAG', series_order: 0 }, 'series_order'],
      ['순서가 음수', { series: 'RAG', series_order: -1 }, 'series_order'],
      ['순서가 소수', { series: 'RAG', series_order: 1.5 }, 'series_order'],
      ['순서가 문자열', { series: 'RAG', series_order: '2' }, 'series_order'],
    ])('%s이면 그 키를 짚어 거부한다', (_label, frontmatter, key) => {
      expectRejected(frontmatter, key);
    });
  });

  describe('of', () => {
    it.each([
      ['이름이 비어 있으면', { kind: 'member', name: '', order: 1 } as const],
      ['이름 앞뒤에 공백이 있으면', { kind: 'member', name: ' RAG ', order: 1 } as const],
      ['순서가 0이면', { kind: 'member', name: 'RAG', order: 0 } as const],
    ])('%s 불변식 위반으로 거부한다', (_label, props) => {
      expect(() => SourceSeries.of(props)).toThrow(expect.objectContaining({ kind: 'invariant_violation', code: 'source.invalid_series' }));
    });
  });
});
