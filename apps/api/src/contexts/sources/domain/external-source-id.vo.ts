import { ValueObject, type DomainPrimitive } from '@kernels/domain';

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
      throw new Error('External source id cannot be empty');
    }
  }

  private static isEmpty(props: DomainPrimitive<string>): boolean {
    return props.value.length === 0;
  }
}
