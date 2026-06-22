import { err, ok, type Result } from '@core/result';
import {
  AggregateRoot,
  DOMAIN_ERROR_KIND,
  type DomainError,
  type EntityParams,
} from '@kernels/domain';
import { SourceDocumentMetadata } from './source-document-metadata';
import { SourceDocumentPath } from './source-document-path';

export type SourceDocumentId = string;

interface SourceDocumentProps {
  sourceId: string;
  path: SourceDocumentPath;
  body: string;
  contentHash: string;
  metadata: SourceDocumentMetadata;
}

type SourceDocumentRestoreProps = Omit<SourceDocumentProps, 'path'> & {
  path: string;
};

export class SourceDocument extends AggregateRoot<
  SourceDocumentId,
  SourceDocumentProps
> {
  static restore(
    params: EntityParams<SourceDocumentId, SourceDocumentRestoreProps>,
  ): Result<SourceDocument, DomainError> {
    const { id, props } = params;
    const { body, metadata, path, sourceId, contentHash } = props;

    return SourceDocumentPath.of(path).andThen((documentPath) =>
      super.construct({
        params: {
          id,
          props: {
            sourceId: sourceId.trim(),
            path: documentPath,
            contentHash: contentHash.trim(),
            body,
            metadata,
          },
        },
        validate: (entityParams) => SourceDocument.validateParams(entityParams),
        instantiate: (entityParams) => new SourceDocument(entityParams),
      }),
    );
  }

  private constructor(
    params: EntityParams<SourceDocumentId, SourceDocumentProps>,
  ) {
    super(params);
  }

  hasContentHash(contentHash: string): boolean {
    return this.props.contentHash === contentHash.trim();
  }

  isStoredAt(path: string): boolean {
    const otherPath = SourceDocumentPath.of(path);

    return otherPath.isOk() && this.props.path.equals(otherPath.value);
  }

  isPublishable(): boolean {
    return this.props.metadata.isMarkedForPublishing();
  }

  private static validateParams(
    params: EntityParams<SourceDocumentId, SourceDocumentProps>,
  ): Result<EntityParams<SourceDocumentId, SourceDocumentProps>, DomainError> {
    if (params.props.sourceId.length === 0) {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'source_document.source_id_empty',
        message: 'Source document source id cannot be empty',
        details: { fields: ['sourceId'] },
      });
    }

    if (params.props.contentHash.length === 0) {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'source_document.content_hash_empty',
        message: 'Source document content hash cannot be empty',
        details: { fields: ['contentHash'] },
      });
    }

    return ok(params);
  }
}
