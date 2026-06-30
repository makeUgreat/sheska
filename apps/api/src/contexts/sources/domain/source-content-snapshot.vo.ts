import { ValueObject } from '@kernels/domain';
import { SourceFingerprint } from './source-fingerprint.vo';
import { SourceContent } from './source-content.vo';
import { SourceSize } from './source-size.vo';

interface SourceContentSnapshotProps {
  content: string;
  fingerprint: string;
  size: number;
}

export class SourceContentSnapshot extends ValueObject<SourceContentSnapshotProps> {
  constructor(props: SourceContentSnapshotProps) {
    super(props);
  }

  static create(params: {
    content: string;
    fingerprint: string;
  }): SourceContentSnapshot {
    const { content, fingerprint } = params;
    const sourceContent = SourceContent.of(content);
    const sourceFingerprint = SourceFingerprint.of(fingerprint);

    return new SourceContentSnapshot({
      content: sourceContent.unpack(),
      fingerprint: sourceFingerprint.unpack(),
      size: SourceSize.of(sourceContent.byteSize).unpack(),
    });
  }

  static restore(params: {
    content: string;
    fingerprint: string;
    size: number;
  }): SourceContentSnapshot {
    const { content, fingerprint, size } = params;
    const sourceContent = SourceContent.of(content);
    const sourceFingerprint = SourceFingerprint.of(fingerprint);
    const sourceSize = SourceSize.of(size);

    return new SourceContentSnapshot({
      content: sourceContent.unpack(),
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
    if (!SourceContent.of(props.content).hasByteSize(props.size)) {
      throw new Error('Source size must match content byte size');
    }
  }
}
