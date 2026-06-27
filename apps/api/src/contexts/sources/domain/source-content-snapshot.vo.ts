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

  static create(params: {
    content: string;
    fingerprint: string;
  }): Result<SourceContentSnapshot, SourceContentSnapshotDomainError> {
    const { content, fingerprint } = params;

    return ResultUtils.combine([
      SourceContent.of(content),
      SourceFingerprint.of(fingerprint),
    ]).andThen(([sourceContent, sourceFingerprint]) =>
      SourceSize.of(sourceContent.byteSize).andThen((sourceSize) =>
        SourceContentSnapshot.construct({
          props: {
            content: sourceContent.value,
            fingerprint: sourceFingerprint.value,
            size: sourceSize.value,
          },
          validate: (props) => ok(props),
        }),
      ),
    );
  }

  static restore(params: {
    content: string;
    fingerprint: string;
    size: number;
  }): Result<SourceContentSnapshot, SourceContentSnapshotDomainError> {
    const { content, fingerprint, size } = params;

    return ResultUtils.combine([
      SourceContent.of(content),
      SourceFingerprint.of(fingerprint),
      SourceSize.of(size),
    ]).andThen(([sourceContent, sourceFingerprint, sourceSize]) => {
      if (!sourceContent.hasByteSize(sourceSize.value)) {
        return err({
          kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
          code: 'source.size_mismatch',
          message: 'Source size must match content byte size',
          details: { fields: ['content', 'size'] },
        } satisfies SourceContentSnapshotDomainError);
      }

      return SourceContentSnapshot.construct({
        props: {
          content: sourceContent.value,
          fingerprint: sourceFingerprint.value,
          size: sourceSize.value,
        },
        validate: (props) => ok(props),
      });
    });
  }

  hasSameContentAs(other: SourceContentSnapshot): boolean {
    return this.value.fingerprint === other.value.fingerprint;
  }
}
