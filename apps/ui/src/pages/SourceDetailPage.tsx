import { Link, useParams } from 'react-router-dom';
import { useSource } from '@/api/queries';
import { type SyncJobSummary, type EmbeddingInfo } from '@/api/client';

function SyncJobSection({ syncJob }: { syncJob: SyncJobSummary | null }) {
  if (!syncJob) {
    return (
      <>
        <dt>Embedding Status</dt>
        <dd className="text-gray-400">No job</dd>
      </>
    );
  }

  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  } as const;

  const style = styles[syncJob.status] ?? 'bg-gray-100 text-gray-700';

  return (
    <>
      <dt>Embedding Status</dt>
      <dd>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}
        >
          {syncJob.status}
        </span>
        <span className="ml-2 text-sm text-gray-500">
          {new Date(syncJob.createdAt).toLocaleString()}
        </span>
      </dd>
      <dt>Sync Job ID</dt>
      <dd className="font-mono text-sm">{syncJob.syncJobId}</dd>
    </>
  );
}

function EmbeddingSection({ embedding }: { embedding: EmbeddingInfo | null }) {
  if (!embedding) {
    return (
      <>
        <dt>Embedding</dt>
        <dd className="text-gray-400">Not yet generated</dd>
      </>
    );
  }

  return (
    <>
      <dt>Embedding Model</dt>
      <dd>{embedding.model}</dd>
      <dt>Dimensions</dt>
      <dd>{embedding.dimensions}</dd>
      <dt>Embedding Created</dt>
      <dd>{new Date(embedding.createdAt).toLocaleString()}</dd>
      <dt>Embedding Updated</dt>
      <dd>{new Date(embedding.updatedAt).toLocaleString()}</dd>
    </>
  );
}

export function SourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: source, isLoading, error } = useSource(id);

  return (
    <main>
      <Link to="/">← Back to sources</Link>
      {isLoading ? (
        <p>Loading...</p>
      ) : error ? (
        <p role="alert">Error: {error.message}</p>
      ) : source ? (
        <>
          <h1>{source.externalSourceId}</h1>
          <dl>
            <dt>ID</dt>
            <dd>{source.sourceId}</dd>
            <dt>Fingerprint</dt>
            <dd>{source.fingerprint}</dd>
            <dt>Size</dt>
            <dd>{source.sizeBytes} bytes</dd>
            <dt>Created</dt>
            <dd>{new Date(source.createdAt).toLocaleString()}</dd>
            <dt>Updated</dt>
            <dd>{new Date(source.updatedAt).toLocaleString()}</dd>
            <SyncJobSection syncJob={source.latestSyncJob} />
            <EmbeddingSection embedding={source.embedding} />
          </dl>
          <pre>{source.content}</pre>
        </>
      ) : null}
    </main>
  );
}
