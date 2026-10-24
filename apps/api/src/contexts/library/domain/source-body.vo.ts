import { ValueObject } from '@kernels/domain';
import { SourceFingerprint } from './source-fingerprint.vo';

interface SourceBodyProps {
  text: string;
  fingerprint: SourceFingerprint;
}

export class SourceBody extends ValueObject<SourceBodyProps> {
  private constructor(props: SourceBodyProps) {
    super(props);
  }

  static of(text: string): SourceBody {
    return new SourceBody({
      text,
      fingerprint: SourceFingerprint.ofBody(text),
    });
  }

  static restore(value: { text: string; fingerprint: string }): SourceBody {
    return new SourceBody({
      text: value.text,
      fingerprint: SourceFingerprint.of(value.fingerprint),
    });
  }

  hasSameTextAs(other: SourceBody): boolean {
    return this.props.fingerprint.equals(other.props.fingerprint);
  }

  protected validate(): void {}
}
