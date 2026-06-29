import { type ResultAsync } from '@core/result';
import {
  type SourceFingerprinter,
  type SourceFingerprinterFailure,
} from '@contexts/sources/application/ports';

export interface SourceContentSnapshotCalculation {
  readonly content: string;
  readonly fingerprint: string;
}

export class SourceContentSnapshotCalculator {
  constructor(private readonly sourceFingerprinter: SourceFingerprinter) {}

  calculate(
    content: string,
  ): ResultAsync<SourceContentSnapshotCalculation, SourceFingerprinterFailure> {
    return this.sourceFingerprinter.calculate(content).map((fingerprint) => ({
      content,
      fingerprint,
    }));
  }
}
