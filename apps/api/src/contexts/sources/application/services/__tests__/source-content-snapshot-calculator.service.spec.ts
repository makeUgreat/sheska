import { type SourceFingerprinter } from '@contexts/sources/application/ports';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { SourceContentSnapshotCalculator } from '../source-content-snapshot-calculator.service';

type SourceFingerprinterMock = {
  calculate: MockedFunction<SourceFingerprinter['calculate']>;
};

describe('SourceContentSnapshotCalculator', () => {
  it('fingerprint 계산을 위임하고 source content snapshot 계산값을 반환한다', async () => {
    const fingerprinter = createSourceFingerprinterMock();
    const calculator = new SourceContentSnapshotCalculator(fingerprinter);

    const result = await calculator.calculate('안녕');

    expect(result).toEqual({
      content: '안녕',
      fingerprint: 'fingerprint-1',
    });
    expect(fingerprinter.calculate).toHaveBeenCalledWith('안녕');
  });

  it('fingerprint 계산 exception을 전파한다', async () => {
    const fingerprinterFailure = new Error(
      'Source fingerprinter is unavailable',
    );
    const fingerprinter = createSourceFingerprinterMock();
    fingerprinter.calculate.mockRejectedValue(fingerprinterFailure);
    const calculator = new SourceContentSnapshotCalculator(fingerprinter);

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
