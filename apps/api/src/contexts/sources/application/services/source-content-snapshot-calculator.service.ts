import { Inject, Injectable } from '@nestjs/common';
import {
  type SourceDocumentParser,
  type SourceFingerprinter,
} from '@contexts/sources/application/ports';
import { type SourceFrontmatter } from '@contexts/sources/domain';
import {
  SOURCE_DOCUMENT_PARSER,
  SOURCE_FINGERPRINTER,
} from '@contexts/sources/sources.di-tokens';
import {
  APPLICATION_ERROR_KIND,
  ApplicationException,
} from '@kernels/application';

export interface SourceContentSnapshotCalculation {
  readonly frontmatter: SourceFrontmatter;
  readonly title: string | null;
  readonly body: string;
  readonly fingerprint: string;
  readonly size: number;
}

@Injectable()
export class SourceContentSnapshotCalculator {
  constructor(
    @Inject(SOURCE_FINGERPRINTER)
    private readonly sourceFingerprinter: SourceFingerprinter,
    @Inject(SOURCE_DOCUMENT_PARSER)
    private readonly sourceDocumentParser: SourceDocumentParser,
  ) {}

  async calculate(content: string): Promise<SourceContentSnapshotCalculation> {
    const [fingerprint, parsed] = await Promise.all([
      this.sourceFingerprinter.calculate(content),
      Promise.resolve(this.sourceDocumentParser.parse(content)),
    ]);

    if (!parsed.success) {
      throw new ApplicationException({
        kind: APPLICATION_ERROR_KIND.VALIDATION_FAILED,
        code: 'sources.invalid_frontmatter',
        message: 'Source frontmatter is invalid',
        details: { reason: parsed.reason },
      });
    }

    return {
      ...parsed.document,
      fingerprint,
      size: new TextEncoder().encode(content).length,
    };
  }
}
