import { InvariantViolationError } from '@core/errors';
import { newId } from '@core/id';
import { AggregateRoot } from '@kernels/domain';
import { ExternalSourceId } from './external-source-id.vo';
import { SourceBody } from './source-body.vo';
import {
  SourceFrontmatter,
  type SourceFrontmatterProps,
} from './source-frontmatter.vo';
import { SourceSize } from './source-size.vo';
import { SourceSyncJob } from './source-sync-job.aggregate';

interface SourceProps {
  externalSourceId: ExternalSourceId;
  frontmatter: SourceFrontmatter;
  body: SourceBody;
  size: SourceSize;
}

export class Source extends AggregateRoot<SourceProps> {
  static create(params: SourceCreateParams): Source {
    const frontmatter = SourceFrontmatter.of(params.frontmatter);
    Source.ensureSyncTarget(frontmatter);

    return new Source({
      id: newId(),
      props: {
        externalSourceId: ExternalSourceId.of(params.externalSourceId),
        frontmatter,
        body: SourceBody.of(params.body),
        size: SourceSize.of(params.size),
      },
    });
  }

  static restore(params: SourceRestoreParams): Source {
    const {
      id,
      externalSourceId,
      frontmatter,
      body,
      fingerprint,
      size,
      createdAt,
      updatedAt,
    } = params;

    return new Source({
      id,
      props: {
        externalSourceId: ExternalSourceId.of(externalSourceId),
        frontmatter: SourceFrontmatter.of(frontmatter),
        body: SourceBody.restore({ text: body, fingerprint }),
        size: SourceSize.of(size),
      },
      createdAt,
      updatedAt,
    });
  }

  syncContent(params: {
    frontmatter: SourceFrontmatterProps;
    body: string;
    size: number;
  }): boolean {
    const frontmatter = SourceFrontmatter.of(params.frontmatter);
    Source.ensureSyncTarget(frontmatter);
    const body = SourceBody.of(params.body);
    const size = SourceSize.of(params.size);

    const changed =
      !this.props.body.hasSameTextAs(body) ||
      !this.props.frontmatter.equals(frontmatter) ||
      !this.props.size.equals(size);
    if (!changed) return false;

    this.props.frontmatter = frontmatter;
    this.props.body = body;
    this.props.size = size;
    return true;
  }

  syncJobFor(latestSyncJob: SourceSyncJob | null): SourceSyncJob {
    const { text, fingerprint } = this.props.body.unpack();
    if (latestSyncJob?.isWaitingOrCompletedFor(fingerprint)) {
      return latestSyncJob;
    }

    return SourceSyncJob.create({
      sourceId: this.id,
      content: text,
      fingerprint,
    });
  }

  title(): string {
    const { title } = this.props.frontmatter.unpack();
    const trimmedTitle = typeof title === 'string' ? title.trim() : '';

    return trimmedTitle.length > 0
      ? trimmedTitle
      : this.props.externalSourceId.unpack();
  }

  public validate(): void {}

  private static ensureSyncTarget(frontmatter: SourceFrontmatter): void {
    if (frontmatter.isSyncTarget()) return;

    throw new InvariantViolationError({
      code: 'source.not_sync_target',
      message: 'Source frontmatter must have `sheska: true`',
      details: { fields: ['frontmatter.sheska'] },
    });
  }
}

interface SourceRestoreParams {
  id: string;
  externalSourceId: string;
  frontmatter: SourceFrontmatterProps;
  body: string;
  fingerprint: string;
  size: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SourceCreateParams {
  externalSourceId: string;
  frontmatter: SourceFrontmatterProps;
  body: string;
  size: number;
}
