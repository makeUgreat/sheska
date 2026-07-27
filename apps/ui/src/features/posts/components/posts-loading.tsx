import { LoadingDots } from '@/shared/ui/loading-dots';

export function PostsLoading({
  label = 'Loading more posts...',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={['mt-24 flex flex-col items-center gap-4 pt-12', className]
        .filter(Boolean)
        .join(' ')}
    >
      <LoadingDots />
      <span className="font-mono text-xs font-medium uppercase tracking-widest text-text-muted opacity-60">
        {label}
      </span>
    </div>
  );
}

export function EndOfPosts() {
  return (
    <div className="mt-24 flex flex-col items-center gap-4 pt-12">
      <span className="font-mono text-xs font-medium uppercase tracking-widest text-text-muted opacity-60">
        End of posts
      </span>
    </div>
  );
}
