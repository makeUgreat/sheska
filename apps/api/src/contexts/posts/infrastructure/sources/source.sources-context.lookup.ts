import { type SourceRepository } from '@contexts/sources/sources.di-tokens';
import {
  type SourceInfo,
  type SourceLookup,
} from '@contexts/posts/application/ports';

export class SourceSourcesContextLookup implements SourceLookup {
  constructor(private readonly sources: SourceRepository) {}

  async get(sourceId: string): Promise<SourceInfo> {
    const source = await this.sources.get({ id: sourceId });
    const props = source.getProps();
    return {
      content: props.contentSnapshot.unpack().content,
      externalSourceId: props.externalSourceId.unpack(),
    };
  }

  async find(sourceId: string): Promise<SourceInfo | null> {
    const source = await this.sources.find({ id: sourceId });
    if (source === null) return null;
    const props = source.getProps();
    return {
      content: props.contentSnapshot.unpack().content,
      externalSourceId: props.externalSourceId.unpack(),
    };
  }
}
