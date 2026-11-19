import { type ApiResponse, type ApiTokenApi } from '@sheska/contract';

export type ApiToken = ApiResponse<
  typeof ApiTokenApi.list
>['apiTokens'][number];
export type IssuedApiToken = ApiResponse<typeof ApiTokenApi.issue>;
