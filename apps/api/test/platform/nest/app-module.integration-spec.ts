import { Test } from '@nestjs/testing';
import { AppModule } from '@platform/nest/app.module';
import { afterAll, describe, expect, it, vi } from 'vitest';

const { previousDatabaseUrl } = vi.hoisted(() => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://sheska:sheska@localhost:5432/sheska';

  return { previousDatabaseUrl };
});

describe('AppModule', () => {
  afterAll(() => {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
      return;
    }

    process.env.DATABASE_URL = previousDatabaseUrl;
  });

  it('Nest root module로 compile된다', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await moduleRef.close();

    expect(moduleRef).toBeDefined();
  });
});
