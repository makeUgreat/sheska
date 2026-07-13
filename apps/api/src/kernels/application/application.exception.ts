import { type ApplicationErrorBase } from './error.base';

export class ApplicationException<
  F extends ApplicationErrorBase = ApplicationErrorBase,
> extends Error {
  readonly error: F;
  readonly kind: F['kind'];
  readonly code: F['code'];
  readonly details: F['details'];

  constructor(error: F) {
    super(error.message);
    this.name = 'ApplicationException';
    this.error = error;
    this.kind = error.kind;
    this.code = error.code;
    this.details = error.details;
  }
}
