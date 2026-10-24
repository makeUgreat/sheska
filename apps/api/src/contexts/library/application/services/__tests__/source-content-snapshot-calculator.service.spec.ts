import { InvalidDataError, ValidationFailedError } from '@core/errors';
import { type SourceDocumentParser } from '@contexts/library/application/ports';
import { describe, expect, it, vi } from 'vitest';
import { SourceContentSnapshotCalculator } from '../source-content-snapshot-calculator.service';

const parser: SourceDocumentParser = {
  parse: vi
    .fn()
    .mockReturnValue({ body: '안녕', frontmatter: {}, title: null }),
};

describe('SourceContentSnapshotCalculator', () => {
  it('파싱 결과와 파일 전체의 바이트 크기를 반환한다', () => {
    const calculator = new SourceContentSnapshotCalculator(parser);

    const result = calculator.calculate('안녕');

    expect(result).toEqual({
      body: '안녕',
      frontmatter: {},
      title: null,
      size: 6,
    });
  });

  it('library.source-4: 문서가 잘못된 parser 실패를 ValidationFailedError로 변환한다', () => {
    const failingParser: SourceDocumentParser = {
      parse: vi.fn().mockImplementation(() => {
        throw new InvalidDataError({
          code: 'source_document.frontmatter_not_mapping',
          message: 'Frontmatter must be a YAML mapping',
          details: { fields: ['frontmatter'] },
        });
      }),
    };
    const calculator = new SourceContentSnapshotCalculator(failingParser);

    expect(() => calculator.calculate('# Source note')).toThrow(
      ValidationFailedError,
    );
    expect(() => calculator.calculate('# Source note')).toThrow(
      expect.objectContaining({
        code: 'source.invalid_frontmatter',
        details: {
          fields: [
            {
              path: 'frontmatter',
              messages: ['Frontmatter must be a YAML mapping'],
            },
          ],
        },
      }),
    );
  });

  it('문서 문제가 아닌 parser 실패는 변환하지 않고 전파한다', () => {
    const parserBug = new TypeError('Cannot read properties of undefined');
    const brokenParser: SourceDocumentParser = {
      parse: vi.fn().mockImplementation(() => {
        throw parserBug;
      }),
    };
    const calculator = new SourceContentSnapshotCalculator(brokenParser);

    expect(() => calculator.calculate('# Source note')).toThrow(parserBug);
  });
});
