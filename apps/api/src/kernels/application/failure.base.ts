export const APPLICATION_FAILURE_KIND = {
  VALIDATION_FAILED: 'validation_failed',
  DEPENDENCY_UNAVAILABLE: 'dependency_unavailable',
  NOT_FOUND: 'not_found',
  STATE_CONFLICT: 'state_conflict',
  PERMISSION_DENIED: 'permission_denied',
  AUTHENTICATION_REQUIRED: 'authentication_required',
  OPERATION_NOT_ALLOWED: 'operation_not_allowed',
  RATE_LIMITED: 'rate_limited',
} as const;

export type ApplicationFailureKind =
  (typeof APPLICATION_FAILURE_KIND)[keyof typeof APPLICATION_FAILURE_KIND];

export type ApplicationFailureCode<
  Owner extends string,
  Reason extends string,
> = `${Owner}.${Reason}`;

export interface ApplicationFailureBase<
  Kind extends ApplicationFailureKind = ApplicationFailureKind,
  Code extends string = string,
  Details = unknown,
> {
  readonly kind: Kind;
  readonly code: Code;
  readonly message: string;
  readonly details: Details;
}

export type ApplicationFailureOf<
  Kind extends ApplicationFailureKind,
  Owner extends string,
  Reason extends string,
  Details = ApplicationFailureDetailsFor<Kind>,
> = ApplicationFailureBase<
  Kind,
  ApplicationFailureCode<Owner, Reason>,
  Details
>;

export type ApplicationValidationFieldDetail = {
  readonly path: string;
  readonly messages: string[];
};

export type ApplicationValidationDetails = {
  readonly fields: ApplicationValidationFieldDetail[];
};

export type ApplicationFailureDetailsFor<Kind extends ApplicationFailureKind> =
  Kind extends typeof APPLICATION_FAILURE_KIND.VALIDATION_FAILED
    ? ApplicationValidationDetails
    : unknown;
