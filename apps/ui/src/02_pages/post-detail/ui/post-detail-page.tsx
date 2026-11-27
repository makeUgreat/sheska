import { useParams } from 'react-router-dom';
import { PostArticle } from '@/widgets/post-article';

/**
 * 머리판은 화면 폭 전체에 깔리므로 가로로 넘친 부분을 여기서 자른다. `clip`은 scroll 컨테이너를 만들지 않아 sticky를 깨지 않는다.
 * 아래 여백은 화면 아래에 떠 있는 질문 줄이 마지막 문단을 가리지 않을 만큼 둔다.
 */
export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="min-h-screen overflow-x-clip bg-page-background px-4 pb-24">
      <div className="relative mx-auto max-w-measure">
        <PostArticle postId={id} />
      </div>
    </main>
  );
}
