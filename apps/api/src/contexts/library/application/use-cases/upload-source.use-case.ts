import { Inject, Injectable } from '@nestjs/common';
import { InvalidDataError, ValidationFailedError } from '@core/errors';
import {
  ExternalSourceId,
  Source,
  SourceFrontmatter,
  SourceProject,
  SourceSeries,
  type SourceSyncJob,
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/library/domain';
import { type LibraryUnitOfWork, type ParsedSourceDocument, type SourceDocumentParser } from '@contexts/library/application/ports';
import { SourceSyncJobCreatedIntegrationEvent } from '@contexts/library/application/events/source-sync-job-created.integration-event';
import { SourceBodyChangedEvent } from '@contexts/library/application/events/source-body-changed.outbox-message';
import {
  SOURCE_DOCUMENT_PARSER,
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
  LIBRARY_UNIT_OF_WORK,
} from '@contexts/library/library.di-tokens';

export interface UploadSourceCommand {
  readonly externalSourceId: string;
  readonly content: string;
}

export interface UploadSourceResult {
  readonly sourceId: string;
  readonly externalSourceId: string;
  readonly fingerprint: string;
  readonly syncJobId?: string;
}

@Injectable()
export class UploadSourceUseCase {
  constructor(
    @Inject(SOURCE_DOCUMENT_PARSER)
    private readonly documentParser: SourceDocumentParser,
    @Inject(SOURCE_REPOSITORY)
    private readonly sources: SourceRepository,
    @Inject(SOURCE_SYNC_JOB_REPOSITORY)
    private readonly syncJobs: SourceSyncJobRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly unitOfWork: LibraryUnitOfWork,
  ) {}

  async execute(command: UploadSourceCommand): Promise<UploadSourceResult> {
    const externalSourceId = ExternalSourceId.of(command.externalSourceId).unpack();
    const document = this.parseDocument(command.content);
    const content: UploadContent = {
      body: document.body,
      frontmatter: SourceFrontmatter.parse(document.frontmatter),
      series: SourceSeries.parse(document.frontmatter),
      project: SourceProject.parse(document.frontmatter),
      size: new TextEncoder().encode(command.content).length,
    };

    const existingSource = await this.sources.find({ externalSourceId });
    const changes = existingSource ? await this.syncSource(existingSource, content) : this.createSource(externalSourceId, content);

    await this.persist(changes);
    return this.toResult(changes);
  }

  // WHY: parser 오류를 그대로 두면 500이 된다. 사용자가 올린 파일이 틀린 것이므로 400으로 바꾼다.
  private parseDocument(content: string): ParsedSourceDocument {
    try {
      return this.documentParser.parse(content);
    } catch (error: unknown) {
      if (!(error instanceof InvalidDataError)) throw error;
      throw new ValidationFailedError({
        code: 'source.invalid_frontmatter',
        message: 'Source frontmatter is invalid',
        details: {
          fields: [{ path: 'frontmatter', messages: [error.message] }],
        },
        cause: error,
      });
    }
  }

  private createSource(externalSourceId: string, content: UploadContent): UploadChanges {
    const source = Source.create({ externalSourceId, ...content });

    return {
      source,
      sourceWrite: 'insert',
      syncJob: source.syncJobFor(null),
      isNewSyncJob: true,
    };
  }

  private async syncSource(source: Source, content: UploadContent): Promise<UploadChanges> {
    const sourceChanged = source.syncContent(content);
    const latestSyncJob = await this.syncJobs.findLatest({
      sourceId: source.id,
    });

    const syncJob = source.syncJobFor(latestSyncJob);

    return {
      source,
      sourceWrite: sourceChanged ? 'update' : null,
      syncJob,
      isNewSyncJob: syncJob !== latestSyncJob,
    };
  }

  private async persist({ source, sourceWrite, syncJob, isNewSyncJob }: UploadChanges): Promise<void> {
    if (sourceWrite === null && !isNewSyncJob) return;

    await this.unitOfWork.execute(async (resources) => {
      if (sourceWrite === 'insert') await resources.sources.insert(source);
      if (sourceWrite === 'update') await resources.sources.update(source);
      for (const message of this.toSourceBodyChangedEvents(source)) {
        await resources.outbox.append(message);
      }

      if (isNewSyncJob) {
        await resources.syncJobs.insert(syncJob);
        for (const integrationEvent of this.toIntegrationEvents(syncJob)) {
          await resources.outbox.append(integrationEvent);
        }
      }
    });

    source.clearDomainEvents();
    if (isNewSyncJob) syncJob.clearDomainEvents();
  }

  private toResult({ source, syncJob }: UploadChanges): UploadSourceResult {
    const { externalSourceId, body } = source.getProps();

    return {
      sourceId: source.id,
      externalSourceId: externalSourceId.unpack(),
      fingerprint: body.unpack().fingerprint.unpack(),
      syncJobId: syncJob.isWaiting() ? syncJob.id : undefined,
    };
  }

  private toSourceBodyChangedEvents(source: Source): SourceBodyChangedEvent[] {
    return source.domainEvents.map(
      (event) =>
        new SourceBodyChangedEvent({
          occurredAt: event.occurredAt,
          sourceId: event.aggregateId,
        }),
    );
  }

  private toIntegrationEvents(syncJob: SourceSyncJob): SourceSyncJobCreatedIntegrationEvent[] {
    return syncJob.domainEvents.map(
      (event) =>
        new SourceSyncJobCreatedIntegrationEvent({
          occurredAt: event.occurredAt,
          sourceId: event.sourceId,
          syncJobId: event.aggregateId,
          content: event.content,
        }),
    );
  }
}

interface UploadContent {
  readonly body: string;
  readonly frontmatter: SourceFrontmatter;
  readonly series: SourceSeries;
  readonly project: SourceProject;
  readonly size: number;
}

interface UploadChanges {
  source: Source;
  sourceWrite: 'insert' | 'update' | null;
  syncJob: SourceSyncJob;
  isNewSyncJob: boolean;
}
