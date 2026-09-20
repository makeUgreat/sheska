import { HttpException, HttpStatus, type ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  BadResponseError,
  ConcurrencyConflictError,
  ConstraintViolationError,
  InvalidDataError,
  InvariantViolationError,
  NotFoundError,
  StateConflictError,
  TimeoutError,
  UnavailableError,
  UnexpectedError,
  ValidationFailedError,
  type InvalidDataDetails,
  type SheskaErrorParams,
  type ValidationFailedDetails,
} from '@core/errors';
import { type LoggerPort } from '@kernels/application';
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

const persistenceParams = {
  code: 'source.get_failed',
  message: 'Source get operation failed',
  details: { id: 'source-1' },
  cause: new Error('raw db error'),
} as const;

const badResponseParams = {
  code: 'ollama.bad_response',
  message: 'Ollama returned an error response: 502 Bad Gateway',
  details: { statusCode: 502 },
} as const;

const invalidDataParams = {
  code: 'ollama.invalid_response',
  message: 'Ollama response did not match expected shape',
  details: { fields: ['embedding'] },
} satisfies SheskaErrorParams<InvalidDataDetails>;

function buildInvariantViolation(): InvariantViolationError {
  return new InvariantViolationError({
    code: 'source.empty_body',
    message: 'Source body must not be empty',
    details: { fields: ['body'] },
  });
}

describe('HttpExceptionFilter', () => {
  describe('kind → status 매핑', () => {
    it.each([
      {
        error: new ValidationFailedError({
          code: 'request.validation_failed',
          message: 'Invalid request',
          details: { fields: [] },
        }),
        expectedStatus: HttpStatus.BAD_REQUEST,
      },
      {
        error: new NotFoundError(persistenceParams),
        expectedStatus: HttpStatus.NOT_FOUND,
      },
      {
        error: new StateConflictError({
          code: 'post.already_published',
          message: 'Post is already published',
          details: { postId: 'post-1' },
        }),
        expectedStatus: HttpStatus.CONFLICT,
      },
      {
        error: new ConstraintViolationError(persistenceParams),
        expectedStatus: HttpStatus.CONFLICT,
      },
      {
        error: new ConcurrencyConflictError(persistenceParams),
        expectedStatus: HttpStatus.CONFLICT,
      },
      {
        error: buildInvariantViolation(),
        expectedStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      },
      {
        error: new InvalidDataError(invalidDataParams),
        expectedStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      },
      {
        error: new BadResponseError(badResponseParams),
        expectedStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      },
      {
        error: new UnexpectedError(persistenceParams),
        expectedStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      },
      {
        error: new UnavailableError(persistenceParams),
        expectedStatus: HttpStatus.SERVICE_UNAVAILABLE,
      },
      {
        error: new TimeoutError(persistenceParams),
        expectedStatus: HttpStatus.SERVICE_UNAVAILABLE,
      },
    ])('$error.name → $expectedStatus', ({ error, expectedStatus }) => {
      const { host, status } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(error, host);

      expect(status).toHaveBeenCalledWith(expectedStatus);
    });
  });

  describe('노출 범위', () => {
    it('ValidationFailedError는 details까지 그대로 노출한다', () => {
      const { host, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());
      const details: ValidationFailedDetails = {
        fields: [{ path: 'name', messages: ['필수 항목입니다'] }],
      };

      filter.catch(
        new ValidationFailedError({
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
        new StateConflictError({
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
      new InvalidDataError(invalidDataParams),
      new BadResponseError(badResponseParams),
      new UnexpectedError(persistenceParams),
      buildInvariantViolation(),
    ])('500이 되는 $name은 code와 message를 마스킹한다', (error) => {
      const { host, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(error, host);

      expect(json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'internal.unexpected',
        message: 'Internal server error',
        details: {},
      });
    });

    it.each([
      new UnavailableError(persistenceParams),
      new TimeoutError(persistenceParams),
    ])('503이 되는 $name은 어댑터 정보를 노출하지 않는다', (error) => {
      const { host, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(error, host);

      expect(json).toHaveBeenCalledWith({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'internal.unavailable',
        message: 'Service temporarily unavailable',
        details: {},
      });
    });
  });

  describe('로그 레벨', () => {
    it.each([
      new NotFoundError(persistenceParams),
      new StateConflictError({
        code: 'post.already_published',
        message: 'Post is already published',
        details: { postId: 'post-1' },
      }),
      new ValidationFailedError({
        code: 'request.validation_failed',
        message: 'Invalid request',
        details: { fields: [] },
      }),
      new ConstraintViolationError(persistenceParams),
    ])('4xx로 매핑되는 $name은 로그를 남기지 않는다', (error) => {
      const { host } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);

      filter.catch(error, host);

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('409로 매핑되는 ConcurrencyConflictError는 warn으로 남긴다', () => {
      const { host } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);

      filter.catch(new ConcurrencyConflictError(persistenceParams), host);

      expect(logger.warn).toHaveBeenCalledOnce();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it.each([
      new UnavailableError(persistenceParams),
      new TimeoutError(persistenceParams),
      new UnexpectedError(persistenceParams),
    ])('5xx가 되는 $name은 error로 남긴다', (error) => {
      const { host } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);

      filter.catch(error, host);

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

    it('kind와 code만 흉내 낸 Error는 이 프로젝트 error로 보지 않는다', () => {
      const { host, status, json } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);
      const lookalike = Object.assign(new Error('not a SheskaError'), {
        kind: 'not_found',
        code: 'sample.not_found',
      });

      filter.catch(lookalike, host);

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
      const error = new UnexpectedError(persistenceParams);

      filter.catch(error, host);

      expect(response.err).toBe(error);
    });

    it('Error가 아닌 값을 throw해도 Error 인스턴스로 변환한다', () => {
      const { host, response } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch('raw string rejection', host);

      expect(response.err).toBeInstanceOf(Error);
      expect(response.err?.message).toBe('raw string rejection');
    });

    it.each([
      new NotFoundError(persistenceParams),
      new ConstraintViolationError(persistenceParams),
      new StateConflictError({
        code: 'post.already_published',
        message: 'Post is already published',
        details: { postId: 'post-1' },
      }),
    ])('4xx가 되는 $name은 담지 않는다', (error) => {
      const { host, response } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(error, host);

      expect(response.err).toBeUndefined();
    });
  });
});
