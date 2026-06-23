import { Result as ResultUtils, ok, type Result } from '@core/result';
import { AggregateRoot, newId, type EntityParams } from '@kernels/domain';
import { ExternalSourceId } from './external-source-id.vo';
import { SourceContentSnapshot } from './source-content-snapshot.vo';
import { type SourceDomainError } from './source.error';

interface SourceProps {
  externalSourceId: ExternalSourceId;
  contentSnapshot: SourceContentSnapshot;
}

interface SourceRestoreParams {
  id: string;
  externalSourceId: string;
  content: string;
  contentHash: string;
  size: number;
}

interface SourceCreateParams {
  externalSourceId: string;
  content: string;
  contentHash: string;
  size: number;
}

type SourceContentSyncStatus = 'updated' | 'skipped';

interface SourceContentSyncResult {
  source: Source;
  status: SourceContentSyncStatus;
}

export class Source extends AggregateRoot<string, SourceProps> {
  private constructor(params: EntityParams<string, SourceProps>) {
    super(params);
  }

  static create(params: SourceCreateParams): Result<Source, SourceDomainError> {
    const { externalSourceId, content, contentHash, size } = params;

    return ResultUtils.combine([
      ExternalSourceId.of(externalSourceId),
      SourceContentSnapshot.of({
        content,
        contentHash,
        size,
      }),
    ]).andThen(([externalSourceId, contentSnapshot]) =>
      Source.construct({
        params: {
          id: newId(),
          props: {
            externalSourceId,
            contentSnapshot,
          },
        },
        validate: (entityParams) => ok(entityParams),
      }),
    );
  }

  static restore(
    params: SourceRestoreParams,
  ): Result<Source, SourceDomainError> {
    const { id, externalSourceId, content, contentHash, size } = params;

    return ResultUtils.combine([
      ExternalSourceId.of(externalSourceId),
      SourceContentSnapshot.of({
        content,
        contentHash,
        size,
      }),
    ]).andThen(([externalSourceId, contentSnapshot]) =>
      Source.construct({
        params: {
          id,
          props: {
            externalSourceId,
            contentSnapshot,
          },
        },
        validate: (entityParams) => ok(entityParams),
      }),
    );
  }

  syncContentSnapshot(params: {
    content: string;
    contentHash: string;
    size: number;
  }): Result<SourceContentSyncResult, SourceDomainError> {
    return SourceContentSnapshot.of(params).map((contentSnapshot) => {
      if (this.props.contentSnapshot.hasSameContentHash(contentSnapshot)) {
        return {
          source: this,
          status: 'skipped',
        };
      }

      this.props.contentSnapshot = contentSnapshot;

      return {
        source: this,
        status: 'updated',
      };
    });
  }
}
