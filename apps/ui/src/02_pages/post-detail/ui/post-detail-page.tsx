import { useParams } from 'react-router-dom';
import { PostArticle } from '@/widgets/post-article';
import { BackLink } from '@/shared/ui';

/** 여백에서는 펼쳐질 label 자리가 모자라서 화살표만 둔다. label은 링크 이름으로 남는다. */
const BACK_LINK_IN_MARGIN =
  'margin-label:absolute margin-label:top-1 margin-label:right-[calc(100%+var(--spacing-gutter))] ' +
  'margin-label:[&>span]:max-w-0! margin-label:[&>span]:opacity-0!';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-page-background px-4 py-14">
      <div className="relative mx-auto max-w-measure">
        <BackLink to="/posts" className={`mb-10 ${BACK_LINK_IN_MARGIN}`}>
          Back to posts
        </BackLink>

        <PostArticle postId={id} />
      </div>
    </main>
  );
}
