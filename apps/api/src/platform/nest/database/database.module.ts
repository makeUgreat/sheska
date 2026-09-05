import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import {
  DrizzlePostgresProvider,
  type DrizzlePostgresProviderOptions,
} from './drizzle-postgres.provider';
import { parseDatabaseConfig } from './database.config';

const DRIZZLE_POSTGRES_PROVIDER = Symbol('DRIZZLE_POSTGRES_PROVIDER');

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_POSTGRES_PROVIDER,
      useFactory: (configService: ConfigService): DrizzlePostgresProvider => {
        const config = parseDatabaseConfig({
          DATABASE_URL: configService.get('DATABASE_URL'),
        });
        const options: DrizzlePostgresProviderOptions = {
          databaseUrl: config.databaseUrl,
        };
        return new DrizzlePostgresProvider(options);
      },
      inject: [ConfigService],
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
