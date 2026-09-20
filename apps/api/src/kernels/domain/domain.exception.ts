import { type DomainError } from './error.base';

export class DomainException<
  F extends DomainError = DomainError,
> extends Error {
  readonly kind: F['kind'];
  readonly code: F['code'];
  readonly details: F['details'];

  constructor(error: F) {
    super(error.message);
    this.name = 'DomainException';
    this.kind = error.kind;
    this.code = error.code;
    this.details = error.details;
  }
}
