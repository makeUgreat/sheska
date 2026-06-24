import { Result as ResultUtils, ok, type Result } from '@core/result';
import { AggregateRoot, newId, type EntityParams } from '@kernels/domain';
import { SourceContentSnapshotChangedDomainEvent } from './source-content-snapshot-changed.event';
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
  fingerprint: string;
  size: number;
}

interface SourceCreateParams {
  externalSourceId: string;
  content: string;
  fingerprint: string;
  size: number;
}

export class Source extends AggregateRoot<
  string,
  SourceProps,
  SourceContentSnapshotChangedDomainEvent
> {
  private constructor(params: EntityParams<string, SourceProps>) {
    super(params);
  }

  static create(params: SourceCreateParams): Result<Source, SourceDomainError> {
    const { externalSourceId, content, fingerprint, size } = params;

    return ResultUtils.combine([
      ExternalSourceId.of(externalSourceId),
      SourceContentSnapshot.of({
        content,
        fingerprint,
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
      }).map((source) => {
        source.addDomainEvent(
          new SourceContentSnapshotChangedDomainEvent({
            aggregateId: source.id,
            externalSourceId: source.props.externalSourceId.value,
            fingerprint: contentSnapshot.value.fingerprint,
          }),
        );

        return source;
      }),
    );
  }

  static restore(
    params: SourceRestoreParams,
  ): Result<Source, SourceDomainError> {
    const { id, externalSourceId, content, fingerprint, size } = params;

    return ResultUtils.combine([
      ExternalSourceId.of(externalSourceId),
      SourceContentSnapshot.of({
        content,
        fingerprint,
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
    fingerprint: string;
    size: number;
  }): Result<Source, SourceDomainError> {
    return SourceContentSnapshot.of(params).map((contentSnapshot) => {
      if (this.props.contentSnapshot.hasSameFingerprint(contentSnapshot)) {
        return this;
      }

      this.props.contentSnapshot = contentSnapshot;
      this.addDomainEvent(
        new SourceContentSnapshotChangedDomainEvent({
          aggregateId: this.id,
          externalSourceId: this.props.externalSourceId.value,
          fingerprint: contentSnapshot.value.fingerprint,
        }),
      );

      return this;
    });
  }
}
