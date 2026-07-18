import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useApiClient } from './client-context';
import { type PublishPostRequest, type UpdatePostRequest } from './client';

export function useListSources() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['sources'],
    queryFn: () => client.listSources(),
  });
}

export function useSource(id: string | undefined) {
  const client = useApiClient();
  return useQuery({
    queryKey: ['sources', id],
    queryFn: () => client.getSource(id!),
    enabled: !!id,
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

export function usePublishPost() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: PublishPostRequest) => client.publishPost(req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
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
