import { AuthApi } from '@sheska/contract';
import { type HttpClientType as HttpClient } from '@/shared/api';
import { type LogInRequest, type SessionResponse } from './types';

export function logIn(http: HttpClient, req: LogInRequest): Promise<void> {
  return http.post(AuthApi.logIn.path, req);
}

export function logOut(http: HttpClient): Promise<void> {
  return http.delete(AuthApi.logOut.path);
}

export function getSession(http: HttpClient): Promise<SessionResponse> {
  return http.get(AuthApi.session.path, AuthApi.session.response);
}
