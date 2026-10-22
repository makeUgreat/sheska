import { Global, Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import {
  DrizzlePostgresProvider,
  type DrizzlePostgresProviderOptions,
} from './drizzle-postgres.provider';
import { databaseConfig } from './database.config';

const DRIZZLE_POSTGRES_PROVIDER = Symbol('DRIZZLE_POSTGRES_PROVIDER');

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_POSTGRES_PROVIDER,
      useFactory: (
        config: ConfigType<typeof databaseConfig>,
      ): DrizzlePostgresProvider => {
        const options: DrizzlePostgresProviderOptions = {
          databaseUrl: config.databaseUrl,
        };
        return new DrizzlePostgresProvider(options);
      },
      inject: [databaseConfig.KEY],
    },
    {
      provide: DATABASE_TOKENS.drizzleDatabase,
      useFactory: (provider: DrizzlePostgresProvider) => provider.database,
      inject: [DRIZZLE_POSTGRES_PROVIDER],
    },
  ],
  exports: [DATABASE_TOKENS.drizzleDatabase],
})
export class DatabaseModule {}
