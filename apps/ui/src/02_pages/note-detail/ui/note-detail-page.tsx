import { useParams } from 'react-router-dom';
import { NoteArticle } from '@/widgets/note-article';
import { ActionLink } from '@/shared/ui';

export function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-page-background px-4 py-14">
      <div className="mx-auto max-w-[var(--spacing-measure)]">
        <ActionLink to="/notes" className="mb-10">
          Back to notes
        </ActionLink>

        <NoteArticle noteId={id} />
      </div>
    </main>
  );
}
