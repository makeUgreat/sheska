export interface LoginAttemptPolicyProps {
  readonly maxFailures: number;
  readonly windowSeconds: number;
  readonly lockSeconds: number;
}

export class LoginAttemptPolicy {
  static readonly STANDARD = new LoginAttemptPolicy({
    maxFailures: 5,
    windowSeconds: 5 * 60,
    lockSeconds: 5 * 60,
  });

  constructor(private readonly props: LoginAttemptPolicyProps) {}

  isLocked(failureCount: number): boolean {
    return failureCount >= this.props.maxFailures;
  }

  get maxFailures(): number {
    return this.props.maxFailures;
  }

  get windowSeconds(): number {
    return this.props.windowSeconds;
  }

  get lockSeconds(): number {
    return this.props.lockSeconds;
  }
}
