import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteListPosts, useInfiniteSearchPosts } from '@/entities/post';

export function usePostsArchive() {
  const [searchParams] = useSearchParams();
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : undefined;
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const normalizedQuery = submittedQuery;
  const isSearching = normalizedQuery.length >= 1;

  const listResult = useInfiniteListPosts(limit);
  const searchResult = useInfiniteSearchPosts(normalizedQuery, limit);
  const result = isSearching ? searchResult : listResult;
  const firstSearchPage = searchResult.data?.pages[0];
  const semanticSearchApplied = isSearching
    ? (firstSearchPage?.semanticSearchApplied ?? null)
    : null;
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = result;

  function submitSearch() {
    const nextQuery = query.trim();

    if (nextQuery === normalizedQuery) {
      if (nextQuery.length >= 1) void searchResult.refetch();
      return;
    }

    setSubmittedQuery(nextQuery);
  }

  return {
    query,
    setQuery,
    submitSearch,
    normalizedQuery,
    isSearching,
    semanticSearchApplied,
    posts: data?.pages.flatMap((page) => page.posts) ?? [],
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}
