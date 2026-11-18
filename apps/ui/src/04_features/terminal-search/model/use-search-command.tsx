import { searchPosts } from '@/entities/post';
import { useHttpClient } from '@/shared/api';
import { formatMonthDay } from '@/shared/lib';
import {
  printRequestFailure,
  TerminalListRow,
  TerminalText,
  type TerminalCommand,
} from '@/shared/ui';

const RESULT_LIMIT = 10;

export function useSearchCommand(): TerminalCommand {
  const http = useHttpClient();

  return {
    name: 'grep',
    usage: 'grep <words>',
    summary: 'search posts by title or content',
    async run(args, io) {
      const query = args.join(' ');
      if (!query) {
        io.print(
          <TerminalText tone="error">usage: grep &lt;words&gt;</TerminalText>,
        );
        return;
      }
      try {
        const { posts, nextCursor } = await searchPosts(http, {
          query,
          limit: RESULT_LIMIT,
        });
        if (posts.length === 0) {
          io.print(
            <TerminalText tone="muted">
              no posts match &quot;{query}&quot;
            </TerminalText>,
          );
          return;
        }
        io.print(
          <TerminalText tone="muted">
            {nextCursor
              ? `showing the first ${posts.length} posts that match "${query}"`
              : `${posts.length} ${posts.length === 1 ? 'post matches' : 'posts match'} "${query}"`}
          </TerminalText>,
        );
        for (const post of posts) {
          io.print(
            <TerminalListRow
              date={formatMonthDay(post.createdAt)}
              title={post.title}
              to={`/posts/${post.postId}`}
            />,
          );
        }
      } catch (error) {
        printRequestFailure(io, 'grep', error);
      }
    },
  };
}
