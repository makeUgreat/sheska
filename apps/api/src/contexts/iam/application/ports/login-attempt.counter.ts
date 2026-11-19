import { type LoginAttemptPolicy } from '@contexts/iam/domain';

export interface LoginAttempt {
  readonly attemptNumber: number;
  readonly retryAfterSeconds: number;
}

export interface LoginAttemptCounter {
  register(clientAddress: string, policy: LoginAttemptPolicy): Promise<LoginAttempt>;
  clear(clientAddress: string): Promise<void>;
}
