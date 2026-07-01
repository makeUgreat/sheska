import { type PresentationErrorBase } from './error.base';

export class PresentationException<
  F extends PresentationErrorBase = PresentationErrorBase,
> extends Error {
  readonly error: F;

  constructor(error: F) {
    super(error.message);
    this.name = 'PresentationException';
    this.error = error;
  }
}
