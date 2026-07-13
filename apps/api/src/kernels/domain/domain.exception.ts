import { type DomainErrorBase } from './error.base';

export class DomainException<
  F extends DomainErrorBase = DomainErrorBase,
> extends Error {
  readonly error: F;
  readonly kind: F['kind'];
  readonly code: F['code'];
  readonly details: F['details'];

  constructor(error: F) {
    super(error.message);
    this.name = 'DomainException';
    this.error = error;
    this.kind = error.kind;
    this.code = error.code;
    this.details = error.details;
  }
}
