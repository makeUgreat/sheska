import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteListPosts, useInfiniteSearchPosts } from '@/entities/post';
import { useDebouncedValue } from '@/shared/lib';

const POSTS_SEARCH_DEBOUNCE_MS = 300;

export function usePostsArchive() {
  const [searchParams] = useSearchParams();
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : undefined;
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, POSTS_SEARCH_DEBOUNCE_MS);
  const normalizedQuery = debouncedQuery.trim();
  const isSearching = normalizedQuery.length >= 1;

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
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}
