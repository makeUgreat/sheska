import { Inject, Injectable } from '@nestjs/common';
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
import {
  APPLICATION_ERROR_KIND,
  ApplicationException,
} from '@kernels/application';

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
      throw new ApplicationException({
        kind: APPLICATION_ERROR_KIND.VALIDATION_FAILED,
        code: 'source.invalid_frontmatter',
        message: 'Source frontmatter is invalid',
        details: {
          fields: [
            {
              path: 'frontmatter',
              messages: [
                error instanceof Error ? error.message : 'Unknown error',
              ],
            },
          ],
        },
      });
    }

    return {
      ...parsed,
      fingerprint,
      size: new TextEncoder().encode(content).length,
    };
  }
}
