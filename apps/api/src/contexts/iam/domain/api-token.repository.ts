import { type ApiToken } from './api-token.aggregate';

export type ApiTokenRepositoryFindCriteria = {
  readonly secretHash: string;
};

export type ApiTokenRepositoryGetCriteria = {
  readonly id: string;
};

export interface ApiTokenRepository {
  find(criteria: ApiTokenRepositoryFindCriteria): Promise<ApiToken | null>;
  get(criteria: ApiTokenRepositoryGetCriteria): Promise<ApiToken>;
  insert(apiToken: ApiToken): Promise<ApiToken>;
  update(apiToken: ApiToken): Promise<ApiToken>;
  delete(apiToken: ApiToken): Promise<void>;
}
