import { Inject, Injectable } from '@nestjs/common';
import { type Redis } from 'ioredis';
import { REDIS_TOKENS } from '@kernels/infrastructure';
import {
  type LoginAttempt,
  type LoginAttemptCounter,
} from '@contexts/iam/application/ports';
import { UnexpectedError } from '@core/errors';
import { type LoginAttemptPolicy } from '@contexts/iam/domain';
import { toRedisError } from '@contexts/iam/infrastructure/redis-error';

const KEY_PREFIX = 'iam:login-attempts:';

type TransactionReply = [error: Error | null, reply: unknown];

@Injectable()
export class LoginAttemptRedisCounter implements LoginAttemptCounter {
  constructor(@Inject(REDIS_TOKENS.client) private readonly redis: Redis) {}

  async register(
    clientAddress: string,
    policy: LoginAttemptPolicy,
  ): Promise<LoginAttempt> {
    try {
      return await this.registerOnce(keyOf(clientAddress), policy);
    } catch (error: unknown) {
      throw toRedisError(error);
    }
  }

  async clear(clientAddress: string): Promise<void> {
    try {
      await this.redis.del(keyOf(clientAddress));
    } catch (error: unknown) {
      throw toRedisError(error);
    }
  }

  private async registerOnce(
    key: string,
    policy: LoginAttemptPolicy,
  ): Promise<LoginAttempt> {
    const { count, ttlSeconds } = await this.increment(
      key,
      policy.windowSeconds,
    );
    if (count === policy.maxFailures) {
      await this.redis.expire(key, policy.lockSeconds);
      return { attemptNumber: count, retryAfterSeconds: policy.lockSeconds };
    }

    return { attemptNumber: count, retryAfterSeconds: Math.max(ttlSeconds, 0) };
  }

  private async increment(
    key: string,
    windowSeconds: number,
  ): Promise<{ count: number; ttlSeconds: number }> {
    const replies = await this.redis
      .multi()
      .incr(key)
      .expire(key, windowSeconds, 'NX')
      .ttl(key)
      .exec();

    if (replies === null) {
      throw new UnexpectedError({
        code: 'redis.transaction_discarded',
        message: 'Redis discarded the transaction',
        details: {},
      });
    }
    const [incrReply, , ttlReply] = replies;
    return { count: numberFrom(incrReply), ttlSeconds: numberFrom(ttlReply) };
  }
}

function keyOf(clientAddress: string): string {
  return `${KEY_PREFIX}${clientAddress}`;
}

function numberFrom([error, reply]: TransactionReply): number {
  if (error) throw error;
  // 이 트랜잭션의 INCR과 TTL은 성공하면 항상 integer reply를 돌려준다.
  return reply as number;
}
