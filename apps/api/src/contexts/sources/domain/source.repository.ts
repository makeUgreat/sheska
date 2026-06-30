import { type Source } from './source.aggregate';

export type SourceRepositoryFindCriteria = {
  readonly externalSourceId: string;
};

export interface SourceRepository {
  find(criteria: SourceRepositoryFindCriteria): Promise<Source | null>;
  save(source: Source): Promise<Source>;
}
