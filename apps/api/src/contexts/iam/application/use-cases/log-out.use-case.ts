import { Inject, Injectable } from '@nestjs/common';
import { type SessionStore } from '@contexts/iam/application/ports';
import { SESSION_STORE } from '@contexts/iam/iam.di-tokens';

export interface LogOutCommand {
  readonly sessionToken: string | null;
}

@Injectable()
export class LogOutUseCase {
  constructor(
    @Inject(SESSION_STORE)
    private readonly sessions: SessionStore,
  ) {}

  async execute(command: LogOutCommand): Promise<void> {
    if (command.sessionToken === null) return;
    await this.sessions.revoke(command.sessionToken);
  }
}
