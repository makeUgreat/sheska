import { type Server } from 'node:http';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { errorResponseSchema, PERMISSION } from '@sheska/contract';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError, UnauthenticatedError } from '@core/errors';
import { LOGGER } from '@kernels/application';
import { Permission, Public } from '@kernels/presentation';
import { AuthenticateRequestUseCase } from '@contexts/iam/application/use-cases/authenticate-request.use-case';
import { AuthorizeRequestUseCase } from '@contexts/iam/application/use-cases/authorize-request.use-case';
import { GetSessionUseCase } from '@contexts/iam/application/use-cases/get-session.use-case';
import { LogInUseCase } from '@contexts/iam/application/use-cases/log-in.use-case';
import { LogOutUseCase } from '@contexts/iam/application/use-cases/log-out.use-case';
import { AccessHttpGuard } from '@contexts/iam/presentation/http/access.http.guard';
import { AuthHttpController } from '@contexts/iam/presentation/http/auth.http.controller';
import { HttpExceptionFilter } from '@platform/nest/filters/http-exception.filter';

@Controller()
class ProbeController {
  @Get('/probe/public')
  @Public()
  open() {
    return { ok: true };
  }

  @Get('/probe/undeclared')
  undeclared() {
    return { ok: true };
  }

  @Get('/probe/sync')
  @Permission(PERMISSION.SOURCES_SYNC)
  sync() {
    return { ok: true };
  }

  @Get('/probe/manage')
  @Permission(PERMISSION.API_TOKENS_MANAGE)
  manage() {
    return { ok: true };
  }
}

const OWNER = {
  permissions: ['sources:sync', 'sources:read', 'posts:publish', 'api_tokens:manage'],
} as const;

describe('AccessHttpGuard', () => {
  let app: INestApplication;
  let httpServer: Server;
  const authenticate = vi.fn<AuthenticateRequestUseCase['execute']>();
  const authorize = vi.fn<AuthorizeRequestUseCase['execute']>();

  beforeEach(async () => {
    authenticate.mockReset();
    authenticate.mockResolvedValue(OWNER);
    authorize.mockReset();
    const testingModule = await Test.createTestingModule({
      controllers: [ProbeController, AuthHttpController],
      providers: [
        {
          provide: AuthenticateRequestUseCase,
          useValue: { execute: authenticate },
        },
        { provide: AuthorizeRequestUseCase, useValue: { execute: authorize } },
        { provide: APP_GUARD, useClass: AccessHttpGuard },
        { provide: LogInUseCase, useValue: { execute: vi.fn() } },
        { provide: LogOutUseCase, useValue: { execute: vi.fn() } },
        { provide: GetSessionUseCase, useValue: { execute: vi.fn() } },
        {
          provide: LOGGER,
          useValue: {
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
          },
        },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
    }).compile();
    app = testingModule.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => app.close());

  it('Public route는 인증하지 않는다', async () => {
    await request(httpServer).get('/probe/public').set('Authorization', 'Bearer wrong').expect(200);

    expect(authenticate).not.toHaveBeenCalled();
    expect(authorize).not.toHaveBeenCalled();
  });

  it('접근을 선언하지 않은 route는 인증하지 않고 500이다', async () => {
    await request(httpServer).get('/probe/undeclared').set('Cookie', '__Host-sheska_session=session-token').expect(500);

    expect(authenticate).not.toHaveBeenCalled();
  });

  it.each([
    ['/probe/sync', 'sources:sync'],
    ['/probe/manage', 'api_tokens:manage'],
  ])('%s는 %s를 요구한다', async (path, permission) => {
    await request(httpServer).get(path).set('Cookie', '__Host-sheska_session=session-token').expect(200);

    expect(authorize).toHaveBeenCalledWith({
      identity: OWNER,
      permission,
    });
  });

  it('세션 쿠키를 세션 증거로 넘긴다', async () => {
    await request(httpServer).get('/probe/sync').set('Cookie', '__Host-sheska_session=session-token');

    expect(authenticate).toHaveBeenCalledWith({
      credential: { type: 'session', token: 'session-token' },
    });
  });

  it('Bearer 토큰이 있으면 세션 쿠키는 보지 않는다', async () => {
    await request(httpServer)
      .get('/probe/sync')
      .set('Cookie', '__Host-sheska_session=session-token')
      .set('Authorization', 'Bearer shk_secret');

    expect(authenticate).toHaveBeenCalledWith({
      credential: { type: 'bearer', token: 'shk_secret' },
    });
  });

  it('Bearer 모양이 아닌 Authorization 헤더는 빈 토큰으로 넘긴다', async () => {
    await request(httpServer).get('/probe/sync').set('Authorization', 'shk_secret');

    expect(authenticate).toHaveBeenCalledWith({
      credential: { type: 'bearer', token: '' },
    });
  });

  it('세션 쿠키도 Authorization 헤더도 없으면 인증 정보 없음으로 넘긴다', async () => {
    await request(httpServer).get('/probe/sync');

    expect(authenticate).toHaveBeenCalledWith({ credential: null });
  });

  it('인증에 실패하면 401 auth.unauthenticated이다', async () => {
    authenticate.mockRejectedValue(
      new UnauthenticatedError({
        code: 'auth.unauthenticated',
        message: 'Authentication is required',
        details: {},
      }),
    );

    const response = await request(httpServer).get('/probe/sync').set('Authorization', 'Bearer wrong').expect(401);

    expect(errorResponseSchema.parse(response.body).code).toBe('auth.unauthenticated');
  });

  it('권한이 없으면 403 auth.forbidden이다', async () => {
    authorize.mockImplementation(() => {
      throw new ForbiddenError({
        code: 'auth.forbidden',
        message: 'The credential does not allow this request',
        details: {},
      });
    });

    const response = await request(httpServer).get('/probe/sync').set('Authorization', 'Bearer shk_secret').expect(403);

    expect(errorResponseSchema.parse(response.body).code).toBe('auth.forbidden');
  });

  describe('GET /auth/sync-check', () => {
    it('sources:sync 권한을 요구하고 통과하면 204다', async () => {
      await request(httpServer)
        .get('/auth/sync-check')
        .set('Authorization', 'Bearer shk_secret')
        .expect(204)
        .expect('Cache-Control', 'no-store');

      expect(authenticate).toHaveBeenCalledWith({
        credential: { type: 'bearer', token: 'shk_secret' },
      });
    });
  });
});
