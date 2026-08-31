import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useHttpClient } from '@/shared/api';
import {
  countPosts,
  getPost,
  listPosts,
  publishPost,
  searchPosts,
  updatePost,
} from './client';
import { type PublishPostRequest, type UpdatePostRequest } from './types';

export function usePost(id: string | undefined) {
  const http = useHttpClient();
  return useQuery({
    queryKey: ['posts', id],
    queryFn: () => getPost(http, id!),
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

export function useInfiniteListPosts(limit?: number, enabled = true) {
  const http = useHttpClient();
  return useInfiniteQuery({
    queryKey: ['posts', 'infinite', limit],
    queryFn: ({ pageParam }) => listPosts(http, { cursor: pageParam, limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
}

export function useInfiniteSearchPosts(
  query: string,
  limit?: number,
  enabled = true,
) {
  const http = useHttpClient();
  return useInfiniteQuery({
    queryKey: ['posts', 'search', query, limit],
    queryFn: ({ pageParam }) =>
      searchPosts(http, { query, cursor: pageParam, limit }),
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

export function useUpdatePost(postId: string) {
  const http = useHttpClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: UpdatePostRequest) => updatePost(http, postId, req),
    onSuccess: (data) => {
      queryClient.setQueryData(['posts', postId], data);
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
