import { SourceList } from '@/widgets/source-list';

export function SourceListPage() {
  return (
    <main className="min-h-screen bg-page-background px-4 pb-32 pt-16">
      <div className="mx-auto max-w-measure">
        <h1 className="text-body-md font-semibold text-text-primary">
          Sources
        </h1>
        <p className="mt-1 mb-8 text-body-md text-text-muted">
          Files collected from the vault, their embedding state and what was
          published from them.
        </p>

        <SourceList />
      </div>
    </main>
  );
}
