import { Inject, Injectable } from '@nestjs/common';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type LibraryUnitOfWork,
  type LibraryUnitOfWorkResources,
} from '@contexts/library/application/ports';
import { DATABASE_TOKENS, PgDrizzleOutboxStore } from '@kernels/infrastructure';
import * as schema from './schema';
import { SourcePgDrizzleRepository } from './source.pg-drizzle.repository';
import { SourceSyncJobPgDrizzleRepository } from './source-sync-job.pg-drizzle.repository';

@Injectable()
export class LibraryPgDrizzleUnitOfWork implements LibraryUnitOfWork {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  execute<TResult>(
    work: (resources: LibraryUnitOfWorkResources) => Promise<TResult>,
  ): Promise<TResult> {
    return this.db.transaction((transaction) =>
      work({
        sources: new SourcePgDrizzleRepository(transaction),
        syncJobs: new SourceSyncJobPgDrizzleRepository(transaction),
        outbox: new PgDrizzleOutboxStore(transaction),
      }),
    );
  }
}
