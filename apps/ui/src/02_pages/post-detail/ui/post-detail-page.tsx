import { useParams } from 'react-router-dom';
import { PostArticle } from '@/widgets/post-article';
import { BackLink } from '@/shared/ui';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-page-background px-4 py-14">
      <div className="mx-auto max-w-measure">
        <BackLink to="/posts" className="mb-10">
          Back to posts
        </BackLink>

        <PostArticle postId={id} />
      </div>
    </main>
  );
}
