import { Link, useParams } from 'react-router-dom';
import { useSource, useSyncJob } from '@/entities/source';
import { PublishPostPanel } from '@/features/publish-post';
import { EmptyState, ErrorState, Markdown } from '@/shared/ui';
import { SourceFileSection } from './source-file-section';
import { SourceSyncSection } from './source-sync-section';

function formatFrontmatterValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value.join(', ');

  return JSON.stringify(value);
}

function FrontmatterSection({ frontmatter }: { frontmatter: Record<string, unknown> }) {
  const entries = Object.entries(frontmatter);
  if (entries.length === 0) return null;

  return (
    <dl
      aria-label="Frontmatter"
      className="mb-8 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 border-b border-plate-line pb-6 text-body-sm"
    >
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="font-mono text-code-snippet text-text-muted">{key}</dt>
          <dd className="min-w-0 break-words text-text-primary">{formatFrontmatterValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: source, isLoading, error } = useSource(id);
  const { data: polledSyncJob } = useSyncJob(source?.latestSyncJob, source?.sourceId);
  const displayedSyncJob = polledSyncJob ?? source?.latestSyncJob ?? null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link to="/sources" className="font-mono text-label-sm tracking-normal text-text-muted hover:text-text-primary">
        ← sources
      </Link>
      {isLoading ? null : error ? (
        <ErrorState error={error} />
      ) : source ? (
        <>
          <header className="mt-4 border-b border-plate-line pb-6">
            <h1 className="break-words text-balance text-headline-sm text-text-primary">{source.title}</h1>
            <p className="mt-1.5 break-all font-mono text-code-snippet text-text-muted">{source.externalSourceId}</p>
          </header>

          {/* 좁은 화면에서 레일이 원문 위로 올라오도록 DOM 순서를 [레일, 원문]으로 두고 넓을 때만 뒤집어 놓는다. */}
          <div className="mt-8 flex flex-row-reverse flex-wrap gap-x-12 gap-y-8">
            <aside
              aria-label="Source 상태"
              className="min-w-0 flex-[1_1_18rem] divide-y divide-plate-line [&>section]:py-5 [&>section:first-child]:pt-0"
            >
              <PublishPostPanel
                sourceId={source.sourceId}
                publishedPostId={source.publishedPostId}
                syncCompleted={displayedSyncJob?.status === 'completed'}
              />
              <SourceSyncSection syncJob={displayedSyncJob} embedding={source.embedding} />
              <SourceFileSection source={source} />
            </aside>

            <div className="min-w-0 flex-[999_1_35rem]">
              <FrontmatterSection frontmatter={source.frontmatter} />
              <Markdown body={source.body} />
            </div>
          </div>
        </>
      ) : (
        <EmptyState variant="document" className="py-24" />
      )}
    </main>
  );
}
