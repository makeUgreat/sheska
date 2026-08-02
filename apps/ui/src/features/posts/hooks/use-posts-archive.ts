import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useCountPosts,
  useInfiniteListPosts,
  useInfiniteSearchPosts,
} from '@/entities/posts/api/queries';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';

const POSTS_SEARCH_DEBOUNCE_MS = 300;

export function usePostsArchive() {
  const [searchParams] = useSearchParams();
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : undefined;
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, POSTS_SEARCH_DEBOUNCE_MS);
  const normalizedQuery = debouncedQuery.trim();
  const isSearching = normalizedQuery.length >= 1;

  const countResult = useCountPosts();
  const listResult = useInfiniteListPosts(limit);
  const searchResult = useInfiniteSearchPosts(normalizedQuery, limit);
  const result = isSearching ? searchResult : listResult;
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = result;

  return {
    query,
    setQuery,
    normalizedQuery,
    isSearching,
    posts: data?.pages.flatMap((page) => page.posts) ?? [],
    totalPostCount: countResult.data?.count ?? 0,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}
