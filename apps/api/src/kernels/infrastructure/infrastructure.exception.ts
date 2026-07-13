import { type InfrastructureErrorBase } from './error.base';

export class InfrastructureException<
  F extends InfrastructureErrorBase = InfrastructureErrorBase,
> extends Error {
  readonly error: F;
  readonly kind: F['kind'];
  readonly code: F['code'];
  readonly source: F['source'];
  readonly details: F['details'];

  constructor(error: F) {
    super(error.message);
    this.name = 'InfrastructureException';
    this.error = error;
    this.kind = error.kind;
    this.code = error.code;
    this.source = error.source;
    this.details = error.details;
  }
}
