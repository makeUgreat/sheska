import { describe, expect, it, vi } from 'vitest';
import { type EmbedRequestDispatcher } from '@contexts/ingestion/application/ports';
import { IngestSourceHandler } from '../ingest-source.handler';

describe('IngestSourceHandler', () => {
  it('sync_job.created 이벤트를 처리해 embed-request dispatcher로 요청을 넘긴다', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const dispatcher: EmbedRequestDispatcher = { enqueue };
    const handler = new IngestSourceHandler(dispatcher);

    const event = {
      aggregateId: 'sync-job-1',
      sourceId: 'source-1',
      content: '# Source note',
    };

    await handler.handle(event);

    expect(enqueue).toHaveBeenCalledWith({
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      content: '# Source note',
    });
  });
});
