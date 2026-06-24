import { errAsync, okAsync } from '@core/result';
import { APPLICATION_ERROR_KIND } from '@kernels/application';
import {
  type SourceFingerprinter,
  type SourceFingerprinterError,
} from '@contexts/sources/application/ports';
import { describe, expect, it } from 'vitest';
import { SourceContentSnapshotCalculator } from '../source-content-snapshot-calculator.service';

class StubSourceFingerprinter implements SourceFingerprinter {
  readonly calls: string[] = [];
  fingerprint = 'fingerprint-1';
  error: SourceFingerprinterError | null = null;

  calculate(content: string) {
    this.calls.push(content);

    if (this.error) {
      return errAsync(this.error);
    }

    return okAsync(this.fingerprint);
  }
}

function fingerprinterUnavailableError(): SourceFingerprinterError {
  return {
    kind: APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
    code: 'source_fingerprinter.unavailable',
    message: 'Source fingerprinter is unavailable',
    details: {},
  };
}

describe('SourceContentSnapshotCalculator', () => {
  it('fingerprint 계산을 위임하고 UTF-8 byte size를 계산한다', async () => {
    const fingerprinter = new StubSourceFingerprinter();
    const calculator = new SourceContentSnapshotCalculator(fingerprinter);

    const result = await calculator.calculate('안녕');

    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      expect(result.value).toEqual({
        content: '안녕',
        fingerprint: 'fingerprint-1',
        size: 6,
      });
    }
    expect(fingerprinter.calls).toEqual(['안녕']);
  });

  it('fingerprint 계산 실패를 그대로 반환한다', async () => {
    const fingerprinter = new StubSourceFingerprinter();
    fingerprinter.error = fingerprinterUnavailableError();
    const calculator = new SourceContentSnapshotCalculator(fingerprinter);

    const result = await calculator.calculate('# Source note');

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error.code).toBe('source_fingerprinter.unavailable');
    }
  });
});
