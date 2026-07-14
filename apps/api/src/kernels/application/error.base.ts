import { type BaseError } from '@core/base-error';

export const APPLICATION_ERROR_KIND = {
  VALIDATION_FAILED: 'validation_failed',
  DEPENDENCY_UNAVAILABLE: 'dependency_unavailable',
  NOT_FOUND: 'not_found',
  STATE_CONFLICT: 'state_conflict',
  PERMISSION_DENIED: 'permission_denied',
  AUTHENTICATION_REQUIRED: 'authentication_required',
  OPERATION_NOT_ALLOWED: 'operation_not_allowed',
  RATE_LIMITED: 'rate_limited',
} as const;

export type ApplicationErrorKind =
  (typeof APPLICATION_ERROR_KIND)[keyof typeof APPLICATION_ERROR_KIND];

export type ApplicationErrorCode<
  Owner extends string,
  Reason extends string,
> = `${Owner}.${Reason}`;

export interface ApplicationErrorBase<
  Kind extends ApplicationErrorKind = ApplicationErrorKind,
  Code extends string = string,
  Details = unknown,
> extends BaseError {
  readonly kind: Kind;
  readonly code: Code;
  readonly message: string;
  readonly details: Details;
}

export type ApplicationErrorOf<
  Kind extends ApplicationErrorKind,
  Owner extends string,
  Reason extends string,
  Details = ApplicationErrorDetailsFor<Kind>,
> = ApplicationErrorBase<Kind, ApplicationErrorCode<Owner, Reason>, Details>;

export type ApplicationValidationFieldDetail = {
  readonly path: string;
  readonly messages: string[];
};

export type ApplicationValidationDetails = {
  readonly fields: ApplicationValidationFieldDetail[];
};

export type ApplicationErrorDetailsFor<Kind extends ApplicationErrorKind> =
  Kind extends typeof APPLICATION_ERROR_KIND.VALIDATION_FAILED
    ? ApplicationValidationDetails
    : unknown;
