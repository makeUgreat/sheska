import { Module, type DynamicModule } from '@nestjs/common';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import {
  type SourceFingerprinter,
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/application/ports';
import { SourceContentSnapshotCalculator } from '@contexts/sources/application/services/source-content-snapshot-calculator.service';
import { UploadSourceUseCase } from '@contexts/sources/application/use-cases/upload-source.use-case';
import { SourceFingerprinterSha256 } from '@contexts/sources/infrastructure/fingerprinter/source.fingerprinter.sha256';
import * as sourcesSchema from '@contexts/sources/infrastructure/persistence/postgres-drizzle/schema';
import { SourceDrizzleRepository } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source.drizzle.repository';
import { SourceSyncJobDrizzleRepository } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source-sync-job.drizzle.repository';
import { SOURCES_TOKENS } from './sources.tokens';

export type SourcesModuleOptions = Record<string, never>;

@Module({})
export class SourcesModule {
  static forRoot(_options: SourcesModuleOptions = {}): DynamicModule {
    return {
      module: SourcesModule,
      providers: [
        {
          provide: SOURCES_TOKENS.sourceFingerprinter,
          useClass: SourceFingerprinterSha256,
        },
        {
          provide: SourceContentSnapshotCalculator,
          useFactory: (fingerprinter: SourceFingerprinter) =>
            new SourceContentSnapshotCalculator(fingerprinter),
          inject: [SOURCES_TOKENS.sourceFingerprinter],
        },
        {
          provide: SOURCES_TOKENS.sourceRepository,
          useFactory: (db: NodePgDatabase<typeof sourcesSchema>) =>
            new SourceDrizzleRepository(db),
          inject: [DATABASE_TOKENS.drizzleDatabase],
        },
        {
          provide: SOURCES_TOKENS.sourceSyncJobRepository,
          useFactory: (db: NodePgDatabase<typeof sourcesSchema>) =>
            new SourceSyncJobDrizzleRepository(db),
          inject: [DATABASE_TOKENS.drizzleDatabase],
        },
        {
          provide: UploadSourceUseCase,
          useFactory: (
            calculator: SourceContentSnapshotCalculator,
            sources: SourceRepository,
            syncJobs: SourceSyncJobRepository,
          ) => new UploadSourceUseCase(calculator, sources, syncJobs),
          inject: [
            SourceContentSnapshotCalculator,
            SOURCES_TOKENS.sourceRepository,
            SOURCES_TOKENS.sourceSyncJobRepository,
          ],
        },
      ],
      exports: [UploadSourceUseCase],
    };
  }
}
