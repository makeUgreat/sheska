import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { type Response } from 'express';
import {
  PresentationException,
  PRESENTATION_ERROR_KIND,
  type PresentationErrorKind,
  type HttpFailure,
} from '@kernels/presentation';
import {
  ApplicationException,
  APPLICATION_ERROR_KIND,
  type ApplicationErrorKind,
  LOGGER,
  type LoggerPort,
} from '@kernels/application';
import {
  InfrastructureException,
  INFRASTRUCTURE_ERROR_KIND,
  type InfrastructureErrorKind,
} from '@kernels/infrastructure';

const INTERNAL_ERROR_RESPONSE = {
  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  code: 'internal.unexpected',
  message: 'Internal server error',
  details: {},
} satisfies HttpFailure<'internal.unexpected', Record<string, never>>;

const PRESENTATION_KIND_TO_HTTP_STATUS: Record<PresentationErrorKind, number> =
  {
    [PRESENTATION_ERROR_KIND.VALIDATION_FAILED]: HttpStatus.BAD_REQUEST,
  };

const INFRASTRUCTURE_KIND_TO_HTTP_STATUS: Record<
  InfrastructureErrorKind,
  number
> = {
  [INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
  [INFRASTRUCTURE_ERROR_KIND.TIMEOUT]: HttpStatus.SERVICE_UNAVAILABLE,
  [INFRASTRUCTURE_ERROR_KIND.CONFLICT]: HttpStatus.CONFLICT,
  [INFRASTRUCTURE_ERROR_KIND.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [INFRASTRUCTURE_ERROR_KIND.INVALID_DATA]: HttpStatus.INTERNAL_SERVER_ERROR,
  [INFRASTRUCTURE_ERROR_KIND.RESTORE_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE]: HttpStatus.INTERNAL_SERVER_ERROR,
  [INFRASTRUCTURE_ERROR_KIND.UNEXPECTED]: HttpStatus.INTERNAL_SERVER_ERROR,
};

const APPLICATION_KIND_TO_HTTP_STATUS: Record<ApplicationErrorKind, number> = {
  [APPLICATION_ERROR_KIND.VALIDATION_FAILED]: HttpStatus.BAD_REQUEST,
  [APPLICATION_ERROR_KIND.AUTHENTICATION_REQUIRED]: HttpStatus.UNAUTHORIZED,
  [APPLICATION_ERROR_KIND.PERMISSION_DENIED]: HttpStatus.FORBIDDEN,
  [APPLICATION_ERROR_KIND.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [APPLICATION_ERROR_KIND.STATE_CONFLICT]: HttpStatus.CONFLICT,
  [APPLICATION_ERROR_KIND.OPERATION_NOT_ALLOWED]:
    HttpStatus.UNPROCESSABLE_ENTITY,
  [APPLICATION_ERROR_KIND.RATE_LIMITED]: HttpStatus.TOO_MANY_REQUESTS,
  [APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE]:
    HttpStatus.SERVICE_UNAVAILABLE,
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: LoggerPort) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (isHttpFailure(exceptionResponse)) {
        response.status(exception.getStatus()).json(exceptionResponse);
        return;
      }
    }

    if (PresentationException.is(exception)) {
      const errorResponse = this.toPresentationErrorResponse(exception);
      response.status(errorResponse.statusCode).json(errorResponse);
      return;
    }

    if (ApplicationException.is(exception)) {
      const errorResponse = this.toApplicationErrorResponse(exception);
      response.status(errorResponse.statusCode).json(errorResponse);
      return;
    }

    if (InfrastructureException.is(exception)) {
      const errorResponse = this.toInfrastructureErrorResponse(exception);
      this.logger.error('Infrastructure failure', exception);
      response.err = exception;
      response.status(errorResponse.statusCode).json(errorResponse);
      return;
    }

    this.logger.error('Unexpected system error', exception);
    response.err = toError(exception);
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(INTERNAL_ERROR_RESPONSE);
  }

  private toPresentationErrorResponse(
    exception: PresentationException,
  ): HttpFailure {
    return {
      statusCode: PRESENTATION_KIND_TO_HTTP_STATUS[exception.kind],
      code: exception.code,
      message: exception.message,
      details: exception.details,
    };
  }

  private toApplicationErrorResponse(
    exception: ApplicationException,
  ): HttpFailure {
    return {
      statusCode: APPLICATION_KIND_TO_HTTP_STATUS[exception.kind],
      code: exception.code,
      message: exception.message,
      details: exception.details,
    };
  }

  private toInfrastructureErrorResponse(
    exception: InfrastructureException,
  ): HttpFailure {
    return {
      statusCode: INFRASTRUCTURE_KIND_TO_HTTP_STATUS[exception.kind],
      code: exception.code,
      message: exception.message,
      details: {},
    };
  }
}

function toError(exception: unknown): Error {
  return exception instanceof Error ? exception : new Error(String(exception));
}

function isHttpFailure(value: unknown): value is HttpFailure {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<HttpFailure>;

  return (
    typeof candidate.statusCode === 'number' &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.details === 'object' &&
    candidate.details !== null
  );
}
