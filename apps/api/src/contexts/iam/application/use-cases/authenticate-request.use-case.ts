import { Inject, Injectable } from '@nestjs/common';
import { UnauthenticatedError } from '@core/errors';
import { type SessionStore } from '@contexts/iam/application/ports';
import { ALL_PERMISSIONS, type ApiTokenRepository, ApiTokenSecret, type Permission } from '@contexts/iam/domain';
import { API_TOKEN_REPOSITORY, SESSION_STORE } from '@contexts/iam/iam.di-tokens';

export type Credential = { readonly type: 'session'; readonly token: string } | { readonly type: 'bearer'; readonly token: string };

export interface Identity {
  readonly permissions: readonly Permission[];
}

export interface AuthenticateRequestCommand {
  readonly credential: Credential | null;
}

@Injectable()
export class AuthenticateRequestUseCase {
  constructor(
    @Inject(SESSION_STORE)
    private readonly sessions: SessionStore,
    @Inject(API_TOKEN_REPOSITORY)
    private readonly apiTokens: ApiTokenRepository,
  ) {}

  async execute({ credential }: AuthenticateRequestCommand): Promise<Identity> {
    if (credential === null) throw unauthenticated();

    switch (credential.type) {
      case 'session':
        return this.authenticateSession(credential.token);
      case 'bearer':
        return this.authenticateApiToken(credential.token);
    }
  }

  private async authenticateSession(token: string): Promise<Identity> {
    if (await this.sessions.isActive(token)) {
      return { permissions: ALL_PERMISSIONS };
    }
    throw unauthenticated();
  }

  private async authenticateApiToken(token: string): Promise<Identity> {
    const apiToken = await this.apiTokens.find({
      secretHash: ApiTokenSecret.of(token).hash(),
    });
    if (!apiToken) throw unauthenticated();

    if (apiToken.tryRecordUse(new Date())) {
      await this.apiTokens.update(apiToken);
    }
    return { permissions: apiToken.grantedPermissions() };
  }
}

function unauthenticated(): UnauthenticatedError {
  return new UnauthenticatedError({
    code: 'auth.unauthenticated',
    message: 'Authentication is required',
    details: {},
  });
}
