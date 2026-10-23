import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type ApiResponse,
  type ErrorResponse,
  HealthApi,
  HealthErrorCode,
} from '@sheska/contract';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { ErrorCodes } from '@kernels/presentation';
import { QueueHealthProbe } from '../queue/queue-health.probe';

@Controller()
export class HealthController {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: NodePgDatabase,
    private readonly queueHealthProbe: QueueHealthProbe,
  ) {}

  @Get(HealthApi.live.path)
  @ErrorCodes(HealthApi.live.errors)
  live(): ApiResponse<typeof HealthApi.live> {
    return { status: 'ok' };
  }

  @Get(HealthApi.ready.path)
  @ErrorCodes(HealthApi.ready.errors)
  async ready(): Promise<ApiResponse<typeof HealthApi.ready>> {
    try {
      await this.db.execute(sql`SELECT 1`);
    } catch (cause: unknown) {
      throw dependencyUnreachable(
        HealthErrorCode.DATABASE_UNREACHABLE,
        'Database is unreachable',
        cause,
      );
    }

    try {
      await this.queueHealthProbe.check();
    } catch (cause: unknown) {
      throw dependencyUnreachable(
        HealthErrorCode.QUEUE_UNREACHABLE,
        'Queue is unreachable',
        cause,
      );
    }

    return { status: 'ok' };
  }
}

// readyz의 실패 응답은 운영자가 의존하는 protocol 계약이므로, 어느 의존성이
// 끊겼는지를 마스킹 대상인 infrastructure error가 아니라 presentation이 소유한
// 오류 응답으로 직접 노출한다.
function dependencyUnreachable(
  code: string,
  message: string,
  cause: unknown,
): HttpException {
  return new HttpException(
    { code, message, details: {} } satisfies ErrorResponse,
    HttpStatus.SERVICE_UNAVAILABLE,
    { cause },
  );
}
