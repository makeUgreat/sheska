import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { HttpExceptionFilter } from '@platform/nest/filters/http-exception.filter';
import { HealthController } from '@platform/nest/health/health.controller';
import { DatabaseModule } from '@platform/nest/database/database.module';
import { QueueHealthProbe } from '@platform/nest/queue/queue-health.probe';
import { LOGGER } from '@kernels/application';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  type MockedFunction,
  vi,
} from 'vitest';

type QueueHealthProbeMock = {
  check: MockedFunction<() => Promise<void>>;
};

function createQueueHealthProbeMock(): QueueHealthProbeMock {
  return {
    check: vi.fn().mockResolvedValue(undefined),
  };
}

describe('HealthController Postgres boundary', () => {
  let app: INestApplication;
  let httpServer: Server;
  let queueHealthProbe: QueueHealthProbeMock;

  beforeAll(async () => {
    queueHealthProbe = createQueueHealthProbeMock();

    const testingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: `.env.${process.env.NODE_ENV}`,
          isGlobal: true,
        }),
        DatabaseModule,
      ],
      controllers: [HealthController],
      providers: [
        {
          provide: QueueHealthProbe,
          useValue: queueHealthProbe,
        },
        {
          provide: LOGGER,
          useValue: {
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
          },
        },
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter,
        },
      ],
    }).compile();

    app = testingModule.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Postgres health query', () => {
    it('실제 Postgres 연결로 readyz query를 실행한다', async () => {
      const response = await request(httpServer).get('/readyz').expect(200);

      expect(response.body).toEqual({ status: 'ok' });
      expect(queueHealthProbe.check).toHaveBeenCalledOnce();
    });
  });
});
