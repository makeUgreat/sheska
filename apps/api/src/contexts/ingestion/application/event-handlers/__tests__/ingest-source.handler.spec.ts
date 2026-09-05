import { describe, expect, it, vi } from 'vitest';
import { type Queue } from 'bullmq';
import { IngestSourceHandler } from '../ingest-source.handler';

describe('IngestSourceHandler', () => {
  it('sync_job.created 이벤트를 처리해 embed-requests 큐에 요청을 추가한다', async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const handler = new IngestSourceHandler({ add } as unknown as Queue);

    const event = {
      aggregateId: 'sync-job-1',
      sourceId: 'source-1',
      content: '# Source note',
    };

    await handler.handle(event);

    expect(add).toHaveBeenCalledWith('embed-request', {
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      content: '# Source note',
    });
  });
});
