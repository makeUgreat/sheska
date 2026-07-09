import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { HttpExceptionFilter } from '@platform/nest/filters/http-exception.filter';
import { HealthController } from '@platform/nest/health/health.controller';
import { QueueHealthProbe } from '@platform/nest/queue/queue-health.probe';
import request from 'supertest';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockedFunction,
  vi,
} from 'vitest';

type DbMock = {
  execute: MockedFunction<() => Promise<unknown>>;
};

type QueueHealthProbeMock = {
  check: MockedFunction<() => Promise<void>>;
};

function createDbMock(): DbMock {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
  };
}

function createQueueHealthProbeMock(): QueueHealthProbeMock {
  return {
    check: vi.fn().mockResolvedValue(undefined),
  };
}

describe('HealthController HTTP contract', () => {
  let app: INestApplication;
  let httpServer: Server;
  let db: DbMock;
  let queueHealthProbe: QueueHealthProbeMock;

  beforeEach(async () => {
    db = createDbMock();
    queueHealthProbe = createQueueHealthProbeMock();

    const testingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DATABASE_TOKENS.drizzleDatabase,
          useValue: db,
        },
        {
          provide: QueueHealthProbe,
          useValue: queueHealthProbe,
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

  afterEach(async () => {
    await app.close();
  });

  describe('GET /livez', () => {
    it('의존성 없이 즉시 200과 { status: "ok" }를 반환한다', async () => {
      const response = await request(httpServer).get('/livez').expect(200);

      expect(response.body).toEqual({ status: 'ok' });
      expect(db.execute).not.toHaveBeenCalled();
      expect(queueHealthProbe.check).not.toHaveBeenCalled();
    });
  });

  describe('GET /readyz', () => {
    it('dependency probe가 정상이면 200과 { status: "ok" }를 반환한다', async () => {
      const response = await request(httpServer).get('/readyz').expect(200);

      expect(response.body).toEqual({ status: 'ok' });
      expect(db.execute).toHaveBeenCalledOnce();
      expect(queueHealthProbe.check).toHaveBeenCalledOnce();
    });

    it('DB probe가 실패하면 503을 반환한다', async () => {
      db.execute.mockRejectedValue(new Error('connection refused'));

      const response = await request(httpServer).get('/readyz').expect(503);

      expect(response.body).toMatchObject({
        statusCode: 503,
        code: 'health.database_unreachable',
      });
      expect(queueHealthProbe.check).not.toHaveBeenCalled();
    });

    it('queue probe가 실패하면 503을 반환한다', async () => {
      queueHealthProbe.check.mockRejectedValue(new Error('connection refused'));

      const response = await request(httpServer).get('/readyz').expect(503);

      expect(response.body).toMatchObject({
        statusCode: 503,
        code: 'health.queue_unreachable',
      });
    });
  });
});
