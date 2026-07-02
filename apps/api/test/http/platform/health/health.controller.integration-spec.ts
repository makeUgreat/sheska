import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { HttpExceptionFilter } from '@platform/nest/filters/http-exception.filter';
import { HealthController } from '@platform/nest/health/health.controller';
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

function createDbMock(): DbMock {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
  };
}

describe('HealthController', () => {
  let app: INestApplication;
  let httpServer: Server;
  let db: DbMock;

  beforeEach(async () => {
    db = createDbMock();

    const testingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DATABASE_TOKENS.drizzleDatabase,
          useValue: db,
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

  describe('GET /health', () => {
    it('DB 연결이 정상이면 200과 { status: "ok" }를 반환한다', async () => {
      const response = await request(httpServer).get('/health').expect(200);

      expect(response.body).toEqual({ status: 'ok' });
    });

    it('DB 연결에 실패하면 503을 반환한다', async () => {
      db.execute.mockRejectedValue(new Error('connection refused'));

      const response = await request(httpServer).get('/health').expect(503);

      expect(response.body).toMatchObject({
        statusCode: 503,
        code: 'health.database_unreachable',
      });
    });
  });
});
