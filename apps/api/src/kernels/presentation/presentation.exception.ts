import { type PresentationErrorBase } from './error.base';

export class PresentationException<
  F extends PresentationErrorBase = PresentationErrorBase,
> extends Error {
  readonly error: F;
  readonly kind: F['kind'];
  readonly code: F['code'];
  readonly details: F['details'];

  constructor(error: F) {
    super(error.message);
    this.name = 'PresentationException';
    this.error = error;
    this.kind = error.kind;
    this.code = error.code;
    this.details = error.details;
  }
}
