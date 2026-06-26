import { Global, Module } from '@nestjs/common';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { DrizzlePostgresProvider } from './drizzle-postgres.provider';

@Global()
@Module({
  providers: [
    DrizzlePostgresProvider,
    {
      provide: DATABASE_TOKENS.drizzleDatabase,
      useFactory: (provider: DrizzlePostgresProvider) => provider.database,
      inject: [DrizzlePostgresProvider],
    },
  ],
  exports: [DATABASE_TOKENS.drizzleDatabase],
})
export class DatabaseModule {}
