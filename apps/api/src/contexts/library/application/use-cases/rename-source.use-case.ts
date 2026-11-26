import { Inject, Injectable } from '@nestjs/common';
import { ConstraintViolationError, NotFoundError } from '@core/errors';
import { ExternalSourceId, type SourceRepository } from '@contexts/library/domain';
import { SOURCE_REPOSITORY } from '@contexts/library/library.di-tokens';

export interface RenameSourceCommand {
  readonly fromExternalSourceId: string;
  readonly toExternalSourceId: string;
}

export interface RenameSourceResult {
  readonly sourceId: string;
}

@Injectable()
export class RenameSourceUseCase {
  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sources: SourceRepository,
  ) {}

  async execute(command: RenameSourceCommand): Promise<RenameSourceResult> {
    const from = ExternalSourceId.of(command.fromExternalSourceId).unpack();
    const to = ExternalSourceId.of(command.toExternalSourceId).unpack();
    const [source, target] = await Promise.all([
      this.sources.find({ externalSourceId: from }),
      this.sources.find({ externalSourceId: to }),
    ]);

    if (!source && target) return { sourceId: target.id };
    if (!source) {
      throw new NotFoundError({
        code: 'source.not_found',
        message: 'Source not found',
        details: { externalSourceId: from },
      });
    }
    if (from === to) return { sourceId: source.id };
    if (target) {
      throw new ConstraintViolationError({
        code: 'source.rename_target_exists',
        message: 'Another source already uses the target path',
        details: { externalSourceId: to },
      });
    }

    source.moveTo(to);
    await this.sources.update(source);

    return { sourceId: source.id };
  }
}
