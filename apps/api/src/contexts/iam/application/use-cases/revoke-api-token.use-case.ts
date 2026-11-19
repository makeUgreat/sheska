import { Inject, Injectable } from '@nestjs/common';
import { type ApiTokenRepository } from '@contexts/iam/domain';
import { API_TOKEN_REPOSITORY } from '@contexts/iam/iam.di-tokens';

export interface RevokeApiTokenCommand {
  readonly apiTokenId: string;
}

@Injectable()
export class RevokeApiTokenUseCase {
  constructor(
    @Inject(API_TOKEN_REPOSITORY)
    private readonly apiTokens: ApiTokenRepository,
  ) {}

  async execute(command: RevokeApiTokenCommand): Promise<void> {
    const apiToken = await this.apiTokens.get({ id: command.apiTokenId });
    await this.apiTokens.delete(apiToken);
  }
}
