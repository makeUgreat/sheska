import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  type ListPostsResponse,
  type PostSummary,
  type SearchPostsResponse,
  useInfiniteListPosts,
  useInfiniteSearchPosts,
} from '@/entities/post';
import { findProject } from '@/entities/project';

function toKnownProject(value: string | null): string | null {
  if (value === null || !findProject(value)) return null;

  return value;
}

export function usePostsArchive() {
  const [searchParams, setSearchParams] = useSearchParams();
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : undefined;
  const project = toKnownProject(searchParams.get('project'));
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const normalizedQuery = submittedQuery;
  const isSearching = normalizedQuery.length >= 1;

  const listResult = useInfiniteListPosts({ limit, project: project ?? undefined });
  const [listedProject, setListedProject] = useState(project);
  if (!listResult.isPlaceholderData && listedProject !== project) setListedProject(project);
  const searchResult = useInfiniteSearchPosts(normalizedQuery, limit);
  const result = isSearching ? searchResult : listResult;
  const firstSearchPage = searchResult.data?.pages[0];
  const semanticSearchApplied = isSearching ? (firstSearchPage?.semanticSearchApplied ?? null) : null;
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = result;
  const pages: ReadonlyArray<ListPostsResponse | SearchPostsResponse> = data?.pages ?? [];

  function selectProject(next: string | null) {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      if (next === null) params.delete('project');
      else params.set('project', next);

      return params;
    });
  }

  function submitSearch() {
    const nextQuery = query.trim();
    if (nextQuery.length >= 1 && project !== null) selectProject(null);

    if (nextQuery === normalizedQuery) {
      if (nextQuery.length >= 1) void searchResult.refetch();
      return;
    }

    setSubmittedQuery(nextQuery);
  }

  function closeSearch() {
    setQuery('');
    setSubmittedQuery('');
  }

  return {
    query,
    setQuery,
    submitSearch,
    closeSearch,
    normalizedQuery,
    isSearching,
    semanticSearchApplied,
    project,
    selectProject,
    listedProject,
    isSwitchingProject: !isSearching && listResult.isPlaceholderData,
    posts: pages.flatMap((page): PostSummary[] => page.posts),
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}
