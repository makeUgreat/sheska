import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthApi, errorResponseSchema } from '@sheska/contract';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimitedError, UnauthenticatedError } from '@core/errors';
import { LOGGER } from '@kernels/application';
import { GetSessionUseCase } from '@contexts/iam/application/use-cases/get-session.use-case';
import { LogInUseCase } from '@contexts/iam/application/use-cases/log-in.use-case';
import { LogOutUseCase } from '@contexts/iam/application/use-cases/log-out.use-case';
import { AuthHttpController } from '@contexts/iam/presentation/http/auth.http.controller';
import { HttpExceptionFilter } from '@platform/nest/filters/http-exception.filter';
import { DeclaredErrorCodesInterceptor } from '@platform/nest/interceptors/declared-error-codes.interceptor';

const SESSION_COOKIE = '__Host-sheska_session';
const EXPIRES_AT = new Date('2026-12-18T00:00:00.000Z');

describe('AuthHttpController', () => {
  let app: INestApplication;
  let httpServer: Server;
  const logIn = vi.fn<LogInUseCase['execute']>();
  const logOut = vi.fn<LogOutUseCase['execute']>();
  const getSession = vi.fn<GetSessionUseCase['execute']>();

  beforeEach(async () => {
    logIn.mockReset();
    logOut.mockReset();
    getSession.mockReset();
    const testingModule = await Test.createTestingModule({
      controllers: [AuthHttpController],
      providers: [
        { provide: LogInUseCase, useValue: { execute: logIn } },
        { provide: LogOutUseCase, useValue: { execute: logOut } },
        { provide: GetSessionUseCase, useValue: { execute: getSession } },
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

  describe('POST /auth/session', () => {
    it('로그인하면 204와 함께 HttpOnly 세션 쿠키를 설정한다', async () => {
      logIn.mockResolvedValue({
        sessionToken: 'session-token',
        expiresAt: EXPIRES_AT,
      });

      const response = await request(httpServer)
        .post('/auth/session')
        .send({ password: 'secret' })
        .expect(204);

      const cookie = response.headers['set-cookie']?.[0] ?? '';
      expect(cookie).toContain(`${SESSION_COOKIE}=session-token`);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain(`Expires=${EXPIRES_AT.toUTCString()}`);
      expect(cookie).not.toContain('Domain');
    });

    it('응답을 캐시하지 못하게 한다', async () => {
      logIn.mockResolvedValue({
        sessionToken: 'session-token',
        expiresAt: EXPIRES_AT,
      });

      await request(httpServer)
        .post('/auth/session')
        .send({ password: 'secret' })
        .expect('Cache-Control', 'no-store');
    });

    it('Cloudflare가 알려 준 접속 IP로 실패를 센다', async () => {
      logIn.mockResolvedValue({
        sessionToken: 'session-token',
        expiresAt: EXPIRES_AT,
      });

      await request(httpServer)
        .post('/auth/session')
        .set('CF-Connecting-IP', '203.0.113.7')
        .send({ password: 'secret' })
        .expect(204);

      expect(logIn).toHaveBeenCalledWith({
        password: 'secret',
        clientAddress: '203.0.113.7',
      });
    });

    it('비밀번호가 없으면 400이다', async () => {
      const response = await request(httpServer)
        .post('/auth/session')
        .send({})
        .expect(400);

      expect(errorResponseSchema.parse(response.body).code).toBe(
        'request.validation_failed',
      );
      expect(logIn).not.toHaveBeenCalled();
    });

    it('비밀번호가 틀리면 401 auth.invalid_credentials이고 쿠키를 설정하지 않는다', async () => {
      logIn.mockRejectedValue(
        new UnauthenticatedError({
          code: 'auth.invalid_credentials',
          message: 'Invalid credentials',
          details: {},
        }),
      );

      const response = await request(httpServer)
        .post('/auth/session')
        .send({ password: 'wrong' })
        .expect(401);

      expect(errorResponseSchema.parse(response.body).code).toBe(
        'auth.invalid_credentials',
      );
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('잠긴 IP면 429와 다시 시도할 수 있는 시간을 돌려준다', async () => {
      logIn.mockRejectedValue(
        new RateLimitedError({
          code: 'auth.too_many_attempts',
          message: 'Too many failed login attempts',
          details: { retryAfterSeconds: 420 },
        }),
      );

      const response = await request(httpServer)
        .post('/auth/session')
        .send({ password: 'secret' })
        .expect(429);

      expect(errorResponseSchema.parse(response.body)).toMatchObject({
        code: 'auth.too_many_attempts',
        details: { retryAfterSeconds: 420 },
      });
    });
  });

  describe('DELETE /auth/session', () => {
    it('쿠키의 세션을 지우고 쿠키를 만료시킨다', async () => {
      logOut.mockResolvedValue();

      const response = await request(httpServer)
        .delete('/auth/session')
        .set('Cookie', `${SESSION_COOKIE}=session-token`)
        .expect(204);

      expect(logOut).toHaveBeenCalledWith({ sessionToken: 'session-token' });
      const cookie = response.headers['set-cookie']?.[0] ?? '';
      expect(cookie).toContain(`${SESSION_COOKIE}=;`);
      expect(cookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });

    it('쿠키가 없어도 204다', async () => {
      logOut.mockResolvedValue();

      await request(httpServer).delete('/auth/session').expect(204);

      expect(logOut).toHaveBeenCalledWith({ sessionToken: null });
    });
  });

  describe('GET /auth/session', () => {
    it('쿠키의 세션 토큰으로 로그인 상태를 돌려준다', async () => {
      getSession.mockResolvedValue({ authenticated: true });

      const response = await request(httpServer)
        .get('/auth/session')
        .set('Cookie', `other=value; ${SESSION_COOKIE}=session-token`)
        .expect(200)
        .expect('Cache-Control', 'no-store');

      expect(AuthApi.session.response.parse(response.body)).toEqual({
        authenticated: true,
      });
      expect(getSession).toHaveBeenCalledWith({
        sessionToken: 'session-token',
      });
    });

    it('쿠키가 없으면 세션 토큰 없이 조회한다', async () => {
      getSession.mockResolvedValue({ authenticated: false });

      await request(httpServer).get('/auth/session').expect(200);

      expect(getSession).toHaveBeenCalledWith({ sessionToken: null });
    });
  });
});
