import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { type Redis } from 'ioredis';
import { sha256Hex } from '@core/hash';
import { REDIS_TOKENS } from '@kernels/infrastructure';
import { type IssuedSession, type SessionStore } from '@contexts/iam/application/ports';
import { toRedisError } from '@contexts/iam/infrastructure/redis-error';

const KEY_PREFIX = 'iam:session:';
const TOKEN_BYTES = 32;

@Injectable()
export class SessionRedisStore implements SessionStore {
  constructor(@Inject(REDIS_TOKENS.client) private readonly redis: Redis) {}

  async issue(lifetimeSeconds: number): Promise<IssuedSession> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(Date.now() + lifetimeSeconds * 1000);

    try {
      await this.redis.set(keyOf(token), expiresAt.toISOString(), 'EX', lifetimeSeconds);
    } catch (error: unknown) {
      throw toRedisError(error);
    }

    return { token, expiresAt };
  }

  async isActive(token: string): Promise<boolean> {
    try {
      return (await this.redis.exists(keyOf(token))) === 1;
    } catch (error: unknown) {
      throw toRedisError(error);
    }
  }

  async revoke(token: string): Promise<void> {
    try {
      await this.redis.del(keyOf(token));
    } catch (error: unknown) {
      throw toRedisError(error);
    }
  }
}

function keyOf(token: string): string {
  return `${KEY_PREFIX}${sha256Hex(token)}`;
}
