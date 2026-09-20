import { type SourceLookup as LibrarySourceLookup } from '@contexts/library';
import {
  type PublishableSource,
  type SourceLookup,
} from '@contexts/posts/application/ports';

export class SourceFromSourcesLookup implements SourceLookup {
  constructor(private readonly sourcesLookup: LibrarySourceLookup) {}

  async get(sourceId: string): Promise<PublishableSource> {
    const source = await this.sourcesLookup.get(sourceId);
    return { title: source.title };
  }

  async find(sourceId: string): Promise<PublishableSource | null> {
    const source = await this.sourcesLookup.find(sourceId);
    return source === null ? null : { title: source.title };
  }
}
