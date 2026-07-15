import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from './client-context';
import { type PublishPostRequest } from './client';

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

export function useListPosts() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['posts'],
    queryFn: () => client.listPosts(),
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
