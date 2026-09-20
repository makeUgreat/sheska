import { ERROR_KIND } from '@core/error-kind';
import { type SheskaError } from '@core/sheska-error';

export const DOMAIN_ERROR_KIND = {
  INVARIANT_VIOLATION: ERROR_KIND.INVARIANT_VIOLATION,
} as const;

export type DomainErrorKind =
  (typeof DOMAIN_ERROR_KIND)[keyof typeof DOMAIN_ERROR_KIND];

export type DomainErrorCode<
  Owner extends string,
  Reason extends string,
> = `${Owner}.${Reason}`;

export interface DomainErrorBase<
  Kind extends DomainErrorKind = DomainErrorKind,
  Code extends string = string,
  Details = unknown,
> extends SheskaError {
  readonly kind: Kind;
  readonly code: Code;
  readonly message: string;
  readonly details: Details;
}

export type DomainErrorOf<
  Kind extends DomainErrorKind,
  Owner extends string = string,
  Reason extends string = string,
  Details = DomainErrorDetailsFor<Kind>,
> = DomainErrorBase<Kind, DomainErrorCode<Owner, Reason>, Details>;

export type DomainValidationDetails = {
  readonly fields: string[];
};

export type DomainErrorDetailsFor<Kind extends DomainErrorKind> =
  Kind extends typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION
    ? DomainValidationDetails
    : unknown;

export type DomainError = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION
>;
