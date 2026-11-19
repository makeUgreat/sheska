import { Inject, Injectable } from '@nestjs/common';
import { type ApiTokenQueryListItem } from '@contexts/iam/application/ports';
import {
  ApiToken,
  ApiTokenName,
  ApiTokenPermissions,
  type ApiTokenRepository,
  ApiTokenSecret,
} from '@contexts/iam/domain';
import { API_TOKEN_REPOSITORY } from '@contexts/iam/iam.di-tokens';

export interface IssueApiTokenCommand {
  readonly name: string;
  readonly permissions: readonly string[];
}

export interface IssueApiTokenResult extends ApiTokenQueryListItem {
  readonly token: string;
}

@Injectable()
export class IssueApiTokenUseCase {
  constructor(
    @Inject(API_TOKEN_REPOSITORY)
    private readonly apiTokens: ApiTokenRepository,
  ) {}

  async execute(command: IssueApiTokenCommand): Promise<IssueApiTokenResult> {
    const secret = ApiTokenSecret.generate();
    const apiToken = ApiToken.create({
      name: ApiTokenName.of(command.name),
      secret,
      permissions: ApiTokenPermissions.of(command.permissions),
    });

    const saved = await this.apiTokens.insert(apiToken);
    const props = saved.getProps();

    return {
      apiTokenId: saved.id,
      name: props.name.unpack(),
      hint: props.hint,
      permissions: props.permissions.unpack(),
      createdAt: saved.createdAt,
      lastUsedAt: props.lastUsedAt,
      token: secret.unpack(),
    };
  }
}
