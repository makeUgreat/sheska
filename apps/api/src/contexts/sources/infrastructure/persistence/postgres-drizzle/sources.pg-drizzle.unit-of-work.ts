import { Inject, Injectable } from '@nestjs/common';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type SourcesUnitOfWork,
  type SourcesUnitOfWorkResources,
} from '@contexts/sources/application/ports';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import * as schema from './schema';
import { SourcePgDrizzleRepository } from './source.pg-drizzle.repository';
import { SourceSyncJobPgDrizzleRepository } from './source-sync-job.pg-drizzle.repository';
import { OutboxPgDrizzleWriter } from './outbox.pg-drizzle.writer';

@Injectable()
export class SourcesPgDrizzleUnitOfWork implements SourcesUnitOfWork {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  execute<TResult>(
    work: (resources: SourcesUnitOfWorkResources) => Promise<TResult>,
  ): Promise<TResult> {
    return this.db.transaction((transaction) =>
      work({
        sources: new SourcePgDrizzleRepository(transaction),
        syncJobs: new SourceSyncJobPgDrizzleRepository(transaction),
        outbox: new OutboxPgDrizzleWriter(transaction),
      }),
    );
  }
}
