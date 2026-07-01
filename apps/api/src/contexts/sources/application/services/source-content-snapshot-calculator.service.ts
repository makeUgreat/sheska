import { Inject, Injectable } from '@nestjs/common';
import { type SourceFingerprinter } from '@contexts/sources/application/ports';
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

  async calculate(content: string): Promise<SourceContentSnapshotCalculation> {
    const fingerprint = await this.sourceFingerprinter.calculate(content);

    return {
      content,
      fingerprint,
    };
  }
}
