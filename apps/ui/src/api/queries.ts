import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './client-context';

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
