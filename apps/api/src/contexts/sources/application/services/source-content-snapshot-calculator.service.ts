import { type ResultAsync } from '@core/result';
import {
  type SourceFingerprinter,
  type SourceFingerprinterError,
} from '@contexts/sources/application/ports';

export interface SourceContentSnapshotCalculation {
  readonly content: string;
  readonly fingerprint: string;
  readonly size: number;
}

export class SourceContentSnapshotCalculator {
  private readonly textEncoder = new TextEncoder();

  constructor(private readonly sourceFingerprinter: SourceFingerprinter) {}

  calculate(
    content: string,
  ): ResultAsync<SourceContentSnapshotCalculation, SourceFingerprinterError> {
    return this.sourceFingerprinter.calculate(content).map((fingerprint) => ({
      content,
      fingerprint,
      size: this.calculateByteSize(content),
    }));
  }

  private calculateByteSize(content: string): number {
    return this.textEncoder.encode(content).length;
  }
}
