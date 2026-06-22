import { err, ok, type Result } from '@core/result';
import { DOMAIN_ERROR_KIND, type DomainError } from '@kernels/domain';

interface SourceDocumentMetadataState {
  title: string;
  publish: boolean;
}

export class SourceDocumentMetadata {
  private readonly state: Readonly<SourceDocumentMetadataState>;

  static fromFrontmatter(
    frontmatter: Record<string, unknown> = {},
  ): Result<SourceDocumentMetadata, DomainError> {
    const standardFieldsResult =
      SourceDocumentMetadata.normalizeStandardFields(frontmatter);

    if (standardFieldsResult.isErr()) {
      return err(standardFieldsResult.error);
    }

    return SourceDocumentMetadata.validateState(standardFieldsResult.value).map(
      (state) => new SourceDocumentMetadata(state),
    );
  }

  private constructor(state: SourceDocumentMetadataState) {
    this.state = Object.freeze(state);
  }

  isMarkedForPublishing(): boolean {
    return this.state.publish;
  }

  hasTitle(title: string): boolean {
    return this.state.title === title.trim();
  }

  private static normalizeStandardFields(
    frontmatter: Record<string, unknown>,
  ): Result<SourceDocumentMetadataState, DomainError> {
    const title = SourceDocumentMetadata.normalizeString(
      frontmatter.title,
      'title',
    );
    const publish = SourceDocumentMetadata.optionalBoolean(frontmatter.publish);

    if (title.isErr()) {
      return err(title.error);
    }

    if (publish.isErr()) {
      return err(publish.error);
    }

    return ok({
      title: title.value,
      publish: publish.value,
    });
  }

  private static validateState(
    state: SourceDocumentMetadataState,
  ): Result<SourceDocumentMetadataState, DomainError> {
    const missingPublishFields: string[] = [];

    if (state.publish && state.title.length === 0) {
      missingPublishFields.push('title');
    }

    if (missingPublishFields.length > 0) {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'source_document.publish_metadata_incomplete',
        message: 'Publishable source documents require title',
        details: { fields: missingPublishFields },
      });
    }

    return ok(state);
  }

  private static normalizeString(
    value: unknown,
    field: string,
  ): Result<string, DomainError> {
    if (value === undefined || value === null) {
      return ok('');
    }

    if (typeof value !== 'string') {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'source_document.metadata_field_invalid',
        message: 'Source document metadata field must be a string',
        details: { fields: [field] },
      });
    }

    return ok(value.trim());
  }

  private static optionalBoolean(value: unknown): Result<boolean, DomainError> {
    if (value === undefined || value === null) {
      return ok(false);
    }

    if (typeof value !== 'boolean') {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'source_document.metadata_field_invalid',
        message: 'Source document publish metadata must be a boolean',
        details: { fields: ['publish'] },
      });
    }

    return ok(value);
  }
}
