import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { type Response } from 'express';
import { ERROR_KIND, type ErrorKind } from '@core/error-kind';
import { isSheskaError, type SheskaError } from '@core/sheska-error';
import { LOGGER, type LoggerPort } from '@kernels/application';
import { type HttpFailure } from '@kernels/presentation';

const FAILURE_LOG_MESSAGE = 'HTTP request failed';

const SERVER_ERROR_STATUS_FLOOR: number = HttpStatus.INTERNAL_SERVER_ERROR;

type FailureExposure = 'with_details' | 'code_only' | 'masked';

type FailureLogLevel = 'error' | 'warn' | null;

interface HttpFailurePolicy {
  readonly status: number;
  readonly exposure: FailureExposure;
  readonly logLevel: FailureLogLevel;
}

const ERROR_KIND_POLICY: Record<ErrorKind, HttpFailurePolicy> = {
  [ERROR_KIND.VALIDATION_FAILED]: {
    status: HttpStatus.BAD_REQUEST,
    exposure: 'with_details',
    logLevel: null,
  },
  [ERROR_KIND.AUTHENTICATION_REQUIRED]: {
    status: HttpStatus.UNAUTHORIZED,
    exposure: 'code_only',
    logLevel: null,
  },
  [ERROR_KIND.PERMISSION_DENIED]: {
    status: HttpStatus.FORBIDDEN,
    exposure: 'code_only',
    logLevel: null,
  },
  [ERROR_KIND.NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    exposure: 'code_only',
    logLevel: null,
  },
  [ERROR_KIND.STATE_CONFLICT]: {
    status: HttpStatus.CONFLICT,
    exposure: 'code_only',
    logLevel: null,
  },
  [ERROR_KIND.CONSTRAINT_VIOLATION]: {
    status: HttpStatus.CONFLICT,
    exposure: 'code_only',
    logLevel: null,
  },
  [ERROR_KIND.CONCURRENCY_CONFLICT]: {
    status: HttpStatus.CONFLICT,
    exposure: 'code_only',
    logLevel: 'warn',
  },
  [ERROR_KIND.OPERATION_NOT_ALLOWED]: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    exposure: 'code_only',
    logLevel: null,
  },
  [ERROR_KIND.RATE_LIMITED]: {
    status: HttpStatus.TOO_MANY_REQUESTS,
    exposure: 'code_only',
    logLevel: null,
  },
  [ERROR_KIND.INVARIANT_VIOLATION]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    exposure: 'masked',
    logLevel: 'error',
  },
  [ERROR_KIND.INVALID_DATA]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    exposure: 'masked',
    logLevel: 'error',
  },
  [ERROR_KIND.RESTORE_FAILED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    exposure: 'masked',
    logLevel: 'error',
  },
  [ERROR_KIND.BAD_RESPONSE]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    exposure: 'masked',
    logLevel: 'error',
  },
  [ERROR_KIND.UNEXPECTED]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    exposure: 'masked',
    logLevel: 'error',
  },
  [ERROR_KIND.DEPENDENCY_UNAVAILABLE]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    exposure: 'code_only',
    logLevel: 'error',
  },
  [ERROR_KIND.UNAVAILABLE]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    exposure: 'masked',
    logLevel: 'error',
  },
  [ERROR_KIND.TIMEOUT]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    exposure: 'masked',
    logLevel: 'error',
  },
};

const UNKNOWN_KIND_POLICY: HttpFailurePolicy = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  exposure: 'masked',
  logLevel: 'error',
};

const INTERNAL_ERROR_RESPONSE = {
  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  code: 'internal.unexpected',
  message: 'Internal server error',
  details: {},
} satisfies HttpFailure<'internal.unexpected', Record<string, never>>;

const UNAVAILABLE_ERROR_RESPONSE = {
  statusCode: HttpStatus.SERVICE_UNAVAILABLE,
  code: 'internal.unavailable',
  message: 'Service temporarily unavailable',
  details: {},
} satisfies HttpFailure<'internal.unavailable', Record<string, never>>;

const MASKED_RESPONSE_BY_STATUS: Partial<Record<number, HttpFailure>> = {
  [HttpStatus.INTERNAL_SERVER_ERROR]: INTERNAL_ERROR_RESPONSE,
  [HttpStatus.SERVICE_UNAVAILABLE]: UNAVAILABLE_ERROR_RESPONSE,
};

interface ResolvedFailure {
  readonly failure: HttpFailure;
  readonly logLevel: FailureLogLevel;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: LoggerPort) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { failure, logLevel } = resolveFailure(exception);

    if (logLevel === 'error') {
      this.logger.error(FAILURE_LOG_MESSAGE, exception);
    } else if (logLevel === 'warn') {
      this.logger.warn(FAILURE_LOG_MESSAGE, exception);
    }

    if (isServerError(failure.statusCode)) {
      response.err = toError(exception);
    }

    response.status(failure.statusCode).json(failure);
  }
}

function resolveFailure(exception: unknown): ResolvedFailure {
  if (exception instanceof HttpException) {
    const failure = toHttpExceptionFailure(exception);
    return {
      failure,
      logLevel: isServerError(failure.statusCode) ? 'error' : null,
    };
  }

  if (isSheskaError(exception)) {
    const policy = policyForKind(exception.kind);
    return {
      failure: toSheskaFailure(exception, policy),
      logLevel: policy.logLevel,
    };
  }

  return { failure: INTERNAL_ERROR_RESPONSE, logLevel: 'error' };
}

function toHttpExceptionFailure(exception: HttpException): HttpFailure {
  const body = exception.getResponse();
  const status = exception.getStatus();

  if (isHttpFailure(body)) {
    return { ...body, statusCode: status };
  }

  if (isServerError(status)) {
    return maskedResponse(status);
  }

  return {
    statusCode: status,
    code: `http.${status}`,
    message: exception.message,
    details: {},
  };
}

function toSheskaFailure(
  error: Error & SheskaError,
  policy: HttpFailurePolicy,
): HttpFailure {
  if (policy.exposure === 'masked') {
    return maskedResponse(policy.status);
  }

  return {
    statusCode: policy.status,
    code: error.code,
    message: error.message,
    details: policy.exposure === 'with_details' ? (error.details ?? {}) : {},
  };
}

function policyForKind(kind: string): HttpFailurePolicy {
  const policies: Partial<Record<string, HttpFailurePolicy>> =
    ERROR_KIND_POLICY;

  return policies[kind] ?? UNKNOWN_KIND_POLICY;
}

function maskedResponse(status: number): HttpFailure {
  return (
    MASKED_RESPONSE_BY_STATUS[status] ?? {
      ...INTERNAL_ERROR_RESPONSE,
      statusCode: status,
    }
  );
}

function isServerError(status: number): boolean {
  return status >= SERVER_ERROR_STATUS_FLOOR;
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
