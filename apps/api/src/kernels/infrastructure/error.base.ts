export const INFRASTRUCTURE_ERROR_KIND = {
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
  // The error cannot be meaningfully classified at the infrastructure boundary.
  UNEXPECTED: 'unexpected',
} as const;

export type InfrastructureErrorKind =
  (typeof INFRASTRUCTURE_ERROR_KIND)[keyof typeof INFRASTRUCTURE_ERROR_KIND];

export type InfrastructureErrorCode<
  Owner extends string,
  Reason extends string,
> = `${Owner}.${Reason}`;

export interface InfrastructureErrorSource {
  readonly boundary: 'persistence' | 'message-broker' | 'http-client';
  readonly adapter: string;
}

export type InfrastructureErrorCauseDetails = {
  readonly cause: unknown;
};

export interface InfrastructureErrorBase<
  Kind extends InfrastructureErrorKind = InfrastructureErrorKind,
  Code extends string = string,
  Details extends InfrastructureErrorCauseDetails =
    InfrastructureErrorDetailsFor<Kind>,
  Source extends InfrastructureErrorSource = InfrastructureErrorSource,
> {
  readonly kind: Kind;
  readonly code: Code;
  readonly source: Source;
  readonly message: string;
  readonly details: Details;
}

export type InfrastructureErrorOf<
  Kind extends InfrastructureErrorKind,
  Owner extends string,
  Reason extends string,
  Details extends InfrastructureErrorCauseDetails =
    InfrastructureErrorDetailsFor<Kind>,
  Source extends InfrastructureErrorSource = InfrastructureErrorSource,
> = InfrastructureErrorBase<
  Kind,
  InfrastructureErrorCode<Owner, Reason>,
  Details,
  Source
>;

export type InfrastructureInvalidDataDetails =
  InfrastructureErrorCauseDetails & {
    readonly fields: string[];
  };

export type InfrastructureErrorDetailsFor<
  Kind extends InfrastructureErrorKind,
> = Kind extends typeof INFRASTRUCTURE_ERROR_KIND.INVALID_DATA
  ? InfrastructureInvalidDataDetails
  : InfrastructureErrorCauseDetails;
