import { useState } from 'react';
import { useCountPosts } from '@/entities/posts/api/queries';
import { PostsLandingView } from '@/features/posts/components/posts-landing-view';
import { Footer } from '@/shared/layout/footer';

export function LandingPage() {
  const [query, setQuery] = useState('');
  const { data } = useCountPosts();

  return (
    <main>
      <PostsLandingView
        query={query}
        onQueryChange={setQuery}
        totalPostCount={data?.count ?? 0}
        articlesHref="/posts"
      />
      <Footer />
    </main>
  );
}
