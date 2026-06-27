import { ok, type Result } from '@core/result';
import { ValueObject, type DomainPrimitive } from '@kernels/domain';

export class SourceContent extends ValueObject<string> {
  private constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  static of(value: string): Result<SourceContent, never> {
    return SourceContent.construct({
      props: { value },
      validate: (props) => SourceContent.validateProps(props),
    });
  }

  get byteSize(): number {
    return new TextEncoder().encode(this.value).length;
  }

  hasByteSize(size: number): boolean {
    return this.byteSize === size;
  }

  private static validateProps(
    props: DomainPrimitive<string>,
  ): Result<DomainPrimitive<string>, never> {
    return ok(props);
  }
}
