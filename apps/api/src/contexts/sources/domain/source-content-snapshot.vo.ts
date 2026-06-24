import { Result as ResultUtils, err, ok, type Result } from '@core/result';
import { DOMAIN_ERROR_KIND, ValueObject } from '@kernels/domain';
import { SourceFingerprint } from './source-fingerprint.vo';
import { SourceContent } from './source-content.vo';
import { type SourceContentSnapshotDomainError } from './source-content-snapshot.error';
import { SourceSize } from './source-size.vo';

interface SourceContentSnapshotProps {
  content: string;
  fingerprint: string;
  size: number;
}

export class SourceContentSnapshot extends ValueObject<SourceContentSnapshotProps> {
  private constructor(props: SourceContentSnapshotProps) {
    super(props);
  }

  static of(params: {
    content: string;
    fingerprint: string;
    size: number;
  }): Result<SourceContentSnapshot, SourceContentSnapshotDomainError> {
    const { content, fingerprint, size } = params;

    return ResultUtils.combine([
      SourceContent.of(content),
      SourceFingerprint.of(fingerprint),
      SourceSize.of(size),
    ]).andThen(([sourceContent, sourceFingerprint, sourceSize]) =>
      SourceContentSnapshot.construct({
        props: {
          content: sourceContent.value,
          fingerprint: sourceFingerprint.value,
          size: sourceSize.value,
        },
        validate: (props) => SourceContentSnapshot.validateProps(props),
      }),
    );
  }

  hasSameFingerprint(other: SourceContentSnapshot): boolean {
    return this.value.fingerprint === other.value.fingerprint;
  }

  private static validateProps(
    props: SourceContentSnapshotProps,
  ): Result<SourceContentSnapshotProps, SourceContentSnapshotDomainError> {
    const contentByteSize = new TextEncoder().encode(props.content).length;

    if (contentByteSize === props.size) {
      return ok(props);
    }

    return err({
      kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
      code: 'source.size_mismatch',
      message: 'Source size must match content byte size',
      details: { fields: ['content', 'size'] },
    } satisfies SourceContentSnapshotDomainError);
  }
}
