import { type MutableRefObject, type ReactNode } from 'react';
import { searchPosts, type SearchPostsResponse } from '@/entities/post';
import { useHttpClient } from '@/shared/api';
import { formatMonthDay } from '@/shared/lib';
import {
  printRequestFailure,
  TerminalEntryLink,
  TerminalHighlight,
  TerminalMeter,
  TerminalText,
  TerminalTree,
  TerminalTreeRoot,
  type TerminalCommand,
  type TerminalListedEntry,
  type TerminalTreeItem,
} from '@/shared/ui';

const RESULT_LIMIT = 10;

type SearchHit = SearchPostsResponse['posts'][number];

export function useSearchCommand({
  recent,
}: {
  /** 결과를 남겨 두면 `cat`이 Tab으로 제목을 채운다. */
  recent: MutableRefObject<TerminalListedEntry[]>;
}): TerminalCommand {
  const http = useHttpClient();

  return {
    name: 'grep',
    usage: 'grep <words>',
    summary: 'search posts by title or content',
    async run(args, io) {
      const query = args.join(' ');
      if (!query) {
        io.print(<TerminalText tone="error">usage: grep &lt;words&gt;</TerminalText>);
        return;
      }

      io.progress(`searching titles and bodies for "${query}"`);
      try {
        const { posts, nextCursor } = await searchPosts(http, {
          query,
          limit: RESULT_LIMIT,
        });
        if (posts.length === 0) {
          io.print(<TerminalText tone="muted">no posts match &quot;{query}&quot;</TerminalText>);
          return;
        }

        recent.current = posts.map((post) => ({
          title: post.title,
          to: `/posts/${post.postId}`,
        }));

        io.print(
          <TerminalTree
            root={<TerminalTreeRoot label={`"${query}"`} note={matches(posts.length, nextCursor !== null)} />}
            items={posts.map((post) => hitItem(post, args))}
            footer="cat + Tab to open one"
          />,
        );
      } catch (error) {
        printRequestFailure(io, 'grep', error);
      }
    },
  };
}

function hitItem(post: SearchHit, words: string[]): TerminalTreeItem {
  return {
    key: post.postId,
    head: <TerminalEntryLink title={post.title} to={`/posts/${post.postId}`} date={formatMonthDay(post.createdAt)} highlight={words} />,
    details: detailsOf(post, words),
  };
}

/** 본문 발췌와 의미 검색 유사도 중 있는 것을 한 줄씩 보인다. */
function detailsOf(post: SearchHit, words: string[]) {
  const details: ReactNode[] = [];
  if (post.snippet) {
    details.push(<TerminalHighlight text={toOneLine(post.snippet)} words={words} className="text-white" />);
  }
  if (post.similarity !== null) {
    details.push(
      <>
        similar in meaning <TerminalMeter percent={post.similarity} />
      </>,
    );
  }

  return details;
}

/** 발췌는 markdown 원문이라 줄 앞의 제목 기호를 지우고 한 줄로 만든다. */
function toOneLine(text: string) {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matches(count: number, more: boolean) {
  if (more) return `first ${count} matches`;
  return `${count} ${count === 1 ? 'match' : 'matches'}`;
}
