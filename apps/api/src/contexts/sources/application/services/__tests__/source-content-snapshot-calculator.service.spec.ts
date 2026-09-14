import {
  type SourceDocumentParser,
  type SourceFingerprinter,
} from '@contexts/sources/application/ports';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { SourceContentSnapshotCalculator } from '../source-content-snapshot-calculator.service';

type SourceFingerprinterMock = {
  calculate: MockedFunction<SourceFingerprinter['calculate']>;
};

const parser: SourceDocumentParser = {
  parse: vi.fn().mockReturnValue({
    success: true,
    document: { body: '안녕', frontmatter: {}, title: null },
  }),
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
});

function createSourceFingerprinterMock(): SourceFingerprinterMock {
  return {
    calculate: vi
      .fn<SourceFingerprinter['calculate']>()
      .mockResolvedValue('fingerprint-1'),
  };
}
