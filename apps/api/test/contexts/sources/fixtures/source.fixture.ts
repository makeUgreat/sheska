import { Source } from '@contexts/sources/domain';

export function createSourceFixture(
  params: {
    externalSourceId?: string;
    content?: string;
    fingerprint?: string;
  } = {},
): Source {
  const content = params.content ?? '# Source note';

  return Source.create({
    externalSourceId: params.externalSourceId ?? 'Notes/source.md',
    content,
    fingerprint: params.fingerprint ?? 'fingerprint-1',
    size: byteSize(content),
  })._unsafeUnwrap();
}

export function byteSize(content: string): number {
  return new TextEncoder().encode(content).length;
}
