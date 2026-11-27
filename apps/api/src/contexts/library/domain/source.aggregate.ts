import { newId } from '@core/id';
import { AggregateRoot } from '@kernels/domain';
import { ExternalSourceId } from './external-source-id.vo';
import { SourceBody } from './source-body.vo';
import { SourceBodyChangedDomainEvent, type SourceDomainEvent } from './source.event';
import { SourceFrontmatter, type SourceFrontmatterProps } from './source-frontmatter.vo';
import { SourceProject, type SourceProjectProps } from './source-project.vo';
import { SourceSeries, type SourceSeriesProps } from './source-series.vo';
import { SourceSize } from './source-size.vo';
import { SourceSyncJob } from './source-sync-job.aggregate';

interface SourceProps {
  externalSourceId: ExternalSourceId;
  frontmatter: SourceFrontmatter;
  series: SourceSeries;
  project: SourceProject;
  body: SourceBody;
  size: SourceSize;
}

export class Source extends AggregateRoot<SourceProps, SourceDomainEvent> {
  static create(params: SourceCreateParams): Source {
    return new Source({
      id: newId(),
      props: {
        externalSourceId: ExternalSourceId.of(params.externalSourceId),
        frontmatter: params.frontmatter,
        series: params.series,
        project: params.project,
        body: SourceBody.of(params.body),
        size: SourceSize.of(params.size),
      },
    });
  }

  static restore(params: SourceRestoreParams): Source {
    const { id, externalSourceId, frontmatter, series, project, body, fingerprint, size, createdAt, updatedAt } = params;

    return new Source({
      id,
      props: {
        externalSourceId: ExternalSourceId.of(externalSourceId),
        frontmatter: SourceFrontmatter.of(frontmatter),
        series: SourceSeries.of(series),
        project: SourceProject.of(project),
        body: SourceBody.restore({ text: body, fingerprint }),
        size: SourceSize.of(size),
      },
      createdAt,
      updatedAt,
    });
  }

  syncContent(params: {
    frontmatter: SourceFrontmatter;
    series: SourceSeries;
    project: SourceProject;
    body: string;
    size: number;
  }): boolean {
    const body = SourceBody.of(params.body);
    const size = SourceSize.of(params.size);

    const bodyChanged = this.changeBody(body);
    const metadataChanged = this.changeMetadata(params.frontmatter, params.series, params.project, size);

    return bodyChanged || metadataChanged;
  }

  moveTo(externalSourceId: string): void {
    this.props.externalSourceId = ExternalSourceId.of(externalSourceId);
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

    return trimmedTitle.length > 0 ? trimmedTitle : this.props.externalSourceId.unpack();
  }

  public validate(): void {}

  private changeBody(body: SourceBody): boolean {
    if (this.props.body.hasSameTextAs(body)) return false;

    this.props.body = body;
    this.addEvent(new SourceBodyChangedDomainEvent({ aggregateId: this.id }));

    return true;
  }

  private changeMetadata(frontmatter: SourceFrontmatter, series: SourceSeries, project: SourceProject, size: SourceSize): boolean {
    const unchanged =
      this.props.frontmatter.equals(frontmatter) &&
      this.props.series.equals(series) &&
      this.props.project.equals(project) &&
      this.props.size.equals(size);
    if (unchanged) return false;

    this.props.frontmatter = frontmatter;
    this.props.series = series;
    this.props.project = project;
    this.props.size = size;

    return true;
  }
}

interface SourceRestoreParams {
  id: string;
  externalSourceId: string;
  frontmatter: SourceFrontmatterProps;
  series: SourceSeriesProps;
  project: SourceProjectProps;
  body: string;
  fingerprint: string;
  size: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SourceCreateParams {
  externalSourceId: string;
  frontmatter: SourceFrontmatter;
  series: SourceSeries;
  project: SourceProject;
  body: string;
  size: number;
}
