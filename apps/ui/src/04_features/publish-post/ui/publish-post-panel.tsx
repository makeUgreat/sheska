import { Link } from 'react-router-dom';
import { usePublishPost } from '@/entities/post';

export function PublishPostPanel({
  sourceId,
  publishedPostId,
}: {
  sourceId: string;
  publishedPostId: string | null;
}) {
  const publishPost = usePublishPost();

  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50 p-5">
      <h2 className="text-base font-semibold text-gray-950">게시하기</h2>
      {publishedPostId ? (
        <p className="mt-4 text-sm text-gray-700">
          이미 게시되었습니다.{' '}
          <Link
            to={`/posts/${publishedPostId}`}
            className="font-medium text-[#e06c75] underline"
          >
            게시된 포스트 보기
          </Link>
        </p>
      ) : (
        <div className="mt-4">
          <button
            onClick={() => publishPost.mutate({ sourceId })}
            disabled={publishPost.isPending}
            className="w-full rounded-md bg-gray-950 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {publishPost.isPending ? '게시 중...' : '게시하기'}
          </button>
        </div>
      )}
      {publishPost.isSuccess && (
        <p className="mt-4 text-sm text-[#e06c75]">
          포스트가 게시되었습니다.{' '}
          <Link
            to={`/posts/${publishPost.data.postId}`}
            className="font-medium underline"
          >
            게시된 포스트 보기
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
  );
}
