import { Link, useParams } from 'react-router-dom';
import { useSource } from '@/api/queries';

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
          </dl>
          <pre>{source.content}</pre>
        </>
      ) : null}
    </main>
  );
}
