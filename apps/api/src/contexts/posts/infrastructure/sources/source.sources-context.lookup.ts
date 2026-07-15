import { type SourceRepository } from '@contexts/sources/sources.di-tokens';
import { type SourceLookup } from '@contexts/posts/application/ports';

export class SourceSourcesContextLookup implements SourceLookup {
  constructor(private readonly sources: SourceRepository) {}

  async exists(sourceId: string): Promise<boolean> {
    const source = await this.sources.get({ id: sourceId });
    return source !== null;
  }
}
