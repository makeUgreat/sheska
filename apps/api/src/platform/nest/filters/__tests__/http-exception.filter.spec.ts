import { HttpException, HttpStatus, type ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  ApplicationException,
  APPLICATION_ERROR_KIND,
  type ApplicationErrorKind,
  type ApplicationValidationDetails,
  type LoggerPort,
} from '@kernels/application';
import { DomainException, DOMAIN_ERROR_KIND } from '@kernels/domain';
import {
  PresentationException,
  PRESENTATION_ERROR_KIND,
} from '@kernels/presentation';
import {
  InfrastructureException,
  INFRASTRUCTURE_ERROR_KIND,
  type InfrastructureErrorKind,
} from '@kernels/infrastructure';
import { HttpExceptionFilter } from '../http-exception.filter';

function buildMockHost(): {
  host: ArgumentsHost;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  response: { status: ReturnType<typeof vi.fn>; err?: Error };
} {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const response: { status: ReturnType<typeof vi.fn>; err?: Error } = {
    status,
  };
  const host = {
    switchToHttp: vi.fn().mockReturnValue({
      getResponse: vi.fn().mockReturnValue(response),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json, response };
}

function buildMockLogger() {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  } satisfies LoggerPort;
}

const INFRASTRUCTURE_EXCEPTION_BASE = {
  code: 'source.get_failed',
  source: { boundary: 'persistence', adapter: 'source.pg-drizzle' },
  message: 'Source get operation failed',
  cause: new Error('raw db error'),
} as const;

function buildInfrastructureException(
  kind: InfrastructureErrorKind,
): InfrastructureException {
  return kind === INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE
    ? new InfrastructureException({
        ...INFRASTRUCTURE_EXCEPTION_BASE,
        kind,
        details: { statusCode: 502 },
      })
    : new InfrastructureException({
        ...INFRASTRUCTURE_EXCEPTION_BASE,
        kind,
        details: { id: 'source-1' },
      });
}

function buildApplicationException(
  kind: ApplicationErrorKind,
): ApplicationException {
  const base = { code: 'test.error', message: 'test' } as const;

  return kind === APPLICATION_ERROR_KIND.VALIDATION_FAILED
    ? new ApplicationException({ ...base, kind, details: { fields: [] } })
    : new ApplicationException({ ...base, kind, details: undefined });
}

describe('HttpExceptionFilter', () => {
  describe('kind → status 매핑', () => {
    it.each([
      [PRESENTATION_ERROR_KIND.VALIDATION_FAILED, HttpStatus.BAD_REQUEST],
    ] as const)('presentation %s → %i', (kind, expectedStatus) => {
      const { host, status } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(
        new PresentationException({
          kind,
          code: 'request.validation_failed',
          message: 'Invalid request',
          details: { fields: [] },
        }),
        host,
      );

      expect(status).toHaveBeenCalledWith(expectedStatus);
    });

    it.each([
      [APPLICATION_ERROR_KIND.VALIDATION_FAILED, HttpStatus.BAD_REQUEST],
      [APPLICATION_ERROR_KIND.AUTHENTICATION_REQUIRED, HttpStatus.UNAUTHORIZED],
      [APPLICATION_ERROR_KIND.PERMISSION_DENIED, HttpStatus.FORBIDDEN],
      [APPLICATION_ERROR_KIND.NOT_FOUND, HttpStatus.NOT_FOUND],
      [APPLICATION_ERROR_KIND.STATE_CONFLICT, HttpStatus.CONFLICT],
      [
        APPLICATION_ERROR_KIND.OPERATION_NOT_ALLOWED,
        HttpStatus.UNPROCESSABLE_ENTITY,
      ],
      [APPLICATION_ERROR_KIND.RATE_LIMITED, HttpStatus.TOO_MANY_REQUESTS],
      [
        APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
      ],
    ] as const)('application %s → %i', (kind, expectedStatus) => {
      const { host, status } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(buildApplicationException(kind), host);

      expect(status).toHaveBeenCalledWith(expectedStatus);
    });

    it.each([
      [INFRASTRUCTURE_ERROR_KIND.NOT_FOUND, HttpStatus.NOT_FOUND],
      [INFRASTRUCTURE_ERROR_KIND.CONSTRAINT_VIOLATION, HttpStatus.CONFLICT],
      [INFRASTRUCTURE_ERROR_KIND.CONCURRENCY_CONFLICT, HttpStatus.CONFLICT],
      [INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE],
      [INFRASTRUCTURE_ERROR_KIND.TIMEOUT, HttpStatus.SERVICE_UNAVAILABLE],
      [
        INFRASTRUCTURE_ERROR_KIND.INVALID_DATA,
        HttpStatus.INTERNAL_SERVER_ERROR,
      ],
      [
        INFRASTRUCTURE_ERROR_KIND.RESTORE_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      ],
      [
        INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      ],
      [INFRASTRUCTURE_ERROR_KIND.UNEXPECTED, HttpStatus.INTERNAL_SERVER_ERROR],
    ] as const)('infrastructure %s → %i', (kind, expectedStatus) => {
      const { host, status } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(buildInfrastructureException(kind), host);

      expect(status).toHaveBeenCalledWith(expectedStatus);
    });

    it('domain invariant_violation → 500', () => {
      const { host, status } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(
        new DomainException({
          kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
          code: 'source.empty_body',
          message: 'Source body must not be empty',
          details: { fields: ['body'] },
        }),
        host,
      );

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('노출 범위', () => {
    it('validation_failed는 details까지 그대로 노출한다', () => {
      const { host, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());
      const details: ApplicationValidationDetails = {
        fields: [{ path: 'name', messages: ['필수 항목입니다'] }],
      };

      filter.catch(
        new ApplicationException({
          kind: APPLICATION_ERROR_KIND.VALIDATION_FAILED,
          code: 'source.invalid',
          message: 'Invalid source',
          details,
        }),
        host,
      );

      expect(json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'source.invalid',
        message: 'Invalid source',
        details,
      });
    });

    it('client가 조치할 수 있는 실패는 code와 message만 노출한다', () => {
      const { host, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(
        new ApplicationException({
          kind: APPLICATION_ERROR_KIND.STATE_CONFLICT,
          code: 'post.already_exists',
          message: 'A post for this source already exists',
          details: { postId: 'post-1' },
        }),
        host,
      );

      expect(json).toHaveBeenCalledWith({
        statusCode: HttpStatus.CONFLICT,
        code: 'post.already_exists',
        message: 'A post for this source already exists',
        details: {},
      });
    });

    it.each([
      INFRASTRUCTURE_ERROR_KIND.INVALID_DATA,
      INFRASTRUCTURE_ERROR_KIND.RESTORE_FAILED,
      INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE,
      INFRASTRUCTURE_ERROR_KIND.UNEXPECTED,
    ])('5xx가 되는 infrastructure %s는 code와 message를 마스킹한다', (kind) => {
      const { host, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(buildInfrastructureException(kind), host);

      expect(json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'internal.unexpected',
        message: 'Internal server error',
        details: {},
      });
    });

    it.each([
      INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
      INFRASTRUCTURE_ERROR_KIND.TIMEOUT,
    ])(
      '503이 되는 infrastructure %s는 어댑터 정보를 노출하지 않는다',
      (kind) => {
        const { host, json } = buildMockHost();
        const filter = new HttpExceptionFilter(buildMockLogger());

        filter.catch(buildInfrastructureException(kind), host);

        expect(json).toHaveBeenCalledWith({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'internal.unavailable',
          message: 'Service temporarily unavailable',
          details: {},
        });
      },
    );

    it('domain error는 마스킹한다', () => {
      const { host, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(
        new DomainException({
          kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
          code: 'source.empty_body',
          message: 'Source body must not be empty',
          details: { fields: ['body'] },
        }),
        host,
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'internal.unexpected' }),
      );
    });
  });

  describe('로그 레벨', () => {
    it.each([
      APPLICATION_ERROR_KIND.NOT_FOUND,
      APPLICATION_ERROR_KIND.STATE_CONFLICT,
      APPLICATION_ERROR_KIND.VALIDATION_FAILED,
      APPLICATION_ERROR_KIND.RATE_LIMITED,
    ])('비즈니스 실패인 application %s는 로그를 남기지 않는다', (kind) => {
      const { host } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);

      filter.catch(buildApplicationException(kind), host);

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('404로 매핑되는 infrastructure not_found는 로그를 남기지 않는다', () => {
      const { host } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);

      filter.catch(
        buildInfrastructureException(INFRASTRUCTURE_ERROR_KIND.NOT_FOUND),
        host,
      );

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('409로 매핑되는 infrastructure constraint_violation은 로그를 남기지 않는다', () => {
      const { host } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);

      filter.catch(
        buildInfrastructureException(
          INFRASTRUCTURE_ERROR_KIND.CONSTRAINT_VIOLATION,
        ),
        host,
      );

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('409로 매핑되는 infrastructure concurrency_conflict는 warn으로 남긴다', () => {
      const { host } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);

      filter.catch(
        buildInfrastructureException(
          INFRASTRUCTURE_ERROR_KIND.CONCURRENCY_CONFLICT,
        ),
        host,
      );

      expect(logger.warn).toHaveBeenCalledOnce();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it.each([
      INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
      INFRASTRUCTURE_ERROR_KIND.TIMEOUT,
      INFRASTRUCTURE_ERROR_KIND.UNEXPECTED,
    ])('5xx가 되는 infrastructure %s는 error로 남긴다', (kind) => {
      const { host } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);

      filter.catch(buildInfrastructureException(kind), host);

      expect(logger.error).toHaveBeenCalledOnce();
    });

    it('알 수 없는 예외는 error로 남긴다', () => {
      const { host } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);

      filter.catch(new Error('unexpected'), host);

      expect(logger.error).toHaveBeenCalledOnce();
    });
  });

  describe('HttpException', () => {
    it('body가 HttpFailure면 그대로 사용한다', () => {
      const { host, status, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());
      const failure = {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'custom.error',
        message: 'Custom error',
        details: {},
      };

      filter.catch(new HttpException(failure, HttpStatus.BAD_REQUEST), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(json).toHaveBeenCalledWith(failure);
    });

    it('body가 HttpFailure가 아닌 4xx는 status를 보존한다', () => {
      const { host, status, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(
        new HttpException('Cannot GET /unknown', HttpStatus.NOT_FOUND),
        host,
      );

      expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'http.404',
        message: 'Cannot GET /unknown',
        details: {},
      });
    });

    it('body가 HttpFailure가 아닌 4xx는 로그를 남기지 않는다', () => {
      const { host } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);

      filter.catch(new HttpException('Forbidden', HttpStatus.FORBIDDEN), host);

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('body가 HttpFailure가 아닌 5xx는 마스킹한다', () => {
      const { host, status, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(
        new HttpException('Bad Gateway', HttpStatus.BAD_GATEWAY),
        host,
      );

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'internal.unexpected' }),
      );
    });
  });

  describe('알 수 없는 예외', () => {
    it('500 internal.unexpected로 마스킹한다', () => {
      const { host, status, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(new Error('unexpected'), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'internal.unexpected' }),
      );
    });

    it('정책에 없는 kind는 500으로 마스킹하고 error로 남긴다', () => {
      const { host, status, json } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);
      const unregistered = Object.assign(new Error('unregistered kind'), {
        kind: 'brand_new_kind',
        code: 'sample.unregistered',
      });

      filter.catch(unregistered, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'internal.unexpected' }),
      );
      expect(logger.error).toHaveBeenCalledOnce();
    });
  });

  describe('res.err (access-log용 원본 에러 전달)', () => {
    it('5xx면 원본 예외를 담는다', () => {
      const { host, response } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());
      const exception = buildInfrastructureException(
        INFRASTRUCTURE_ERROR_KIND.UNEXPECTED,
      );

      filter.catch(exception, host);

      expect(response.err).toBe(exception);
    });

    it('Error가 아닌 값을 throw해도 Error 인스턴스로 변환한다', () => {
      const { host, response } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch('raw string rejection', host);

      expect(response.err).toBeInstanceOf(Error);
      expect(response.err?.message).toBe('raw string rejection');
    });

    it.each([
      INFRASTRUCTURE_ERROR_KIND.NOT_FOUND,
      INFRASTRUCTURE_ERROR_KIND.CONSTRAINT_VIOLATION,
    ])('4xx가 되는 infrastructure %s는 담지 않는다', (kind) => {
      const { host, response } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(buildInfrastructureException(kind), host);

      expect(response.err).toBeUndefined();
    });

    it('application 비즈니스 실패는 담지 않는다', () => {
      const { host, response } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(
        new ApplicationException({
          kind: APPLICATION_ERROR_KIND.NOT_FOUND,
          code: 'source.not_found',
          message: 'Source not found',
          details: undefined,
        }),
        host,
      );

      expect(response.err).toBeUndefined();
    });
  });
});
