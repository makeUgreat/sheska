import { type SourceVector } from './source-vector.aggregate';

export interface SourceVectorRepository {
  save(sourceVector: SourceVector): Promise<void>;
}
