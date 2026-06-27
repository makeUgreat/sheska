import { type ResultAsync } from '@core/result';
import {
  type SourceFingerprinter,
  type SourceFingerprinterError,
} from '@contexts/sources/application/ports';

export interface SourceContentSnapshotCalculation {
  readonly content: string;
  readonly fingerprint: string;
}

export class SourceContentSnapshotCalculator {
  constructor(private readonly sourceFingerprinter: SourceFingerprinter) {}

  calculate(
    content: string,
  ): ResultAsync<SourceContentSnapshotCalculation, SourceFingerprinterError> {
    return this.sourceFingerprinter.calculate(content).map((fingerprint) => ({
      content,
      fingerprint,
    }));
  }
}
