import { describe, expect, it, vi } from 'vitest';
import { type Queue } from 'bullmq';
import { EmbedRequestBullMqDispatcher } from '../embed-request.bullmq.dispatcher';

describe('EmbedRequestBullMqDispatcher', () => {
  it('embed-request job name으로 큐에 payload를 추가한다', async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const dispatcher = new EmbedRequestBullMqDispatcher({
      add,
    } as unknown as Queue);
    const payload = {
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      content: '# Source note',
    };

    await dispatcher.enqueue(payload);

    expect(add).toHaveBeenCalledWith('embed-request', payload);
  });

  it('idempotency key를 BullMQ job id로 사용한다', async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const dispatcher = new EmbedRequestBullMqDispatcher({
      add,
    } as unknown as Queue);
    const payload = {
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      content: '# Source note',
    };

    await dispatcher.enqueue(payload, { idempotencyKey: 'event-1' });

    expect(add).toHaveBeenCalledWith('embed-request', payload, {
      jobId: 'event-1',
    });
  });
});
