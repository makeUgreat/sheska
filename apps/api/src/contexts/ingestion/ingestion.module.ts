import { Module, type DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { IngestSourceHandler } from '@contexts/ingestion/application/event-handlers/ingest-source.handler';
import {
  EmbedResultConsumer,
  EMBED_RESULTS_QUEUE,
} from '@contexts/ingestion/application/queue-handlers/embed-result.consumer';
import {
  EmbedJobBullMqDispatcher,
  EMBED_JOBS_QUEUE,
} from '@contexts/ingestion/infrastructure/queue/bullmq/embed-job.bullmq.dispatcher';
import { SourceVectorPgDrizzleRepository } from '@contexts/ingestion/infrastructure/persistence/postgres-drizzle/source-vector.pg-drizzle.repository';
import * as ingestionSchema from '@contexts/ingestion/infrastructure/persistence/postgres-drizzle/schema';
import {
  EMBED_JOB_DISPATCHER,
  SOURCE_VECTOR_REPOSITORY,
} from './ingestion.di-tokens';

export type IngestionModuleOptions = Record<string, never>;

@Module({})
export class IngestionModule {
  static forRoot(_options: IngestionModuleOptions = {}): DynamicModule {
    return {
      module: IngestionModule,
      imports: [
        BullModule.registerQueue(
          { name: EMBED_JOBS_QUEUE },
          { name: EMBED_RESULTS_QUEUE },
        ),
      ],
      providers: [
        {
          provide: SOURCE_VECTOR_REPOSITORY,
          useFactory: (db: NodePgDatabase<typeof ingestionSchema>) =>
            new SourceVectorPgDrizzleRepository(db),
          inject: [DATABASE_TOKENS.drizzleDatabase],
        },
        {
          provide: EMBED_JOB_DISPATCHER,
          useClass: EmbedJobBullMqDispatcher,
        },
        IngestSourceHandler,
        EmbedResultConsumer,
      ],
    };
  }
}
