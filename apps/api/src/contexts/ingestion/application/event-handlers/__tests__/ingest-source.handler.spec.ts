import { describe, expect, it, vi } from 'vitest';
import { IngestSourceHandler } from '../ingest-source.handler';

describe('IngestSourceHandler', () => {
  it('sync_job.created 이벤트를 embed job으로 dispatch한다', async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);
    const handler = new IngestSourceHandler({ dispatch });

    const event = {
      aggregateId: 'sync-job-1',
      sourceId: 'source-1',
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    };

    await handler.handle(event);

    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledWith({
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      content: '# Source note',
    });
  });
});
