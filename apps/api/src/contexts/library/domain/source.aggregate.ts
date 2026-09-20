import { AggregateRoot, newId } from '@kernels/domain';
import { ExternalSourceId } from './external-source-id.vo';
import { SourceContentSnapshot } from './source-content-snapshot.vo';
import { type SourceFrontmatterProps } from './source-frontmatter.vo';

interface SourceProps {
  externalSourceId: ExternalSourceId;
  contentSnapshot: SourceContentSnapshot;
}

interface SourceRestoreParams {
  id: string;
  externalSourceId: string;
  frontmatter: SourceFrontmatterProps;
  title: string;
  body: string;
  fingerprint: string;
  size: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SourceCreateParams {
  externalSourceId: string;
  frontmatter: SourceFrontmatterProps;
  title: string | null;
  body: string;
  fingerprint: string;
  size: number;
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
        contentSnapshot: SourceContentSnapshot.create({
          ...snapshot,
          title: snapshot.title ?? sourceId.unpack(),
        }),
      },
    });
  }

  static restore(params: SourceRestoreParams): Source {
    const {
      id,
      externalSourceId,
      body,
      frontmatter,
      title,
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
          body,
          frontmatter,
          title,
          fingerprint,
          size,
        }),
      },
      createdAt,
      updatedAt,
    });
  }

  syncContentSnapshot(params: {
    frontmatter: SourceFrontmatterProps;
    title: string | null;
    body: string;
    fingerprint: string;
    size: number;
  }): SyncContentSnapshotResult {
    const contentSnapshot = SourceContentSnapshot.create({
      ...params,
      title: params.title ?? this.props.externalSourceId.unpack(),
    });

    if (this.props.contentSnapshot.hasSameContentAs(contentSnapshot)) {
      return { source: this, changed: false };
    }

    this.props.contentSnapshot = contentSnapshot;
    return { source: this, changed: true };
  }

  public validate(): void {}
}
