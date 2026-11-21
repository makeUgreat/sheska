import { useParams } from 'react-router-dom';
import { PostViews } from '@/widgets/post-views';
import { BackLink } from '@/shared/ui';

/** 제목을 띄우지 않는다. 띄우려면 본문까지 담긴 상세 응답을 한 번 더 받아야 한다. */
export function PostViewsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-page-background px-4 pb-24">
      <div className="mx-auto max-w-measure pt-10">
        <BackLink to={id ? `/posts/${id}` : '/posts'} label="Back to post" title="글로" className="-ml-2.5" />
        <h1 className="mt-3 font-mono text-label-sm uppercase text-text-muted">View history</h1>
        <div className="mt-7">
          <PostViews postId={id} />
        </div>
      </div>
    </main>
  );
}
