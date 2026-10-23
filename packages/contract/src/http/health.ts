import * as z from 'zod';
import { defineApi } from './api.js';

export const HealthErrorCode = {
  /** DB에 닿지 못한다. */
  DATABASE_UNREACHABLE: 'health.database_unreachable',
  /** 큐에 닿지 못한다. */
  QUEUE_UNREACHABLE: 'health.queue_unreachable',
} as const;

const healthySchema = z.object({
  status: z.literal('ok'),
});

/** 배포 환경과 클라이언트가 API 서버의 상태를 확인하는 API다. */
export const HealthApi = {
  /** 프로세스가 요청을 받을 수 있으면 200이다. 의존성은 확인하지 않는다. */
  live: defineApi({
    method: 'GET',
    path: '/livez',
    response: healthySchema,
    errors: [],
  }),

  /** DB와 큐에 닿으면 200, 하나라도 닿지 못하면 503이다. */
  ready: defineApi({
    method: 'GET',
    path: '/readyz',
    response: healthySchema,
    errors: [
      HealthErrorCode.DATABASE_UNREACHABLE,
      HealthErrorCode.QUEUE_UNREACHABLE,
    ],
  }),
};
