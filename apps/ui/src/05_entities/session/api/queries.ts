import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttpClient } from '@/shared/api';
import { getSession, logIn, logOut } from './client';
import { type LogInRequest } from './types';

const SESSION_KEY = ['session'];

export function useSession() {
  const http = useHttpClient();
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: () => getSession(http),
  });
}

export type Viewer = 'visitor' | 'owner';

/** 세션을 확인하는 동안에는 방문자로 본다. 권한은 어차피 API가 검사한다. */
export function useViewer(): Viewer {
  const { data } = useSession();
  return data?.authenticated ? 'owner' : 'visitor';
}

export function useLogIn() {
  const http = useHttpClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: LogInRequest) => logIn(http, req),
    onSuccess: () => {
      queryClient.setQueryData(SESSION_KEY, { authenticated: true });
    },
  });
}

export function useLogOut() {
  const http = useHttpClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logOut(http),
    onSuccess: () => {
      queryClient.setQueryData(SESSION_KEY, { authenticated: false });
      queryClient.removeQueries({ queryKey: ['sources'] });
    },
  });
}
