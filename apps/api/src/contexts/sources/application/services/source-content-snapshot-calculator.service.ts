import { Inject, Injectable } from '@nestjs/common';
import { type ResultAsync } from '@core/result';
import {
  type SourceFingerprinter,
  type SourceFingerprinterFailure,
} from '@contexts/sources/application/ports';
import { SOURCE_FINGERPRINTER } from '@contexts/sources/sources.di-tokens';

export interface SourceContentSnapshotCalculation {
  readonly content: string;
  readonly fingerprint: string;
}

@Injectable()
export class SourceContentSnapshotCalculator {
  constructor(
    @Inject(SOURCE_FINGERPRINTER)
    private readonly sourceFingerprinter: SourceFingerprinter,
  ) {}

  calculate(
    content: string,
  ): ResultAsync<SourceContentSnapshotCalculation, SourceFingerprinterFailure> {
    return this.sourceFingerprinter.calculate(content).map((fingerprint) => ({
      content,
      fingerprint,
    }));
  }
}
