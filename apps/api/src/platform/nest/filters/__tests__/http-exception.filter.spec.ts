import { HttpException, HttpStatus, type ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  ApplicationException,
  APPLICATION_ERROR_KIND,
  type ApplicationErrorOf,
  type ApplicationValidationDetails,
} from '@kernels/application';
import {
  DomainException,
  DOMAIN_ERROR_KIND,
  type LoggerPort,
} from '@kernels/domain';
import {
  PresentationException,
  PRESENTATION_ERROR_KIND,
} from '@kernels/presentation';
import {
  InfrastructureException,
  INFRASTRUCTURE_ERROR_KIND,
} from '@kernels/infrastructure';
import { HttpExceptionFilter } from '../http-exception.filter';

function buildMockHost(): {
  host: ArgumentsHost;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
} {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: vi.fn().mockReturnValue({
      getResponse: vi.fn().mockReturnValue({ status }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

function buildMockLogger() {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  } satisfies LoggerPort;
}

describe('HttpExceptionFilter', () => {
  describe('PresentationException', () => {
    it('validation_failed → 400으로 응답한다', () => {
      const { host, status } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(
        new PresentationException({
          kind: PRESENTATION_ERROR_KIND.VALIDATION_FAILED,
          code: 'request.validation_failed',
          message: 'Invalid request',
          details: { fields: [] },
        }),
        host,
      );

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('error.code를 응답 body의 code로 사용한다', () => {
      const { host, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(
        new PresentationException({
          kind: PRESENTATION_ERROR_KIND.VALIDATION_FAILED,
          code: 'request.validation_failed',
          message: 'Invalid request',
          details: { fields: [{ path: 'name', messages: ['required'] }] },
        }),
        host,
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'request.validation_failed' }),
      );
    });

    it('details를 변환 없이 응답 body의 details로 사용한다', () => {
      const { host, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());
      const validationDetails = {
        fields: [{ path: 'name', messages: ['필수 항목입니다'] }],
      };

      filter.catch(
        new PresentationException({
          kind: PRESENTATION_ERROR_KIND.VALIDATION_FAILED,
          code: 'request.invalid',
          message: 'Invalid request',
          details: validationDetails,
        }),
        host,
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ details: validationDetails }),
      );
    });
  });

  describe('ApplicationException', () => {
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
    ] as const)('%s → %i 로 응답한다', (kind, expectedStatus) => {
      const { host, status } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(
        new ApplicationException({
          kind,
          code: 'test.error',
          message: 'test',
          details: undefined,
        }),
        host,
      );

      expect(status).toHaveBeenCalledWith(expectedStatus);
    });

    it('error.code를 응답 body의 code로 사용한다', () => {
      const { host, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());
      const error: ApplicationErrorOf<
        typeof APPLICATION_ERROR_KIND.NOT_FOUND,
        'source',
        'not_found'
      > = {
        kind: APPLICATION_ERROR_KIND.NOT_FOUND,
        code: 'source.not_found',
        message: 'Source not found',
        details: undefined,
      };

      filter.catch(new ApplicationException(error), host);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'source.not_found' }),
      );
    });

    it('statusCode를 응답 body에 포함한다', () => {
      const { host, json } = buildMockHost();
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

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: HttpStatus.NOT_FOUND }),
      );
    });

    it('error.details를 변환 없이 응답 body의 details로 사용한다', () => {
      const { host, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());
      const validationDetails: ApplicationValidationDetails = {
        fields: [{ path: 'name', messages: ['필수 항목입니다'] }],
      };
      const error: ApplicationErrorOf<
        typeof APPLICATION_ERROR_KIND.VALIDATION_FAILED,
        'source',
        'invalid'
      > = {
        kind: APPLICATION_ERROR_KIND.VALIDATION_FAILED,
        code: 'source.invalid',
        message: 'Invalid source',
        details: validationDetails,
      };

      filter.catch(new ApplicationException(error), host);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ details: validationDetails }),
      );
    });
  });

  describe('HttpException', () => {
    describe('응답이 이미 HttpErrorEnvelope shape인 경우', () => {
      it('응답 body를 그대로 사용한다', () => {
        const { host, json } = buildMockHost();
        const filter = new HttpExceptionFilter(buildMockLogger());
        const errorResponse = {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'custom.error',
          message: 'Custom error',
          details: {},
        };

        filter.catch(
          new HttpException(errorResponse, HttpStatus.BAD_REQUEST),
          host,
        );

        expect(json).toHaveBeenCalledWith(errorResponse);
      });

      it('HttpException의 status를 응답 status로 사용한다', () => {
        const { host, status } = buildMockHost();
        const filter = new HttpExceptionFilter(buildMockLogger());
        const errorResponse = {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'custom.error',
          message: 'Custom error',
          details: {},
        };

        filter.catch(
          new HttpException(errorResponse, HttpStatus.BAD_REQUEST),
          host,
        );

        expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      });
    });

    describe('응답이 HttpErrorEnvelope shape이 아닌 경우', () => {
      it('500으로 마스킹한다', () => {
        const { host, status } = buildMockHost();
        const filter = new HttpExceptionFilter(buildMockLogger());

        filter.catch(
          new HttpException('Not Found', HttpStatus.NOT_FOUND),
          host,
        );

        expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      });

      it('internal.unexpected code로 마스킹한다', () => {
        const { host, json } = buildMockHost();
        const filter = new HttpExceptionFilter(buildMockLogger());

        filter.catch(
          new HttpException('Forbidden', HttpStatus.FORBIDDEN),
          host,
        );

        expect(json).toHaveBeenCalledWith(
          expect.objectContaining({ code: 'internal.unexpected' }),
        );
      });
    });
  });

  describe('InfrastructureException', () => {
    it.each([
      [INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE],
      [INFRASTRUCTURE_ERROR_KIND.TIMEOUT, HttpStatus.SERVICE_UNAVAILABLE],
      [INFRASTRUCTURE_ERROR_KIND.CONFLICT, HttpStatus.CONFLICT],
      [
        INFRASTRUCTURE_ERROR_KIND.RESTORE_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      ],
      [
        INFRASTRUCTURE_ERROR_KIND.INVALID_DATA,
        HttpStatus.INTERNAL_SERVER_ERROR,
      ],
      [
        INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      ],
      [INFRASTRUCTURE_ERROR_KIND.UNEXPECTED, HttpStatus.INTERNAL_SERVER_ERROR],
    ] as const)('%s → %i 로 응답한다', (kind, expectedStatus) => {
      const { host, status } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(
        new InfrastructureException({
          kind,
          code: 'test.error',
          source: { boundary: 'persistence', adapter: 'test.drizzle' },
          message: 'test',
          details: {},
          cause: new Error('raw db error'),
        }),
        host,
      );

      expect(status).toHaveBeenCalledWith(expectedStatus);
    });

    it('details를 빈 객체로 마스킹한다', () => {
      const { host, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(
        new InfrastructureException({
          kind: INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
          code: 'source.find_failed',
          source: { boundary: 'persistence', adapter: 'source.drizzle' },
          message: 'Source find operation failed',
          details: {},
          cause: new Error('connection refused'),
        }),
        host,
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ details: {} }),
      );
    });

    it('error.code를 응답 body의 code로 사용한다', () => {
      const { host, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(
        new InfrastructureException({
          kind: INFRASTRUCTURE_ERROR_KIND.CONFLICT,
          code: 'source.save_failed',
          source: { boundary: 'persistence', adapter: 'source.drizzle' },
          message: 'Source save operation failed',
          details: {},
          cause: new Error('unique violation'),
        }),
        host,
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'source.save_failed' }),
      );
    });

    it('statusCode를 응답 body에 포함한다', () => {
      const { host, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(
        new InfrastructureException({
          kind: INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
          code: 'source.find_failed',
          source: { boundary: 'persistence', adapter: 'source.drizzle' },
          message: 'Source find operation failed',
          details: {},
          cause: new Error('connection refused'),
        }),
        host,
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: HttpStatus.SERVICE_UNAVAILABLE }),
      );
    });
  });

  describe('알 수 없는 예외', () => {
    it('500으로 응답한다', () => {
      const { host, status } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(new Error('unexpected'), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('internal.unexpected code로 마스킹한다', () => {
      const { host, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(new Error('unexpected'), host);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'internal.unexpected' }),
      );
    });

    it('DomainException은 500으로 마스킹한다', () => {
      const { host, status, json } = buildMockHost();
      const filter = new HttpExceptionFilter(buildMockLogger());

      filter.catch(
        new DomainException({
          kind: DOMAIN_ERROR_KIND.STATE_CONFLICT,
          code: 'source.conflict',
          message: 'State conflict',
          details: undefined,
        }),
        host,
      );

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'internal.unexpected' }),
      );
    });

    it('error 레벨로 로그를 남긴다', () => {
      const { host } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);

      filter.catch(new Error('unexpected'), host);

      expect(logger.error).toHaveBeenCalledOnce();
    });
  });

  describe('로깅', () => {
    it('InfrastructureException은 error 레벨로 로그를 남긴다', () => {
      const { host } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);

      filter.catch(
        new InfrastructureException({
          kind: INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
          code: 'source.find_failed',
          source: { boundary: 'persistence', adapter: 'source.drizzle' },
          message: 'Source find operation failed',
          details: {},
          cause: new Error('connection refused'),
        }),
        host,
      );

      expect(logger.error).toHaveBeenCalledOnce();
    });

    it('ApplicationException은 로그를 남기지 않는다', () => {
      const { host } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);

      filter.catch(
        new ApplicationException({
          kind: APPLICATION_ERROR_KIND.NOT_FOUND,
          code: 'source.not_found',
          message: 'Source not found',
          details: undefined,
        }),
        host,
      );

      expect(logger.error).not.toHaveBeenCalled();
    });

    it('PresentationException은 로그를 남기지 않는다', () => {
      const { host } = buildMockHost();
      const logger = buildMockLogger();
      const filter = new HttpExceptionFilter(logger);

      filter.catch(
        new PresentationException({
          kind: PRESENTATION_ERROR_KIND.VALIDATION_FAILED,
          code: 'request.validation_failed',
          message: 'Invalid request',
          details: { fields: [] },
        }),
        host,
      );

      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
