import { Inject, Injectable } from '@nestjs/common';
import { type Source, type SourceRepository } from '@contexts/library/domain';
import {
  type SourceLookup,
  type SourceDocument,
} from '@contexts/library/application/ports';
import { SOURCE_REPOSITORY } from '@contexts/library/library.di-tokens';

@Injectable()
export class SourceFromRepositoryLookup implements SourceLookup {
  constructor(
    @Inject(SOURCE_REPOSITORY) private readonly sources: SourceRepository,
  ) {}

  async get(sourceId: string): Promise<SourceDocument> {
    const source = await this.sources.get({ id: sourceId });
    return SourceFromRepositoryLookup.toDocument(source);
  }

  async find(sourceId: string): Promise<SourceDocument | null> {
    const source = await this.sources.find({ id: sourceId });
    if (source === null) return null;
    return SourceFromRepositoryLookup.toDocument(source);
  }

  private static toDocument(source: Source): SourceDocument {
    const { externalSourceId, body } = source.getProps();

    return {
      externalSourceId: externalSourceId.unpack(),
      title: source.title(),
      body: body.unpack().text,
    };
  }
}
