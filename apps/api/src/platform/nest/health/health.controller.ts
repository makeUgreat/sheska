import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { type HttpFailure } from '@kernels/presentation';
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
    } catch (cause: unknown) {
      throw dependencyUnreachable(
        'health.database_unreachable',
        'Database is unreachable',
        cause,
      );
    }

    try {
      await this.queueHealthProbe.check();
    } catch (cause: unknown) {
      throw dependencyUnreachable(
        'health.queue_unreachable',
        'Queue is unreachable',
        cause,
      );
    }

    return { status: 'ok' };
  }
}

// readyz의 실패 응답은 운영자가 의존하는 protocol 계약이므로, 어느 의존성이
// 끊겼는지를 마스킹 대상인 infrastructure error가 아니라 presentation이 소유한
// HttpFailure로 직접 노출한다.
function dependencyUnreachable(
  code: string,
  message: string,
  cause: unknown,
): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code,
      message,
      details: {},
    } satisfies HttpFailure,
    HttpStatus.SERVICE_UNAVAILABLE,
    { cause },
  );
}
