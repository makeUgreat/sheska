import { type InfrastructureErrorBase } from './error.base';

export class InfrastructureException<
  F extends InfrastructureErrorBase = InfrastructureErrorBase,
> extends Error {
  readonly kind: F['kind'];
  readonly code: F['code'];
  readonly source: F['source'];
  readonly details: F['details'];

  constructor(error: F) {
    super(error.message, { cause: error.cause });
    this.name = 'InfrastructureException';
    this.kind = error.kind;
    this.code = error.code;
    this.source = error.source;
    this.details = error.details;
  }

  static is(value: unknown): value is InfrastructureException {
    return value instanceof InfrastructureException;
  }
}
