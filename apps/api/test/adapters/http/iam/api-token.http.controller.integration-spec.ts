import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ApiTokenApi, errorResponseSchema } from '@sheska/contract';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConstraintViolationError, ForbiddenError, NotFoundError, UnauthenticatedError } from '@core/errors';
import { LOGGER } from '@kernels/application';
import { AuthenticateRequestUseCase } from '@contexts/iam/application/use-cases/authenticate-request.use-case';
import { AuthorizeRequestUseCase } from '@contexts/iam/application/use-cases/authorize-request.use-case';
import { IssueApiTokenUseCase } from '@contexts/iam/application/use-cases/issue-api-token.use-case';
import { ListApiTokensUseCase } from '@contexts/iam/application/use-cases/list-api-tokens.use-case';
import { RevokeApiTokenUseCase } from '@contexts/iam/application/use-cases/revoke-api-token.use-case';
import { ApiTokenHttpController } from '@contexts/iam/presentation/http/api-token.http.controller';
import { AccessHttpGuard } from '@contexts/iam/presentation/http/access.http.guard';
import { HttpExceptionFilter } from '@platform/nest/filters/http-exception.filter';
import { DeclaredErrorCodesInterceptor } from '@platform/nest/interceptors/declared-error-codes.interceptor';
const SESSION = '__Host-sheska_session=session-token';
const UNAUTHENTICATED = new UnauthenticatedError({
  code: 'auth.unauthenticated',
  message: 'Authentication is required',
  details: {},
});
const CREATED_AT = new Date('2026-11-19T00:00:00.000Z');
const LAST_USED_AT = new Date('2026-11-19T01:00:00.000Z');

const OWNER = {
  permissions: ['sources:sync', 'sources:read', 'posts:publish', 'api_tokens:manage'],
} as const;

describe('ApiTokenHttpController', () => {
  let app: INestApplication;
  let httpServer: Server;
  const authenticate = vi.fn<AuthenticateRequestUseCase['execute']>();
  const authorize = vi.fn<AuthorizeRequestUseCase['execute']>();
  const issue = vi.fn<IssueApiTokenUseCase['execute']>();
  const list = vi.fn<ListApiTokensUseCase['execute']>();
  const revoke = vi.fn<RevokeApiTokenUseCase['execute']>();

  beforeEach(async () => {
    for (const mock of [authenticate, authorize, issue, list, revoke]) {
      mock.mockReset();
    }
    authenticate.mockResolvedValue(OWNER);

    const testingModule = await Test.createTestingModule({
      controllers: [ApiTokenHttpController],
      providers: [
        {
          provide: AuthenticateRequestUseCase,
          useValue: { execute: authenticate },
        },
        { provide: AuthorizeRequestUseCase, useValue: { execute: authorize } },
        { provide: APP_GUARD, useClass: AccessHttpGuard },
        { provide: IssueApiTokenUseCase, useValue: { execute: issue } },
        { provide: ListApiTokensUseCase, useValue: { execute: list } },
        { provide: RevokeApiTokenUseCase, useValue: { execute: revoke } },
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
        {
          provide: APP_INTERCEPTOR,
          useClass: DeclaredErrorCodesInterceptor,
        },
      ],
    }).compile();

    app = testingModule.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => app.close());

  describe('접근 검사', () => {
    it.each([
      ['post', '/api-tokens'],
      ['get', '/api-tokens'],
      ['delete', '/api-tokens/token-1'],
    ] as const)('%s %s는 api_tokens:manage 권한을 요구한다', async (method, path) => {
      await request(httpServer)
        [method](path)
        .set('Cookie', SESSION)
        .send({ name: 'macbook', permissions: ['sources:sync'] });

      expect(authenticate).toHaveBeenCalledWith({
        credential: { type: 'session', token: 'session-token' },
      });
      expect(authorize).toHaveBeenCalledWith({
        identity: OWNER,
        permission: 'api_tokens:manage',
      });
    });

    it('인증하지 못하면 401 auth.unauthenticated이고 처리하지 않는다', async () => {
      authenticate.mockRejectedValue(UNAUTHENTICATED);

      const response = await request(httpServer).get('/api-tokens').set('Cookie', SESSION).expect(401);

      expect(errorResponseSchema.parse(response.body).code).toBe('auth.unauthenticated');
      expect(list).not.toHaveBeenCalled();
    });

    it('권한이 없으면 403 auth.forbidden이고 처리하지 않는다', async () => {
      authorize.mockImplementation(() => {
        throw new ForbiddenError({
          code: 'auth.forbidden',
          message: 'The credential does not allow this request',
          details: {},
        });
      });

      const response = await request(httpServer).get('/api-tokens').set('Authorization', 'Bearer shk_secret').expect(403);

      expect(errorResponseSchema.parse(response.body).code).toBe('auth.forbidden');
      expect(list).not.toHaveBeenCalled();
    });
  });

  describe('POST /api-tokens', () => {
    it('201과 함께 원문 토큰을 주고 캐시하지 못하게 한다', async () => {
      issue.mockResolvedValue({
        apiTokenId: 'token-1',
        name: 'macbook',
        hint: 'shk_Ab3d',
        permissions: ['sources:sync'],
        createdAt: CREATED_AT,
        lastUsedAt: null,
        token: 'shk_Ab3dXYZ',
      });

      const response = await request(httpServer)
        .post('/api-tokens')
        .set('Cookie', SESSION)
        .send({ name: 'macbook', permissions: ['sources:sync'] })
        .expect(201)
        .expect('Cache-Control', 'no-store');

      expect(ApiTokenApi.issue.response.parse(response.body)).toEqual({
        apiTokenId: 'token-1',
        name: 'macbook',
        hint: 'shk_Ab3d',
        permissions: ['sources:sync'],
        createdAt: CREATED_AT.toISOString(),
        lastUsedAt: null,
        token: 'shk_Ab3dXYZ',
      });
      expect(issue).toHaveBeenCalledWith({
        name: 'macbook',
        permissions: ['sources:sync'],
      });
    });

    it.each(['', 'MacBook', 'my token', 'a'.repeat(33)])('이름이 %j이면 400 request.validation_failed이다', async (name) => {
      const response = await request(httpServer)
        .post('/api-tokens')
        .set('Cookie', SESSION)
        .send({ name, permissions: ['sources:sync'] })
        .expect(400);

      expect(errorResponseSchema.parse(response.body).code).toBe('request.validation_failed');
      expect(issue).not.toHaveBeenCalled();
    });

    it.each([
      ['권한이 없으면', []],
      ['없는 권한이면', ['sources:purge']],
    ])('%s 400 request.validation_failed이다', async (_, permissions) => {
      const response = await request(httpServer)
        .post('/api-tokens')
        .set('Cookie', SESSION)
        .send({ name: 'macbook', permissions })
        .expect(400);

      expect(errorResponseSchema.parse(response.body).code).toBe('request.validation_failed');
      expect(issue).not.toHaveBeenCalled();
    });

    it('같은 이름이 있으면 409 api_token.name_taken이다', async () => {
      issue.mockRejectedValue(
        new ConstraintViolationError({
          code: 'api_token.name_taken',
          message: 'An API token with the same name already exists',
          details: { name: 'macbook' },
        }),
      );

      const response = await request(httpServer)
        .post('/api-tokens')
        .set('Cookie', SESSION)
        .send({ name: 'macbook', permissions: ['sources:sync'] })
        .expect(409);

      expect(errorResponseSchema.parse(response.body).code).toBe('api_token.name_taken');
    });
  });

  describe('GET /api-tokens', () => {
    it('토큰 목록을 원문 없이 준다', async () => {
      list.mockResolvedValue([
        {
          apiTokenId: 'token-1',
          name: 'macbook',
          hint: 'shk_Ab3d',
          permissions: ['sources:sync', 'posts:publish'],
          createdAt: CREATED_AT,
          lastUsedAt: LAST_USED_AT,
        },
      ]);

      const response = await request(httpServer).get('/api-tokens').set('Cookie', SESSION).expect(200).expect('Cache-Control', 'no-store');

      expect(ApiTokenApi.list.response.parse(response.body)).toEqual({
        apiTokens: [
          {
            apiTokenId: 'token-1',
            name: 'macbook',
            hint: 'shk_Ab3d',
            permissions: ['sources:sync', 'posts:publish'],
            createdAt: CREATED_AT.toISOString(),
            lastUsedAt: LAST_USED_AT.toISOString(),
          },
        ],
      });
    });
  });

  describe('DELETE /api-tokens/:id', () => {
    it('토큰을 폐기하고 204를 준다', async () => {
      revoke.mockResolvedValue(undefined);

      await request(httpServer).delete('/api-tokens/token-1').set('Cookie', SESSION).expect(204);

      expect(revoke).toHaveBeenCalledWith({ apiTokenId: 'token-1' });
    });

    it('토큰이 없으면 404 api_token.not_found이다', async () => {
      revoke.mockRejectedValue(
        new NotFoundError({
          code: 'api_token.not_found',
          message: 'API token not found',
          details: { id: 'missing' },
        }),
      );

      const response = await request(httpServer).delete('/api-tokens/missing').set('Cookie', SESSION).expect(404);

      expect(errorResponseSchema.parse(response.body).code).toBe('api_token.not_found');
    });
  });
});
