import {
  DomainException,
  DOMAIN_ERROR_KIND,
  ValueObject,
  type DomainPrimitive,
} from '@kernels/domain';

export class ExternalSourceId extends ValueObject<string> {
  constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  static of(value: string): ExternalSourceId {
    const props = { value: value.trim() };

    return new ExternalSourceId(props);
  }

  protected validate(props: DomainPrimitive<string>): void {
    if (ExternalSourceId.isEmpty(props)) {
      throw new DomainException({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'source.empty_external_source_id',
        message: 'External source id cannot be empty',
        details: { fields: ['externalSourceId'] },
      });
    }
  }

  private static isEmpty(props: DomainPrimitive<string>): boolean {
    return props.value.length === 0;
  }
}
