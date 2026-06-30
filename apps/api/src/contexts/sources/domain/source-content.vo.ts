import { ValueObject, type DomainPrimitive } from '@kernels/domain';

export class SourceContent extends ValueObject<string> {
  constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  static of(value: string): SourceContent {
    return new SourceContent({ value });
  }

  get byteSize(): number {
    return new TextEncoder().encode(this.unpack()).length;
  }

  hasByteSize(size: number): boolean {
    return this.byteSize === size;
  }

  protected validate(_props: DomainPrimitive<string>): void {}
}
