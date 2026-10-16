import { AggregateRoot, newId } from '@kernels/domain';
import { ExternalSourceId } from './external-source-id.vo';
import {
  type RawSourceContentSnapshot,
  SourceContentSnapshot,
} from './source-content-snapshot.vo';

interface SourceProps {
  externalSourceId: ExternalSourceId;
  contentSnapshot: SourceContentSnapshot;
}

type ReceivedSnapshot = Omit<RawSourceContentSnapshot, 'title'> & {
  title: string | null;
};

interface SourceRestoreParams extends RawSourceContentSnapshot {
  id: string;
  externalSourceId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SourceCreateParams extends ReceivedSnapshot {
  externalSourceId: string;
}

export interface SyncContentSnapshotResult {
  source: Source;
  changed: boolean;
}

export class Source extends AggregateRoot<SourceProps> {
  static create(params: SourceCreateParams): Source {
    const { externalSourceId, ...snapshot } = params;
    const sourceId = ExternalSourceId.of(externalSourceId);
    return new Source({
      id: newId(),
      props: {
        externalSourceId: sourceId,
        contentSnapshot: SourceContentSnapshot.of({
          ...snapshot,
          title: snapshot.title ?? sourceId.unpack(),
        }),
      },
    });
  }

  static restore(params: SourceRestoreParams): Source {
    const { id, externalSourceId, createdAt, updatedAt, ...snapshot } = params;

    return new Source({
      id,
      props: {
        externalSourceId: ExternalSourceId.of(externalSourceId),
        contentSnapshot: SourceContentSnapshot.of(snapshot),
      },
      createdAt,
      updatedAt,
    });
  }

  syncContentSnapshot(params: ReceivedSnapshot): SyncContentSnapshotResult {
    const contentSnapshot = SourceContentSnapshot.of({
      ...params,
      title: params.title ?? this.props.externalSourceId.unpack(),
    });

    if (this.props.contentSnapshot.equals(contentSnapshot)) {
      return { source: this, changed: false };
    }

    this.props.contentSnapshot = contentSnapshot;
    return { source: this, changed: true };
  }

  public validate(): void {}
}
