import { AggregateRoot, newId } from '@kernels/domain';
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

export interface SyncContentSnapshotResult {
  source: Source;
  changed: boolean;
}

export class Source extends AggregateRoot<SourceProps> {
  static create(params: SourceCreateParams): Source {
    const { externalSourceId, content, fingerprint } = params;
    return new Source({
      id: newId(),
      props: {
        externalSourceId: ExternalSourceId.of(externalSourceId),
        contentSnapshot: SourceContentSnapshot.create({
          content,
          fingerprint,
        }),
      },
    });
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
  }): SyncContentSnapshotResult {
    const contentSnapshot = SourceContentSnapshot.create(params);

    if (this.props.contentSnapshot.hasSameContentAs(contentSnapshot)) {
      return { source: this, changed: false };
    }

    this.props.contentSnapshot = contentSnapshot;
    return { source: this, changed: true };
  }

  public validate(): void {}
}