import { ERROR_KIND } from '@core/error-kind';
import { type SheskaError } from '@core/sheska-error';

export const APPLICATION_ERROR_KIND = {
  VALIDATION_FAILED: ERROR_KIND.VALIDATION_FAILED,
  DEPENDENCY_UNAVAILABLE: ERROR_KIND.DEPENDENCY_UNAVAILABLE,
  NOT_FOUND: ERROR_KIND.NOT_FOUND,
  STATE_CONFLICT: ERROR_KIND.STATE_CONFLICT,
  PERMISSION_DENIED: ERROR_KIND.PERMISSION_DENIED,
  AUTHENTICATION_REQUIRED: ERROR_KIND.AUTHENTICATION_REQUIRED,
  OPERATION_NOT_ALLOWED: ERROR_KIND.OPERATION_NOT_ALLOWED,
  RATE_LIMITED: ERROR_KIND.RATE_LIMITED,
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
> extends SheskaError {
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

export type ApplicationError =
  | ApplicationErrorOf<
      typeof APPLICATION_ERROR_KIND.VALIDATION_FAILED,
      string,
      string,
      ApplicationValidationDetails
    >
  | ApplicationErrorOf<
      Exclude<
        ApplicationErrorKind,
        typeof APPLICATION_ERROR_KIND.VALIDATION_FAILED
      >,
      string,
      string,
      unknown
    >;
