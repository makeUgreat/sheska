import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '@platform/nest/app.module';

describe('AppModule', () => {
  let testingModule: TestingModule | undefined;

  beforeAll(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://sheska:sheska@127.0.0.1:56432/sheska_test');
    vi.stubEnv('REDIS_URL', 'redis://127.0.0.1:56379');
    vi.stubEnv('EMBEDDING_BASE_URL', 'http://embedding-unavailable:3000');
    vi.stubEnv('ATTACHMENT_STORAGE_ENDPOINT', 'http://attachment-storage-unavailable:9000');
    vi.stubEnv('ATTACHMENT_STORAGE_BUCKET', 'sheska-attachments');
    vi.stubEnv('ATTACHMENT_STORAGE_ACCESS_KEY_ID', 'unused');
    vi.stubEnv('ATTACHMENT_STORAGE_SECRET_ACCESS_KEY', 'unused');
    vi.stubEnv('CORS_ORIGINS', 'http://localhost:4173');
    vi.stubEnv('OWNER_PASSWORD', 'test-owner-password');
  });

  afterAll(async () => {
    await testingModule?.close();
    vi.unstubAllEnvs();
  });

  it('모든 설정 묶음을 검증하고 모든 provider의 의존성을 해결한다', async () => {
    testingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();

    expect(testingModule).toBeDefined();
  });
});
