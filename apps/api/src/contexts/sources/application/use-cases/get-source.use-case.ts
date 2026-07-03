import { Inject, Injectable } from '@nestjs/common';
import { type SourceRepository } from '@contexts/sources/domain';
import {
  APPLICATION_ERROR_KIND,
  ApplicationException,
} from '@kernels/application';
import { SOURCE_REPOSITORY } from '@contexts/sources/sources.di-tokens';

export interface GetSourceCommand {
  readonly sourceId: string;
}

export interface GetSourceResult {
  readonly sourceId: string;
  readonly externalSourceId: string;
  readonly content: string;
  readonly fingerprint: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

@Injectable()
export class GetSourceUseCase {
  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sources: SourceRepository,
  ) {}

  async execute(command: GetSourceCommand): Promise<GetSourceResult> {
    const source = await this.sources.get({ id: command.sourceId });

    if (!source) {
      throw new ApplicationException({
        kind: APPLICATION_ERROR_KIND.NOT_FOUND,
        code: 'sources.source_not_found',
        message: 'Source not found',
        details: {},
      });
    }

    const props = source.getProps();
    const snapshot = props.contentSnapshot.unpack();

    return {
      sourceId: source.id,
      externalSourceId: props.externalSourceId.unpack(),
      content: snapshot.content,
      fingerprint: snapshot.fingerprint,
      sizeBytes: snapshot.size,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
  }
}
