export interface IssuedSession {
  readonly token: string;
  readonly expiresAt: Date;
}

export interface SessionStore {
  issue(lifetimeSeconds: number): Promise<IssuedSession>;
  isActive(token: string): Promise<boolean>;
  revoke(token: string): Promise<void>;
}
