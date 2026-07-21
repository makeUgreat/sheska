import { Link, useParams } from 'react-router-dom';
import { useSource, usePublishPost } from '@/api/queries';
import { type SyncJobSummary, type EmbeddingInfo } from '@/api/client';
import { SyncJobBadge, SyncJobProgress } from '@/components/sync-job-status';

function SyncJobSection({ syncJob }: { syncJob: SyncJobSummary | null }) {
  if (!syncJob) {
    return (
      <>
        <dt className="text-xs font-medium uppercase text-gray-500">
          Embedding Status
        </dt>
        <dd className="text-sm text-gray-400">No job</dd>
      </>
    );
  }

  return (
    <>
      <dt className="text-xs font-medium uppercase text-gray-500">
        Embedding Status
      </dt>
      <dd className="text-sm text-gray-900">
        <div className="flex items-center gap-2">
          <SyncJobBadge status={syncJob.status} />
          <span className="text-sm text-gray-500">
            {new Date(syncJob.createdAt).toLocaleString()}
          </span>
        </div>
        <div className="mt-2">
          <SyncJobProgress syncJob={syncJob} />
        </div>
      </dd>
      <dt className="text-xs font-medium uppercase text-gray-500">
        Sync Job ID
      </dt>
      <dd className="break-all font-mono text-sm text-gray-900">
        {syncJob.syncJobId}
      </dd>
    </>
  );
}

function EmbeddingSection({ embedding }: { embedding: EmbeddingInfo | null }) {
  if (!embedding) {
    return (
      <>
        <dt className="text-xs font-medium uppercase text-gray-500">
          Embedding
        </dt>
        <dd className="text-sm text-gray-400">Not yet generated</dd>
      </>
    );
  }

  return (
    <>
      <dt className="text-xs font-medium uppercase text-gray-500">
        Embedding Model
      </dt>
      <dd className="break-all text-sm text-gray-900">{embedding.model}</dd>
      <dt className="text-xs font-medium uppercase text-gray-500">
        Dimensions
      </dt>
      <dd className="text-sm text-gray-900">{embedding.dimensions}</dd>
      <dt className="text-xs font-medium uppercase text-gray-500">
        Embedding Created
      </dt>
      <dd className="text-sm text-gray-900">
        {new Date(embedding.createdAt).toLocaleString()}
      </dd>
      <dt className="text-xs font-medium uppercase text-gray-500">
        Embedding Updated
      </dt>
      <dd className="text-sm text-gray-900">
        {new Date(embedding.updatedAt).toLocaleString()}
      </dd>
    </>
  );
}

export function SourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: source, isLoading, error } = useSource(id);
  const publishPost = usePublishPost();

  function handlePublish(sourceId: string) {
    publishPost.mutate({ sourceId });
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link
        to="/sources"
        className="mb-6 inline-block text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        ← Back to sources
      </Link>
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : error ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Error: {error.message}
        </p>
      ) : source ? (
        <>
          <header className="mb-8 border-b border-gray-200 pb-6">
            <p className="mb-2 text-xs font-semibold uppercase text-blue-600">
              Source
            </p>
            <h1 className="break-words text-3xl font-bold text-gray-950">
              {source.externalSourceId}
            </h1>
            <p className="mt-3 text-sm text-gray-500">
              {source.sizeBytes} bytes · Updated{' '}
              {new Date(source.updatedAt).toLocaleString()}
            </p>
          </header>

          <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
            <dl className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-gray-500">
                  ID
                </dt>
                <dd className="mt-1 break-all font-mono text-sm text-gray-900">
                  {source.sourceId}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-500">
                  Size
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {source.sizeBytes} bytes
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase text-gray-500">
                  Fingerprint
                </dt>
                <dd className="mt-1 break-all font-mono text-sm text-gray-900">
                  {source.fingerprint}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-500">
                  Created
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(source.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-500">
                  Updated
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(source.updatedAt).toLocaleString()}
                </dd>
              </div>
              <div className="sm:col-span-2 grid gap-3 border-t border-gray-200 pt-4">
                <SyncJobSection syncJob={source.latestSyncJob} />
                <EmbeddingSection embedding={source.embedding} />
              </div>
            </dl>

            <section className="rounded-lg border border-gray-200 bg-gray-50 p-5">
              <h2 className="text-base font-semibold text-gray-950">
                게시하기
              </h2>
              <div className="mt-4">
                <button
                  onClick={() => handlePublish(source.sourceId)}
                  disabled={publishPost.isPending}
                  className="w-full rounded-md bg-gray-950 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {publishPost.isPending ? '게시 중...' : '게시하기'}
                </button>
              </div>
              {publishPost.isSuccess && (
                <p className="mt-4 text-sm text-green-700">
                  포스트가 게시되었습니다.{' '}
                  <Link to="/posts" className="font-medium underline">
                    포스트 목록 보기
                  </Link>
                </p>
              )}
              {publishPost.isError && (
                <p
                  role="alert"
                  className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  오류: {publishPost.error.message}
                </p>
              )}
            </section>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-950">
              Content
            </h2>
            <pre className="max-h-[36rem] overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-950 p-5 text-sm leading-6 text-gray-100">
              {source.content}
            </pre>
          </section>
        </>
      ) : null}
    </main>
  );
}
