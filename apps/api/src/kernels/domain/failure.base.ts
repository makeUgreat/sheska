export const DOMAIN_FAILURE_KIND = {
  INVARIANT_VIOLATION: 'invariant_violation',
  STATE_CONFLICT: 'state_conflict',
  OPERATION_NOT_ALLOWED: 'operation_not_allowed',
} as const;

export type DomainFailureKind =
  (typeof DOMAIN_FAILURE_KIND)[keyof typeof DOMAIN_FAILURE_KIND];

export type DomainFailureCode<
  Owner extends string,
  Reason extends string,
> = `${Owner}.${Reason}`;

export interface DomainFailureBase<
  Kind extends DomainFailureKind = DomainFailureKind,
  Code extends string = string,
  Details = unknown,
> {
  readonly kind: Kind;
  readonly code: Code;
  readonly message: string;
  readonly details: Details;
}

export type DomainFailureOf<
  Kind extends DomainFailureKind,
  Owner extends string = string,
  Reason extends string = string,
  Details = DomainFailureDetailsFor<Kind>,
> = DomainFailureBase<Kind, DomainFailureCode<Owner, Reason>, Details>;

export type DomainValidationDetails = {
  readonly fields: string[];
};

export type DomainFailureDetailsFor<Kind extends DomainFailureKind> =
  Kind extends typeof DOMAIN_FAILURE_KIND.INVARIANT_VIOLATION
    ? DomainValidationDetails
    : unknown;

export type DomainFailure =
  | DomainFailureOf<typeof DOMAIN_FAILURE_KIND.INVARIANT_VIOLATION>
  | DomainFailureOf<typeof DOMAIN_FAILURE_KIND.STATE_CONFLICT>
  | DomainFailureOf<typeof DOMAIN_FAILURE_KIND.OPERATION_NOT_ALLOWED>;
