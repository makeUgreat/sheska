export const INFRASTRUCTURE_FAILURE_KIND = {
  // A required infrastructure dependency is not available.
  UNAVAILABLE: 'unavailable',
  // A required infrastructure dependency timed out.
  TIMEOUT: 'timeout',
  // The infrastructure operation conflicts with existing dependency state.
  CONFLICT: 'conflict',
  // Data returned from or stored in an infrastructure dependency is invalid.
  INVALID_DATA: 'invalid_data',
  // Persisted data could not be restored into the expected model.
  RESTORE_FAILED: 'restore_failed',
  // An external dependency returned a response that cannot be used.
  BAD_RESPONSE: 'bad_response',
  // The failure cannot be meaningfully classified at the infrastructure boundary.
  UNEXPECTED: 'unexpected',
} as const;

export type InfrastructureFailureKind =
  (typeof INFRASTRUCTURE_FAILURE_KIND)[keyof typeof INFRASTRUCTURE_FAILURE_KIND];

export type InfrastructureFailureCode<
  Owner extends string,
  Reason extends string,
> = `${Owner}.${Reason}`;

export interface InfrastructureFailureSource {
  readonly boundary: 'persistence';
  readonly adapter: string;
}

export type InfrastructureFailureCauseDetails = {
  readonly cause: unknown;
};

export interface InfrastructureFailureBase<
  Kind extends InfrastructureFailureKind = InfrastructureFailureKind,
  Code extends string = string,
  Details extends InfrastructureFailureCauseDetails =
    InfrastructureFailureDetailsFor<Kind>,
  Source extends InfrastructureFailureSource = InfrastructureFailureSource,
> {
  readonly kind: Kind;
  readonly code: Code;
  readonly source: Source;
  readonly message: string;
  readonly details: Details;
}

export type InfrastructureFailureOf<
  Kind extends InfrastructureFailureKind,
  Owner extends string,
  Reason extends string,
  Details extends InfrastructureFailureCauseDetails =
    InfrastructureFailureDetailsFor<Kind>,
  Source extends InfrastructureFailureSource = InfrastructureFailureSource,
> = InfrastructureFailureBase<
  Kind,
  InfrastructureFailureCode<Owner, Reason>,
  Details,
  Source
>;

export type InfrastructureInvalidDataDetails =
  InfrastructureFailureCauseDetails & {
    readonly fields: string[];
  };

export type InfrastructureFailureDetailsFor<
  Kind extends InfrastructureFailureKind,
> = Kind extends typeof INFRASTRUCTURE_FAILURE_KIND.INVALID_DATA
  ? InfrastructureInvalidDataDetails
  : InfrastructureFailureCauseDetails;
