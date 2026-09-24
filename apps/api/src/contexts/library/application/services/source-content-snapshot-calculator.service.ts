import { Inject, Injectable } from '@nestjs/common';
import { InvalidDataError, ValidationFailedError } from '@core/errors';
import {
  type ParsedSourceDocument,
  type SourceDocumentParser,
  type SourceFingerprinter,
} from '@contexts/library/application/ports';
import { type SourceFrontmatterProps } from '@contexts/library/domain';
import {
  SOURCE_DOCUMENT_PARSER,
  SOURCE_FINGERPRINTER,
} from '@contexts/library/library.di-tokens';

export interface SourceContentSnapshotCalculation {
  readonly frontmatter: SourceFrontmatterProps;
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
    const fingerprint = await this.sourceFingerprinter.calculate(content);

    let parsed: ParsedSourceDocument;
    try {
      parsed = this.sourceDocumentParser.parse(content);
    } catch (error: unknown) {
      if (!(error instanceof InvalidDataError)) throw error;
      throw new ValidationFailedError({
        code: 'source.invalid_frontmatter',
        message: 'Source frontmatter is invalid',
        details: {
          fields: [{ path: 'frontmatter', messages: [error.message] }],
        },
        cause: error,
      });
    }

    return {
      ...parsed,
      fingerprint,
      size: new TextEncoder().encode(content).length,
    };
  }
}
