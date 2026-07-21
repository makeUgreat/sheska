import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useApiClient } from './client-context';
import { type PublishPostRequest, type UpdatePostRequest } from './client';

const SYNC_JOB_POLL_INTERVAL_MS = 2000;
const ACTIVE_SYNC_JOB_STATUSES = new Set(['pending', 'processing']);

export function useListSources() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['sources'],
    queryFn: () => client.listSources(),
    refetchInterval: (query) => {
      const hasActiveSyncJob = query.state.data?.sources.some(
        (source) =>
          source.latestSyncJob &&
          ACTIVE_SYNC_JOB_STATUSES.has(source.latestSyncJob.status),
      );
      return hasActiveSyncJob ? SYNC_JOB_POLL_INTERVAL_MS : false;
    },
  });
}

export function useSource(id: string | undefined) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['sources', id],
    queryFn: () => client.getSource(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.latestSyncJob?.status;
      return status && ACTIVE_SYNC_JOB_STATUSES.has(status)
        ? SYNC_JOB_POLL_INTERVAL_MS
        : false;
    },
  });
}

export function usePost(id: string | undefined) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['posts', id],
    queryFn: () => client.getPost(id!),
    enabled: !!id,
  });
}

export function useListPosts() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['posts'],
    queryFn: () => client.listPosts(),
  });
}

export function useInfiniteListPosts(limit?: number) {
  const client = useApiClient();
  return useInfiniteQuery({
    queryKey: ['posts', 'infinite', limit],
    queryFn: ({ pageParam }) => client.listPosts({ cursor: pageParam, limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useInfiniteSearchPosts(query: string, limit?: number) {
  const client = useApiClient();
  return useInfiniteQuery({
    queryKey: ['posts', 'search', query, limit],
    queryFn: ({ pageParam }) =>
      client.searchPosts({ query, cursor: pageParam, limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: query.length >= 1,
  });
}

export function usePublishPost() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: PublishPostRequest) => client.publishPost(req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      void queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });
}

export function useUpdatePost(postId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: UpdatePostRequest) => client.updatePost(postId, req),
    onSuccess: (data) => {
      queryClient.setQueryData(['posts', postId], data);
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
