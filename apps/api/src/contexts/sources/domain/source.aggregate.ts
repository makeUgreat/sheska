import { AggregateRoot, newId } from '@kernels/domain';
import { SourceContentSnapshotChangedDomainEvent } from './source-content-snapshot-changed.event';
import { ExternalSourceId } from './external-source-id.vo';
import { SourceContentSnapshot } from './source-content-snapshot.vo';

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
  createdAt?: Date;
  updatedAt?: Date;
}

interface SourceCreateParams {
  externalSourceId: string;
  content: string;
  fingerprint: string;
}

export class Source extends AggregateRoot<
  SourceProps,
  SourceContentSnapshotChangedDomainEvent
> {
  static create(params: SourceCreateParams): Source {
    const { externalSourceId, content, fingerprint } = params;
    const source = new Source({
      id: newId(),
      props: {
        externalSourceId: ExternalSourceId.of(externalSourceId),
        contentSnapshot: SourceContentSnapshot.create({
          content,
          fingerprint,
        }),
      },
    });
    const contentSnapshotProps = source.props.contentSnapshot.unpack();

    source.addEvent(
      new SourceContentSnapshotChangedDomainEvent({
        aggregateId: source.id,
        externalSourceId: source.props.externalSourceId.unpack(),
        fingerprint: contentSnapshotProps.fingerprint,
      }),
    );

    return source;
  }

  static restore(params: SourceRestoreParams): Source {
    const {
      id,
      externalSourceId,
      content,
      fingerprint,
      size,
      createdAt,
      updatedAt,
    } = params;

    return new Source({
      id,
      props: {
        externalSourceId: ExternalSourceId.of(externalSourceId),
        contentSnapshot: SourceContentSnapshot.restore({
          content,
          fingerprint,
          size,
        }),
      },
      createdAt,
      updatedAt,
    });
  }

  syncContentSnapshot(params: {
    content: string;
    fingerprint: string;
  }): Source {
    const contentSnapshot = SourceContentSnapshot.create(params);

    if (this.props.contentSnapshot.hasSameContentAs(contentSnapshot)) {
      return this;
    }

    this.props.contentSnapshot = contentSnapshot;
    const contentSnapshotProps = contentSnapshot.unpack();
    this.addEvent(
      new SourceContentSnapshotChangedDomainEvent({
        aggregateId: this.id,
        externalSourceId: this.props.externalSourceId.unpack(),
        fingerprint: contentSnapshotProps.fingerprint,
      }),
    );

    return this;
  }

  public validate(): void {}
}
