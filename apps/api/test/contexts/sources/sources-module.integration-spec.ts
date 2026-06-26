import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { SourcesModule } from '@contexts/sources/sources.module';
import { DatabaseModule } from '@platform/nest/database/database.module';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const databaseUrl = 'postgres://sheska:sheska@localhost:5432/sheska';

describe('SourcesModule', () => {
  let previousDatabaseUrl: string | undefined;

  beforeEach(() => {
    previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = databaseUrl;
  });

  afterEach(() => {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
      return;
    }

    process.env.DATABASE_URL = previousDatabaseUrl;
  });

  it('SourcesModule을 Nest module로 조립한다', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        DatabaseModule,
        SourcesModule.forRoot(),
      ],
    }).compile();

    await moduleRef.close();

    expect(moduleRef).toBeDefined();
  });
});
