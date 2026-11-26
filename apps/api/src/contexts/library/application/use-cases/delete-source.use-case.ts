import { Inject, Injectable } from '@nestjs/common';
import { type SourceRepository } from '@contexts/library/domain';
import { SOURCE_REPOSITORY } from '@contexts/library/library.di-tokens';

export interface DeleteSourceCommand {
  readonly sourceId: string;
}

@Injectable()
export class DeleteSourceUseCase {
  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sources: SourceRepository,
  ) {}

  async execute(command: DeleteSourceCommand): Promise<void> {
    await this.sources.delete({ id: command.sourceId });
  }
}
