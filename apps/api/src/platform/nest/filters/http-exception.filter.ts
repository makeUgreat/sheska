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
  CommonErrorCode,
  errorResponseSchema,
  type ErrorResponse,
} from '@sheska/contract';
import { SheskaError } from '@core/errors';
import { LOGGER, type LoggerPort } from '@kernels/application';
import {
  ERROR_KIND_POLICY,
  type FailureLogLevel,
  type HttpFailurePolicy,
} from './http-failure.policy';

const FAILURE_LOG_MESSAGE = 'HTTP request failed';

const SERVER_ERROR_STATUS_FLOOR: number = HttpStatus.INTERNAL_SERVER_ERROR;

const INTERNAL_ERROR_RESPONSE = {
  code: CommonErrorCode.INTERNAL_UNEXPECTED,
  message: 'Internal server error',
  details: {},
} satisfies ErrorResponse;

const UNAVAILABLE_ERROR_RESPONSE = {
  code: CommonErrorCode.INTERNAL_UNAVAILABLE,
  message: 'Service temporarily unavailable',
  details: {},
} satisfies ErrorResponse;

const MASKED_RESPONSE_BY_STATUS: Partial<Record<number, ErrorResponse>> = {
  [HttpStatus.INTERNAL_SERVER_ERROR]: INTERNAL_ERROR_RESPONSE,
  [HttpStatus.SERVICE_UNAVAILABLE]: UNAVAILABLE_ERROR_RESPONSE,
};

interface ResolvedFailure {
  readonly status: number;
  readonly body: ErrorResponse;
  readonly logLevel: FailureLogLevel;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: LoggerPort) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body, logLevel } = resolveFailure(exception);

    if (logLevel === 'error') {
      this.logger.error(FAILURE_LOG_MESSAGE, exception);
    } else if (logLevel === 'warn') {
      this.logger.warn(FAILURE_LOG_MESSAGE, exception);
    }

    if (isServerError(status)) {
      response.err = toError(exception);
    }

    response.status(status).json(body);
  }
}

function resolveFailure(exception: unknown): ResolvedFailure {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return {
      status,
      body: toHttpExceptionBody(exception, status),
      logLevel: isServerError(status) ? 'error' : null,
    };
  }

  if (exception instanceof SheskaError) {
    const policy = ERROR_KIND_POLICY[exception.kind];
    return {
      status: policy.status,
      body: toSheskaErrorBody(exception, policy),
      logLevel: policy.logLevel,
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: INTERNAL_ERROR_RESPONSE,
    logLevel: 'error',
  };
}

function toHttpExceptionBody(
  exception: HttpException,
  status: number,
): ErrorResponse {
  const owned = errorResponseSchema.safeParse(exception.getResponse());

  if (owned.success) {
    return owned.data;
  }

  if (isServerError(status)) {
    return maskedResponse(status);
  }

  return {
    code: `http.${status}`,
    message: exception.message,
    details: {},
  };
}

function toSheskaErrorBody(
  error: SheskaError,
  policy: HttpFailurePolicy,
): ErrorResponse {
  if (policy.exposure === 'masked') {
    return maskedResponse(policy.status);
  }

  return {
    code: error.code,
    message: error.message,
    details: policy.exposure === 'with_details' ? toDetails(error.details) : {},
  };
}

function toDetails(details: unknown): ErrorResponse['details'] {
  return typeof details === 'object' && details !== null
    ? (details as ErrorResponse['details'])
    : {};
}

function maskedResponse(status: number): ErrorResponse {
  return MASKED_RESPONSE_BY_STATUS[status] ?? INTERNAL_ERROR_RESPONSE;
}

function isServerError(status: number): boolean {
  return status >= SERVER_ERROR_STATUS_FLOOR;
}

function toError(exception: unknown): Error {
  return exception instanceof Error ? exception : new Error(String(exception));
}
