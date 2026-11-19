import { Inject, Injectable } from '@nestjs/common';
import { type ApiTokenRepository, ApiTokenSecret } from '@contexts/iam/domain';
import { API_TOKEN_REPOSITORY } from '@contexts/iam/iam.di-tokens';

export interface AuthenticateApiTokenCommand {
  readonly token: string;
}

export interface AuthenticateApiTokenResult {
  readonly authenticated: boolean;
}

@Injectable()
export class AuthenticateApiTokenUseCase {
  constructor(
    @Inject(API_TOKEN_REPOSITORY)
    private readonly apiTokens: ApiTokenRepository,
  ) {}

  async execute(
    command: AuthenticateApiTokenCommand,
  ): Promise<AuthenticateApiTokenResult> {
    const presented = ApiTokenSecret.of(command.token);
    const apiToken = await this.apiTokens.find({
      secretHash: presented.hash(),
    });
    if (!apiToken) return { authenticated: false };

    if (apiToken.tryRecordUse(new Date())) {
      await this.apiTokens.update(apiToken);
    }
    return { authenticated: true };
  }
}
