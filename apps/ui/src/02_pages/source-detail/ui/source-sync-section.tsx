import { type EmbeddingInfo, type SyncJob, type SyncJobSummary } from '@/entities/source';
import { formatDottedMonthDay, formatTime } from '@/shared/lib';
import { CopyButton } from '@/shared/ui';

const MAX_CHUNK_CELLS = 40;

const KEY = 'text-text-muted';

interface Display {
  glyph: string;
  label: string;
  aside?: string;
  description?: string;
}

function processedChunksOf(syncJob: SyncJob | SyncJobSummary): number {
  return 'processedChunks' in syncJob ? (syncJob.processedChunks ?? 0) : 0;
}

function displayOf(syncJob: SyncJob | SyncJobSummary | null): Display {
  if (!syncJob) return { glyph: '○', label: '기록 없음', description: '아직 이 파일을 동기화한 적이 없습니다.' };

  const total = syncJob.totalChunks;
  switch (syncJob.status) {
    case 'waiting':
      return { glyph: '◌', label: '대기 중', aside: total === null ? '청크 나누기 전' : `${total} 청크` };
    case 'processing': {
      const processed = processedChunksOf(syncJob);
      const percent = total ? Math.round((processed / total) * 100) : 0;
      return { glyph: '◐', label: '임베딩 중', aside: total ? `${processed} / ${total} · ${percent}%` : undefined };
    }
    case 'completed':
      return { glyph: '●', label: '완료', aside: total ? `${total} 청크` : '청크 없음' };
    case 'failed':
      return {
        glyph: '✕',
        label: '실패',
        description: '임베딩을 만들지 못했습니다. 플러그인이 이 파일을 다시 보내면 재시도합니다.',
      };
  }
}

function shortDateTime(value: string) {
  return `${formatDottedMonthDay(value)} ${formatTime(value)}`;
}

function ChunkTrack({ syncJob }: { syncJob: SyncJob | SyncJobSummary }) {
  const total = syncJob.totalChunks ?? 0;
  const completed = syncJob.status === 'completed';
  const processing = syncJob.status === 'processing';
  const processed = processing ? processedChunksOf(syncJob) : 0;

  if (total === 0) {
    if (syncJob.status !== 'waiting') return null;
    return <div aria-hidden="true" className="mt-3 h-1 animate-pulse rounded-full bg-plate-line motion-reduce:animate-none" />;
  }

  const done = completed ? total : processed;
  const progress = {
    role: 'progressbar',
    'aria-label': '임베딩한 청크',
    'aria-valuemin': 0,
    'aria-valuemax': total,
    'aria-valuenow': done,
  } as const;

  if (total > MAX_CHUNK_CELLS) {
    return (
      <div {...progress} className="mt-3 h-1 overflow-hidden rounded-full bg-plate-line">
        <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${(done / total) * 100}%` }} />
      </div>
    );
  }

  return (
    <div {...progress} className="mt-3 flex h-2 gap-0.5">
      {Array.from({ length: total }, (_, index) => {
        const filled = completed || index < processed;
        const current = processing && index === processed;
        return (
          <span
            key={index}
            className={`flex-1 rounded-[1px] ${filled || current ? 'bg-accent' : 'bg-plate-line'} ${current ? 'animate-pulse motion-reduce:animate-none' : ''}`}
          />
        );
      })}
    </div>
  );
}

export function SourceSyncSection({ syncJob, embedding }: { syncJob: SyncJob | SyncJobSummary | null; embedding: EmbeddingInfo | null }) {
  const display = displayOf(syncJob);
  const completed = syncJob?.status === 'completed';

  return (
    <section aria-labelledby="source-sync-heading">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="source-sync-heading" className="font-mono text-label-sm uppercase text-text-muted">
          동기화
        </h2>
        {display.aside && <span className="font-mono text-label-sm tracking-normal text-text-muted tabular-nums">{display.aside}</span>}
      </div>
      <p className="text-body-sm font-medium text-text-primary">
        <span aria-hidden="true" className={`mr-1.5 font-mono ${completed ? 'text-accent-strong' : ''}`}>
          {display.glyph}
        </span>
        {display.label}
      </p>
      {syncJob && <ChunkTrack syncJob={syncJob} />}
      {display.description && <p className="mt-1.5 text-body-sm text-text-secondary">{display.description}</p>}

      <dl className="mt-3 grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 font-mono text-label-sm tracking-normal tabular-nums">
        {syncJob && (
          <>
            <dt className={KEY}>시작</dt>
            <dd className="col-span-2 text-text-secondary">{shortDateTime(syncJob.createdAt)}</dd>
          </>
        )}
        {embedding && (
          <>
            <dt className={KEY}>모델</dt>
            <dd title={embedding.model} className="col-span-2 truncate text-text-secondary">
              {embedding.model} · {embedding.dimensions}d
            </dd>
            <dt className={KEY}>임베딩</dt>
            <dd className="col-span-2 text-text-secondary">{shortDateTime(embedding.updatedAt)}</dd>
          </>
        )}
        {syncJob?.status === 'failed' && (
          <>
            <dt className={KEY}>job</dt>
            <dd title={syncJob.syncJobId} className="truncate text-text-secondary">
              {syncJob.syncJobId}
            </dd>
            <dd>
              <CopyButton value={syncJob.syncJobId} label="sync job id 복사" />
            </dd>
          </>
        )}
      </dl>

      {syncJob && !completed && embedding && (
        <p className="mt-2.5 text-label-sm tracking-normal text-text-muted">
          검색은 이전 버전({formatDottedMonthDay(embedding.updatedAt)} 임베딩) 기준으로 동작합니다.
        </p>
      )}
    </section>
  );
}
