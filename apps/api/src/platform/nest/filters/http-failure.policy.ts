import { HttpStatus } from '@nestjs/common';
import { ERROR_KIND, type ErrorKind } from '@core/errors';

type FailureExposure = 'with_details' | 'code_only' | 'masked';

export type FailureLogLevel = 'error' | 'warn' | null;

export interface HttpFailurePolicy {
  readonly status: number;
  readonly exposure: FailureExposure;
  readonly logLevel: FailureLogLevel;
}

export const ERROR_KIND_POLICY: Record<ErrorKind, HttpFailurePolicy> = {
  [ERROR_KIND.VALIDATION_FAILED]: {
    status: HttpStatus.BAD_REQUEST,
    exposure: 'with_details',
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

export function exposesCode(kind: ErrorKind): boolean {
  return ERROR_KIND_POLICY[kind].exposure !== 'masked';
}
