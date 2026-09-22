import { useMemo } from 'react';
import { parseOutline, type Heading } from './parse-outline';
import { useActiveHeading } from './use-active-heading';

export function useArticleOutline(body: string | undefined): {
  outline: Heading[];
  activeHeadingId: string | null;
} {
  const outline = useMemo(() => parseOutline(body ?? ''), [body]);
  const activeHeadingId = useActiveHeading(
    outline.map((heading) => heading.id),
  );

  return { outline, activeHeadingId };
}
