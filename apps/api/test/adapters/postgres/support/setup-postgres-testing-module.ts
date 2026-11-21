import { type Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { databaseConfig } from '@platform/nest/database/database.config';
import { DatabaseModule } from '@platform/nest/database/database.module';

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
  }).compile();

  return testingModule.init();
}
