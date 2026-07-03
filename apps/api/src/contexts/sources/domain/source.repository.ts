import { type Source } from './source.aggregate';

export type SourceRepositoryFindCriteria = {
  readonly externalSourceId: string;
};

export type SourceRepositoryGetCriteria = {
  readonly id: string;
};

export interface SourceRepository {
  find(criteria: SourceRepositoryFindCriteria): Promise<Source | null>;
  get(criteria: SourceRepositoryGetCriteria): Promise<Source | null>;
  list(): Promise<Source[]>;
  save(source: Source): Promise<Source>;
}
