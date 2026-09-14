import {
  DomainException,
  DOMAIN_ERROR_KIND,
  ValueObject,
} from '@kernels/domain';
import { SourceFingerprint } from './source-fingerprint.vo';
import { SourceContent } from './source-content.vo';
import { SourceSize } from './source-size.vo';
import { type SourceFrontmatter } from './source-frontmatter';

interface SourceContentSnapshotProps {
  frontmatter: SourceFrontmatter;
  title: string;
  body: string;
  fingerprint: string;
  size: number;
}

export class SourceContentSnapshot extends ValueObject<SourceContentSnapshotProps> {
  constructor(props: SourceContentSnapshotProps) {
    super(props);
  }

  static create(params: {
    frontmatter: SourceFrontmatter;
    title: string;
    body: string;
    fingerprint: string;
    size: number;
  }): SourceContentSnapshot {
    const { body, frontmatter, title, fingerprint, size } = params;
    const sourceContent = SourceContent.of(body);
    const sourceFingerprint = SourceFingerprint.of(fingerprint);

    return new SourceContentSnapshot({
      body: sourceContent.unpack(),
      frontmatter,
      title,
      fingerprint: sourceFingerprint.unpack(),
      size: SourceSize.of(size).unpack(),
    });
  }

  static restore(params: {
    frontmatter: SourceFrontmatter;
    title: string;
    body: string;
    fingerprint: string;
    size: number;
  }): SourceContentSnapshot {
    const { body, frontmatter, title, fingerprint, size } = params;
    const sourceContent = SourceContent.of(body);
    const sourceFingerprint = SourceFingerprint.of(fingerprint);
    const sourceSize = SourceSize.of(size);

    return new SourceContentSnapshot({
      body: sourceContent.unpack(),
      frontmatter,
      title,
      fingerprint: sourceFingerprint.unpack(),
      size: sourceSize.unpack(),
    });
  }

  hasSameContentAs(other: SourceContentSnapshot): boolean {
    const current = this.unpack();
    const next = other.unpack();

    return current.fingerprint === next.fingerprint;
  }

  protected validate(props: SourceContentSnapshotProps): void {
    if (props.title.trim().length === 0) {
      throw new DomainException({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'source.invalid_title',
        message: 'Source title must not be blank',
        details: { fields: ['title'] },
      });
    }
  }
}
