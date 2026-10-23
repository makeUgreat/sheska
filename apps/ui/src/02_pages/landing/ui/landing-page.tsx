import { useState } from 'react';
import { useCountPosts } from '@/entities/post';
import { LandingHero } from '@/widgets/landing-hero';

export function LandingPage() {
  const [query, setQuery] = useState('');
  const { data } = useCountPosts();

  return (
    <main>
      <LandingHero
        query={query}
        onQueryChange={setQuery}
        totalPostCount={data?.count ?? 0}
        articlesHref="/posts"
      />
    </main>
  );
}
