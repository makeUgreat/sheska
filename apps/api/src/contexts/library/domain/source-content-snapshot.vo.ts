import { InvariantViolationError } from '@core/errors';
import { ValueObject } from '@kernels/domain';
import { SourceFingerprint } from './source-fingerprint.vo';
import { SourceSize } from './source-size.vo';
import {
  SourceFrontmatter,
  type SourceFrontmatterProps,
} from './source-frontmatter.vo';

interface SourceContentSnapshotProps {
  frontmatter: SourceFrontmatter;
  title: string;
  body: string;
  fingerprint: SourceFingerprint;
  size: SourceSize;
}

interface RawSourceContentSnapshot {
  frontmatter: SourceFrontmatterProps;
  title: string;
  body: string;
  fingerprint: string;
  size: number;
}

export class SourceContentSnapshot extends ValueObject<SourceContentSnapshotProps> {
  private constructor(props: SourceContentSnapshotProps) {
    super(props);
  }

  static of(value: RawSourceContentSnapshot): SourceContentSnapshot {
    const { body, frontmatter, title, fingerprint, size } = value;

    return new SourceContentSnapshot({
      body,
      frontmatter: SourceFrontmatter.of(frontmatter),
      title,
      fingerprint: SourceFingerprint.of(fingerprint),
      size: SourceSize.of(size),
    });
  }

  hasSameContentAs(other: SourceContentSnapshot): boolean {
    return this.props.fingerprint.equals(other.props.fingerprint);
  }

  protected validate(props: SourceContentSnapshotProps): void {
    if (props.title.trim().length === 0) {
      throw new InvariantViolationError({
        code: 'source.invalid_title',
        message: 'Source title must not be blank',
        details: { fields: ['title'] },
      });
    }
  }
}
