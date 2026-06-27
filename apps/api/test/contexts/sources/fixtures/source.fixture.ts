import { Source } from '@contexts/sources/domain';

export function buildSource(
  params: Partial<Parameters<typeof Source.create>[0]> = {},
): Source {
  const content = params.content ?? '# Source note';

  return Source.create({
    externalSourceId: params.externalSourceId ?? 'Notes/source.md',
    content,
    fingerprint: params.fingerprint ?? 'fingerprint-1',
  })._unsafeUnwrap();
}

export function sourceContentByteSize(content: string): number {
  return new TextEncoder().encode(content).length;
}
