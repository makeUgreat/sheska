import { type GetSourceResponse } from '@/entities/source';
import { formatBytes, formatDottedDate, formatTime } from '@/shared/lib';
import { CopyButton } from '@/shared/ui';

const KEY = 'text-text-muted';

function dateTime(value: string) {
  return `${formatDottedDate(value)} ${formatTime(value)}`;
}

export function SourceFileSection({ source }: { source: GetSourceResponse }) {
  return (
    <section aria-labelledby="source-file-heading">
      <h2 id="source-file-heading" className="mb-3 font-mono text-label-sm uppercase text-text-muted">
        파일
      </h2>
      <dl className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 font-mono text-label-sm tracking-normal tabular-nums">
        <dt className={KEY}>크기</dt>
        <dd className="col-span-2 text-text-secondary">{formatBytes(source.sizeBytes)}</dd>
        <dt className={KEY}>수정</dt>
        <dd className="col-span-2 text-text-secondary">{dateTime(source.updatedAt)}</dd>
        <dt className={KEY}>생성</dt>
        <dd className="col-span-2 text-text-secondary">{dateTime(source.createdAt)}</dd>
        <dt className={KEY}>id</dt>
        <dd title={source.sourceId} className="truncate text-text-secondary">
          {source.sourceId}
        </dd>
        <dd>
          <CopyButton value={source.sourceId} label="source id 복사" />
        </dd>
        <dt className={KEY}>hash</dt>
        <dd title={source.fingerprint} className="truncate text-text-secondary">
          {source.fingerprint}
        </dd>
        <dd>
          <CopyButton value={source.fingerprint} label="fingerprint 복사" />
        </dd>
      </dl>
    </section>
  );
}
