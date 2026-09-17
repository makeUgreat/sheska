import { Inject, Injectable } from '@nestjs/common';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type IngestionUnitOfWork,
  type IngestionUnitOfWorkResources,
} from '@contexts/ingestion/application/ports';
import { DATABASE_TOKENS, PgDrizzleOutboxStore } from '@kernels/infrastructure';
import * as schema from './schema';
import { SourceEmbeddingPgDrizzleRepository } from './source-embedding.pg-drizzle.repository';

@Injectable()
export class IngestionPgDrizzleUnitOfWork implements IngestionUnitOfWork {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  execute<TResult>(
    work: (resources: IngestionUnitOfWorkResources) => Promise<TResult>,
  ): Promise<TResult> {
    return this.db.transaction((transaction) =>
      work({
        sourceEmbeddings: new SourceEmbeddingPgDrizzleRepository(transaction),
        outbox: new PgDrizzleOutboxStore(transaction),
      }),
    );
  }
}
