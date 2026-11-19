import { ApiTokenApi, pathOf } from '@sheska/contract';
import { type HttpClientType as HttpClient } from '@/shared/api';
import { type ApiToken, type IssuedApiToken } from './types';

export function issueApiToken(
  http: HttpClient,
  name: string,
): Promise<IssuedApiToken> {
  return http.post(
    ApiTokenApi.issue.path,
    { name },
    ApiTokenApi.issue.response,
  );
}

export async function listApiTokens(http: HttpClient): Promise<ApiToken[]> {
  const { apiTokens } = await http.get(
    ApiTokenApi.list.path,
    ApiTokenApi.list.response,
  );
  return apiTokens;
}

export function revokeApiToken(http: HttpClient, id: string): Promise<void> {
  return http.delete(pathOf(ApiTokenApi.revoke, { id }));
}
