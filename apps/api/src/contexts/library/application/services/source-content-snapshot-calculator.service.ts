import { Inject, Injectable } from '@nestjs/common';
import { InvalidDataError, ValidationFailedError } from '@core/errors';
import {
  type ParsedSourceDocument,
  type SourceDocumentParser,
} from '@contexts/library/application/ports';
import { type SourceFrontmatterProps } from '@contexts/library/domain';
import { SOURCE_DOCUMENT_PARSER } from '@contexts/library/library.di-tokens';

export interface SourceContentSnapshotCalculation {
  readonly frontmatter: SourceFrontmatterProps;
  readonly body: string;
  readonly size: number;
}

@Injectable()
export class SourceContentSnapshotCalculator {
  constructor(
    @Inject(SOURCE_DOCUMENT_PARSER)
    private readonly sourceDocumentParser: SourceDocumentParser,
  ) {}

  calculate(content: string): SourceContentSnapshotCalculation {
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
      size: new TextEncoder().encode(content).length,
    };
  }
}
