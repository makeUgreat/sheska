import { SourceList } from '@/widgets/source-list';

export function SourceListPage() {
  return (
    <main className="min-h-screen bg-page-background px-4 py-20">
      <div className="mx-auto max-w-[800px]">
        <div className="mb-16">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-accent">
            /sources
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl">
            Sources
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-text-secondary">
            Source documents available for indexing, syncing, and publishing.
          </p>
        </div>

        <SourceList />
      </div>
    </main>
  );
}
