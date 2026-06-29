import { errAsync, okAsync } from '@core/result';
import { APPLICATION_FAILURE_KIND } from '@kernels/application';
import {
  type SourceFingerprinter,
  type SourceFingerprinterFailure,
} from '@contexts/sources/application/ports';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { SourceContentSnapshotCalculator } from '../source-content-snapshot-calculator.service';

type SourceFingerprinterMock = {
  calculate: MockedFunction<SourceFingerprinter['calculate']>;
};

function fingerprinterUnavailableFailure(): SourceFingerprinterFailure {
  return {
    kind: APPLICATION_FAILURE_KIND.DEPENDENCY_UNAVAILABLE,
    code: 'source_fingerprinter.unavailable',
    message: 'Source fingerprinter is unavailable',
    details: {},
  };
}

describe('SourceContentSnapshotCalculator', () => {
  it('fingerprint 계산을 위임하고 source content snapshot 계산값을 반환한다', async () => {
    const fingerprinter = createSourceFingerprinterMock();
    const calculator = new SourceContentSnapshotCalculator(fingerprinter);

    const result = await calculator.calculate('안녕');

    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      expect(result.value).toEqual({
        content: '안녕',
        fingerprint: 'fingerprint-1',
      });
    }
    expect(fingerprinter.calculate).toHaveBeenCalledWith('안녕');
  });

  it('fingerprint 계산 실패를 그대로 반환한다', async () => {
    const fingerprinterFailure = fingerprinterUnavailableFailure();
    const fingerprinter = createSourceFingerprinterMock();
    fingerprinter.calculate.mockReturnValue(errAsync(fingerprinterFailure));
    const calculator = new SourceContentSnapshotCalculator(fingerprinter);

    const result = await calculator.calculate('# Source note');

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toBe(fingerprinterFailure);
    }
  });
});

function createSourceFingerprinterMock(): SourceFingerprinterMock {
  return {
    calculate: vi
      .fn<SourceFingerprinter['calculate']>()
      .mockReturnValue(okAsync('fingerprint-1')),
  };
}
