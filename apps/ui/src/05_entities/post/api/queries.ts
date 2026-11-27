import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttpClient } from '@/shared/api';
import { countPosts, getPost, listPosts, listPostViews, publishPost, searchPosts, unpublishPost } from './client';
import { type PublishPostRequest } from './types';

export function usePost(id: string | undefined) {
  const http = useHttpClient();
  return useQuery({
    queryKey: ['posts', id],
    queryFn: () => getPost(http, id!),
    enabled: !!id,
  });
}

/** 조회내역은 소유자만 읽는다. 권한이 없으면 API가 401이나 403으로 답한다. */
export function useInfinitePostViews(id: string | undefined) {
  const http = useHttpClient();
  return useInfiniteQuery({
    queryKey: ['posts', id, 'views'],
    queryFn: ({ pageParam }) => listPostViews(http, id!, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!id,
  });
}

export function useCountPosts() {
  const http = useHttpClient();
  return useQuery({
    queryKey: ['posts', 'count'],
    queryFn: () => countPosts(http),
  });
}

export function useInfiniteListPosts({ limit, project }: { limit?: number; project?: string } = {}, enabled = true) {
  const http = useHttpClient();
  return useInfiniteQuery({
    queryKey: ['posts', 'infinite', limit, project],
    queryFn: ({ pageParam }) => listPosts(http, { cursor: pageParam, limit, project }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useInfiniteSearchPosts(query: string, limit?: number, enabled = true) {
  const http = useHttpClient();
  return useInfiniteQuery({
    queryKey: ['posts', 'search', query, limit],
    queryFn: ({ pageParam }) => searchPosts(http, { query, cursor: pageParam, limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: enabled && query.length >= 1,
  });
}

export function usePublishPost() {
  const http = useHttpClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: PublishPostRequest) => publishPost(http, req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      void queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });
}

export function useUnpublishPost() {
  const http = useHttpClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unpublishPost(http, id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['posts', id] });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      void queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });
}
