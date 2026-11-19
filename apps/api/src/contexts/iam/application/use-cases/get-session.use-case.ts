import { Inject, Injectable } from '@nestjs/common';
import { type SessionStore } from '@contexts/iam/application/ports';
import { SESSION_STORE } from '@contexts/iam/iam.di-tokens';

export interface GetSessionCommand {
  readonly sessionToken: string | null;
}

export interface GetSessionResult {
  readonly authenticated: boolean;
}

@Injectable()
export class GetSessionUseCase {
  constructor(
    @Inject(SESSION_STORE)
    private readonly sessions: SessionStore,
  ) {}

  async execute(command: GetSessionCommand): Promise<GetSessionResult> {
    if (command.sessionToken === null) return { authenticated: false };
    return {
      authenticated: await this.sessions.isActive(command.sessionToken),
    };
  }
}
