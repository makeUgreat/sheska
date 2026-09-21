import { useEffect, useState } from 'react';

const UPPER_THIRD_OF_VIEWPORT = '0px 0px -66% 0px';

export function useActiveHeading(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);
  const observedIds = ids.join('|');

  useEffect(() => {
    if (!observedIds) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const elements = observedIds
      .split('|')
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    setActive(elements[0].id);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: UPPER_THIRD_OF_VIEWPORT, threshold: 0 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [observedIds]);

  return active;
}
