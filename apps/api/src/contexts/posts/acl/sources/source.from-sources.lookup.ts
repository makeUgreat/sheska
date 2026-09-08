import { type SourceLookup as SourcesSourceLookup } from '@contexts/sources';
import {
  type PublishableSourceContent,
  type SourceLookup,
} from '@contexts/posts/application/ports';

export class SourceFromSourcesLookup implements SourceLookup {
  constructor(private readonly sourcesLookup: SourcesSourceLookup) {}

  async get(sourceId: string): Promise<PublishableSourceContent> {
    return this.sourcesLookup.get(sourceId);
  }

  async find(sourceId: string): Promise<PublishableSourceContent | null> {
    return this.sourcesLookup.find(sourceId);
  }
}
