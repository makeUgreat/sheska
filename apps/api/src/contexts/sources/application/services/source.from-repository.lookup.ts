import { type SourceRepository } from '@contexts/sources/domain';
import {
  type SourceLookup,
  type SourceDocument,
} from '@contexts/sources/application/ports';

export class SourceFromRepositoryLookup implements SourceLookup {
  constructor(private readonly sources: SourceRepository) {}

  async get(sourceId: string): Promise<SourceDocument> {
    const source = await this.sources.get({ id: sourceId });
    const props = source.getProps();
    return {
      content: props.contentSnapshot.unpack().content,
      externalSourceId: props.externalSourceId.unpack(),
    };
  }

  async find(sourceId: string): Promise<SourceDocument | null> {
    const source = await this.sources.find({ id: sourceId });
    if (source === null) return null;
    const props = source.getProps();
    return {
      content: props.contentSnapshot.unpack().content,
      externalSourceId: props.externalSourceId.unpack(),
    };
  }
}
