import { Source, type SourceFrontmatterProps } from '@contexts/library/domain';

export function buildSource(
  params: {
    externalSourceId?: string;
    content?: string;
    body?: string;
    frontmatter?: SourceFrontmatterProps;
    title?: string | null;
    size?: number;
  } = {},
): Source {
  const body = params.body ?? params.content ?? '# Source note';
  const externalSourceId = params.externalSourceId ?? 'Notes/source.md';

  return Source.create({
    externalSourceId,
    body,
    frontmatter: {
      sheska: true,
      ...params.frontmatter,
      ...(params.title ? { title: params.title } : {}),
    },
    size: params.size ?? sourceContentByteSize(params.content ?? body),
  });
}

export function sourceContentByteSize(content: string): number {
  return new TextEncoder().encode(content).length;
}

export function sourceContentOf(source: Source) {
  const { frontmatter, body, size } = source.getProps();
  const { text, fingerprint } = body.unpack();

  return {
    frontmatter: frontmatter.unpack(),
    title: source.title(),
    body: text,
    fingerprint: fingerprint.unpack(),
    size: size.unpack(),
  };
}
