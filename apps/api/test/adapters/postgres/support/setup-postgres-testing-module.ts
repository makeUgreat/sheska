import { type Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { databaseConfig } from '@platform/nest/database/database.config';
import { DatabaseModule } from '@platform/nest/database/database.module';
import { POSTGRES_TEST_DATABASE_URL } from './postgres.connection';

export async function setupPostgresTestingModule(providers: Provider[]): Promise<TestingModule> {
  const testingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        isGlobal: true,
        load: [databaseConfig],
      }),
      DatabaseModule,
    ],
    providers,
  })
    .overrideProvider(databaseConfig.KEY)
    .useValue({ databaseUrl: POSTGRES_TEST_DATABASE_URL })
    .compile();

  return testingModule.init();
}
