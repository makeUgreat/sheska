import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  DATABASE_TOKENS,
  INFRASTRUCTURE_ERROR_KIND,
  InfrastructureException,
} from '@kernels/infrastructure';
import { QueueHealthProbe } from '../queue/queue-health.probe';

@Controller()
export class HealthController {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: NodePgDatabase,
    private readonly queueHealthProbe: QueueHealthProbe,
  ) {}

  @Get('livez')
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('readyz')
  async ready(): Promise<{ status: string }> {
    try {
      await this.db.execute(sql`SELECT 1`);
    } catch {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
        code: 'health.database_unreachable',
        message: 'Database is unreachable',
        source: { boundary: 'persistence', adapter: 'postgres' },
        details: { cause: undefined },
      });
    }

    try {
      await this.queueHealthProbe.check();
    } catch {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
        code: 'health.queue_unreachable',
        message: 'Queue is unreachable',
        source: { boundary: 'message-broker', adapter: 'bullmq' },
        details: { cause: undefined },
      });
    }

    return { status: 'ok' };
  }
}
