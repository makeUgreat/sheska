import { describe, expect, it, vi } from 'vitest';
import { type Queue } from 'bullmq';
import { EmbedResultBullMqDispatcher } from '../embed-result.bullmq.dispatcher';

describe('EmbedResultBullMqDispatcher', () => {
  it('embed-result job name으로 큐에 payload를 추가한다', async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const dispatcher = new EmbedResultBullMqDispatcher({
      add,
    } as unknown as Queue);
    const payload = {
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      model: 'qwen3-embedding:0.6b',
      chunks: [],
    };

    await dispatcher.enqueue(payload);

    expect(add).toHaveBeenCalledWith('embed-result', payload);
  });
});
