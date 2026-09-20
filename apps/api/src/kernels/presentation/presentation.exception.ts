import { type PresentationError } from './error.base';

export class PresentationException<
  F extends PresentationError = PresentationError,
> extends Error {
  readonly kind: F['kind'];
  readonly code: F['code'];
  readonly details: F['details'];

  constructor(error: F) {
    super(error.message);
    this.name = 'PresentationException';
    this.kind = error.kind;
    this.code = error.code;
    this.details = error.details;
  }

  static is(value: unknown): value is PresentationException {
    return value instanceof PresentationException;
  }
}
