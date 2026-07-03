import { Inject, Injectable } from '@nestjs/common';
import { type SourceRepository } from '@contexts/sources/domain';
import { SOURCE_REPOSITORY } from '@contexts/sources/sources.di-tokens';

export interface ListSourcesCommand {
  readonly pagination?: {
    readonly page: number;
    readonly limit: number;
  };
}

export interface ListSourcesResultItem {
  readonly sourceId: string;
  readonly externalSourceId: string;
  readonly fingerprint: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ListSourcesResult {
  readonly sources: ReadonlyArray<ListSourcesResultItem>;
}

@Injectable()
export class ListSourcesUseCase {
  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sources: SourceRepository,
  ) {}

  async execute(_command: ListSourcesCommand = {}): Promise<ListSourcesResult> {
    const sources = await this.sources.list();

    return {
      sources: sources.map((source) => {
        const props = source.getProps();
        const snapshot = props.contentSnapshot.unpack();

        return {
          sourceId: source.id,
          externalSourceId: props.externalSourceId.unpack(),
          fingerprint: snapshot.fingerprint,
          sizeBytes: snapshot.size,
          createdAt: source.createdAt,
          updatedAt: source.updatedAt,
        };
      }),
    };
  }
}
