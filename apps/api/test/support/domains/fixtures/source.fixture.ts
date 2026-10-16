import {
  Source,
  type SourceFrontmatterProps,
  type SourceLink,
} from '@contexts/library/domain';

export function buildSource(
  params: {
    externalSourceId?: string;
    content?: string;
    body?: string;
    frontmatter?: SourceFrontmatterProps;
    title?: string | null;
    fingerprint?: string;
    size?: number;
    links?: readonly SourceLink[];
  } = {},
): Source {
  const body = params.body ?? params.content ?? '# Source note';
  const externalSourceId = params.externalSourceId ?? 'Notes/source.md';

  return Source.create({
    externalSourceId,
    body,
    frontmatter: params.frontmatter ?? {},
    title: params.title ?? externalSourceId,
    fingerprint: params.fingerprint ?? 'fingerprint-1',
    size: params.size ?? sourceContentByteSize(params.content ?? body),
    links: params.links ?? [],
  });
}

export function sourceContentByteSize(content: string): number {
  return new TextEncoder().encode(content).length;
}
