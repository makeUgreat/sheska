import { Module, type DynamicModule } from '@nestjs/common';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { SourceContentSnapshotCalculator } from '@contexts/sources/application/services/source-content-snapshot-calculator.service';
import { UploadSourceUseCase } from '@contexts/sources/application/use-cases/upload-source.use-case';
import { SourceFingerprinterSha256 } from '@contexts/sources/infrastructure/fingerprinter/source.fingerprinter.sha256';
import * as sourcesSchema from '@contexts/sources/infrastructure/persistence/postgres-drizzle/schema';
import { SourceDrizzleRepository } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source.drizzle.repository';
import { SourceSyncJobDrizzleRepository } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source-sync-job.drizzle.repository';
import { SourcesHttpController } from '@contexts/sources/presentation/http/sources-http.controller';
import {
  SOURCE_FINGERPRINTER,
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
} from './sources.di-tokens';

export type SourcesModuleOptions = Record<string, never>;

@Module({})
export class SourcesModule {
  static forRoot(_options: SourcesModuleOptions = {}): DynamicModule {
    return {
      module: SourcesModule,
      controllers: [SourcesHttpController],
      providers: [
        {
          provide: SOURCE_FINGERPRINTER,
          useClass: SourceFingerprinterSha256,
        },
        SourceContentSnapshotCalculator,
        {
          provide: SOURCE_REPOSITORY,
          useFactory: (db: NodePgDatabase<typeof sourcesSchema>) =>
            new SourceDrizzleRepository(db),
          inject: [DATABASE_TOKENS.drizzleDatabase],
        },
        {
          provide: SOURCE_SYNC_JOB_REPOSITORY,
          useFactory: (db: NodePgDatabase<typeof sourcesSchema>) =>
            new SourceSyncJobDrizzleRepository(db),
          inject: [DATABASE_TOKENS.drizzleDatabase],
        },
        UploadSourceUseCase,
      ],
      exports: [UploadSourceUseCase],
    };
  }
}
