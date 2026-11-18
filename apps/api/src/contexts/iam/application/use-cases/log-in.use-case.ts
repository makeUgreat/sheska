import { Inject, Injectable } from '@nestjs/common';
import { RateLimitedError, UnauthenticatedError } from '@core/errors';
import {
  type LoginAttemptCounter,
  type OwnerPasswordVerifier,
  type SessionStore,
} from '@contexts/iam/application/ports';
import { LoginAttemptPolicy } from '@contexts/iam/domain';
import {
  LOGIN_ATTEMPT_COUNTER,
  OWNER_PASSWORD_VERIFIER,
  SESSION_STORE,
} from '@contexts/iam/iam.di-tokens';

const SESSION_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

export interface LogInCommand {
  readonly password: string;
  readonly clientAddress: string;
}

export interface LogInResult {
  readonly sessionToken: string;
  readonly expiresAt: Date;
}

@Injectable()
export class LogInUseCase {
  constructor(
    @Inject(OWNER_PASSWORD_VERIFIER)
    private readonly ownerPassword: OwnerPasswordVerifier,
    @Inject(SESSION_STORE)
    private readonly sessions: SessionStore,
    @Inject(LOGIN_ATTEMPT_COUNTER)
    private readonly attempts: LoginAttemptCounter,
  ) {}

  async execute(command: LogInCommand): Promise<LogInResult> {
    const policy = LoginAttemptPolicy.STANDARD;
    const attempt = await this.attempts.register(command.clientAddress, policy);
    if (!policy.allows(attempt.attemptNumber)) {
      throw new RateLimitedError({
        code: 'auth.too_many_attempts',
        message: 'Too many failed login attempts',
        details: { retryAfterSeconds: attempt.retryAfterSeconds },
      });
    }

    if (!(await this.ownerPassword.matches(command.password))) {
      throw new UnauthenticatedError({
        code: 'auth.invalid_credentials',
        message: 'Invalid credentials',
        details: {},
      });
    }

    await this.attempts.clear(command.clientAddress);
    const session = await this.sessions.issue(SESSION_LIFETIME_SECONDS);
    return { sessionToken: session.token, expiresAt: session.expiresAt };
  }
}
