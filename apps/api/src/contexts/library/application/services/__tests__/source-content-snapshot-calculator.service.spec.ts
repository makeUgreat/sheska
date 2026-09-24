import { InvalidDataError, ValidationFailedError } from '@core/errors';
import {
  type SourceDocumentParser,
  type SourceFingerprinter,
} from '@contexts/library/application/ports';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { SourceContentSnapshotCalculator } from '../source-content-snapshot-calculator.service';

type SourceFingerprinterMock = {
  calculate: MockedFunction<SourceFingerprinter['calculate']>;
};

const parser: SourceDocumentParser = {
  parse: vi
    .fn()
    .mockReturnValue({ body: '안녕', frontmatter: {}, title: null }),
};

describe('SourceContentSnapshotCalculator', () => {
  it('fingerprint 계산을 위임하고 source content snapshot 계산값을 반환한다', async () => {
    const fingerprinter = createSourceFingerprinterMock();
    const calculator = new SourceContentSnapshotCalculator(
      fingerprinter,
      parser,
    );

    const result = await calculator.calculate('안녕');

    expect(result).toEqual({
      body: '안녕',
      frontmatter: {},
      title: null,
      fingerprint: 'fingerprint-1',
      size: 6,
    });
    expect(fingerprinter.calculate).toHaveBeenCalledWith('안녕');
  });

  it('fingerprint 계산 exception을 전파한다', async () => {
    const fingerprinterFailure = new Error(
      'Source fingerprinter is unavailable',
    );
    const fingerprinter = createSourceFingerprinterMock();
    fingerprinter.calculate.mockRejectedValue(fingerprinterFailure);
    const calculator = new SourceContentSnapshotCalculator(
      fingerprinter,
      parser,
    );

    await expect(calculator.calculate('# Source note')).rejects.toBe(
      fingerprinterFailure,
    );
  });

  it('문서가 잘못된 parser 실패를 ValidationFailedError로 변환한다', async () => {
    const failingParser: SourceDocumentParser = {
      parse: vi.fn().mockImplementation(() => {
        throw new InvalidDataError({
          code: 'source_document.frontmatter_not_mapping',
          message: 'Frontmatter must be a YAML mapping',
          details: { fields: ['frontmatter'] },
        });
      }),
    };
    const fingerprinter = createSourceFingerprinterMock();
    const calculator = new SourceContentSnapshotCalculator(
      fingerprinter,
      failingParser,
    );

    await expect(calculator.calculate('# Source note')).rejects.toMatchObject({
      name: 'ValidationFailedError',
      code: 'source.invalid_frontmatter',
      details: {
        fields: [
          {
            path: 'frontmatter',
            messages: ['Frontmatter must be a YAML mapping'],
          },
        ],
      },
    });
    await expect(calculator.calculate('# Source note')).rejects.toBeInstanceOf(
      ValidationFailedError,
    );
  });

  it('문서 문제가 아닌 parser 실패는 변환하지 않고 전파한다', async () => {
    const parserBug = new TypeError('Cannot read properties of undefined');
    const brokenParser: SourceDocumentParser = {
      parse: vi.fn().mockImplementation(() => {
        throw parserBug;
      }),
    };
    const calculator = new SourceContentSnapshotCalculator(
      createSourceFingerprinterMock(),
      brokenParser,
    );

    await expect(calculator.calculate('# Source note')).rejects.toBe(parserBug);
  });
});

function createSourceFingerprinterMock(): SourceFingerprinterMock {
  return {
    calculate: vi
      .fn<SourceFingerprinter['calculate']>()
      .mockResolvedValue('fingerprint-1'),
  };
}
