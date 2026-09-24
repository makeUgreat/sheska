import { ValueObject, type DomainPrimitive } from '@kernels/domain';

export class SourceContent extends ValueObject<string> {
  private constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  static of(value: string): SourceContent {
    return new SourceContent({ value });
  }

  protected validate(_props: DomainPrimitive<string>): void {}
}
