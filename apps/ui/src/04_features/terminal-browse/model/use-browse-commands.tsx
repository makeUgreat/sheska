import { type MutableRefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { countPosts, listPosts, type PostSummary } from '@/entities/post';
import { type Viewer } from '@/entities/session';
import { listSources, type SourceSummary } from '@/entities/source';
import { useHttpClient } from '@/shared/api';
import { formatMonthDay } from '@/shared/lib';
import {
  printRequestFailure,
  TerminalEntryLink,
  TerminalText,
  TerminalTree,
  TerminalTreeRoot,
  type TerminalCommand,
  type TerminalListedEntry,
  type TerminalTreeItem,
} from '@/shared/ui';

/** `~`는 post 목록이고 `~/sources`는 소유자에게만 있다. */
export type Directory = 'home' | 'sources';

export function directoryPath(directory: Directory): string {
  return directory === 'home' ? '~' : '~/sources';
}

const PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

interface Entry extends TerminalListedEntry {
  id: string;
  date: string;
}

export function useBrowseCommands({
  viewer,
  directory,
  onDirectoryChange,
  recent,
}: {
  viewer: Viewer;
  directory: Directory;
  onDirectoryChange: (directory: Directory) => void;
  /** 방금 보인 목록. `grep`도 여기에 쓴다. */
  recent: MutableRefObject<TerminalListedEntry[]>;
}): TerminalCommand[] {
  const http = useHttpClient();
  const navigate = useNavigate();
  const owner = viewer === 'owner';
  const where: Directory = owner ? directory : 'home';

  async function fetchPosts(all: boolean) {
    if (all) {
      const posts: PostSummary[] = [];
      let cursor: string | undefined;
      do {
        const page = await listPosts(http, { cursor, limit: MAX_PAGE_SIZE });
        posts.push(...page.posts);
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      return { entries: posts.map(postEntry), total: posts.length };
    }

    const [page, { count }] = await Promise.all([listPosts(http, { limit: PAGE_SIZE }), countPosts(http)]);
    return { entries: page.posts.map(postEntry), total: count };
  }

  async function fetchSources(all: boolean) {
    const pageSize = all ? MAX_PAGE_SIZE : PAGE_SIZE;
    const sources: SourceSummary[] = [];
    let page = 1;
    let totalPages = 1;
    let total = 0;

    do {
      const result = await listSources(http, { page, pageSize });
      sources.push(...result.sources);
      totalPages = result.totalPages;
      total = result.totalCount;
      page += 1;
    } while (all && page <= totalPages);

    return { entries: sources.map(sourceEntry), total };
  }

  async function countSources() {
    const { totalCount } = await listSources(http, { page: 1, pageSize: 1 });
    return totalCount;
  }

  async function fetchEverything(): Promise<TerminalListedEntry[]> {
    const { entries } = where === 'home' ? await fetchPosts(true) : await fetchSources(true);
    return entries;
  }

  const ls: TerminalCommand = {
    name: 'ls',
    usage: 'ls [-a]',
    summary: where === 'home' ? 'list recent posts' : 'list recent sources',
    async run(args, io) {
      const unknown = args.find((arg) => arg !== '-a');
      if (unknown) {
        io.print(<TerminalText tone="error">ls: cannot access &apos;{unknown}&apos;: No such file or directory</TerminalText>);
        return;
      }

      const all = args.includes('-a');
      try {
        if (where === 'sources') {
          const { entries, total } = await fetchSources(all);
          recent.current = entries;
          io.print(
            <TerminalTree
              root={<TerminalTreeRoot label="~/sources" note={notes(total)} />}
              items={entries.map(entryItem)}
              footer={moreFooter(entries.length, total)}
            />,
          );
          return;
        }
        const [{ entries, total }, sourceCount] = await Promise.all([fetchPosts(all), owner ? countSources() : Promise.resolve(null)]);
        recent.current = entries;

        const folder: TerminalTreeItem[] =
          sourceCount === null
            ? []
            : [
                {
                  key: 'sources',
                  head: <TerminalTreeRoot label="sources/" note={notes(sourceCount)} />,
                },
              ];
        io.print(
          <TerminalTree
            root={<TerminalTreeRoot label="~" note={posts(total)} />}
            items={[...folder, ...entries.map(entryItem)]}
            footer={moreFooter(entries.length, total)}
          />,
        );
      } catch (error) {
        printRequestFailure(io, 'ls', error);
      }
    },
  };

  const cat: TerminalCommand = {
    name: 'cat',
    usage: where === 'home' ? 'cat <post>' : 'cat <source>',
    summary: where === 'home' ? 'read a post' : 'read a source',
    async run(args, io) {
      const target = args.join(' ');
      if (!target) {
        io.print(<TerminalText tone="error">cat: missing operand</TerminalText>);
        return;
      }

      try {
        const entry = findEntry(recent.current, target) ?? findEntry(await fetchEverything(), target);
        if (!entry) {
          io.print(
            <TerminalText tone="error">
              cat: {target}: no such {where === 'home' ? 'post' : 'source'}
            </TerminalText>,
          );
          return;
        }

        navigate(entry.to);
      } catch (error) {
        printRequestFailure(io, 'cat', error);
      }
    },
    complete: (argument) => {
      const typed = argument.toLowerCase();
      return recent.current.map((entry) => entry.title).filter((title) => title.toLowerCase().startsWith(typed));
    },
  };

  const cd: TerminalCommand = {
    name: 'cd',
    usage: 'cd <dir>',
    summary: 'move to a folder',
    hidden: !owner,
    run(args, io) {
      const target = args[0] ?? '~';
      const next = resolveDirectory(target, where);
      if (!next || (next === 'sources' && !owner)) {
        io.print(<TerminalText tone="error">cd: no such file or directory: {target}</TerminalText>);
        return;
      }

      onDirectoryChange(next);
    },
    complete: () => (owner && where === 'home' ? ['sources'] : []),
  };

  return [ls, cat, cd];
}

function entryItem(entry: Entry): TerminalTreeItem {
  return {
    key: entry.id,
    head: <TerminalEntryLink title={entry.title} to={entry.to} date={formatMonthDay(entry.date)} />,
  };
}

function moreFooter(shown: number, total: number) {
  return total > shown ? `… ${(total - shown).toLocaleString('en-US')} more · ls -a` : undefined;
}

function posts(count: number) {
  return `${count.toLocaleString('en-US')} ${count === 1 ? 'post' : 'posts'}`;
}

function notes(count: number) {
  return `${count.toLocaleString('en-US')} ${count === 1 ? 'note' : 'notes'}`;
}

function postEntry(post: PostSummary): Entry {
  return {
    id: post.postId,
    title: post.title,
    date: post.createdAt,
    to: `/posts/${post.postId}`,
  };
}

function sourceEntry(source: SourceSummary): Entry {
  return {
    id: source.sourceId,
    title: source.title,
    date: source.updatedAt,
    to: `/sources/${source.sourceId}`,
  };
}

/** 제목이 같거나, 앞부분이 한 항목에만 맞으면 그 항목을 고른다. */
function findEntry(entries: TerminalListedEntry[], target: string): TerminalListedEntry | undefined {
  const wanted = target.toLowerCase();
  const exact = entries.find((entry) => entry.title.toLowerCase() === wanted);
  if (exact) return exact;

  const prefixed = entries.filter((entry) => entry.title.toLowerCase().startsWith(wanted));
  return prefixed.length === 1 ? prefixed[0] : undefined;
}

function resolveDirectory(target: string, current: Directory): Directory | null {
  const path = target.replace(/\/+$/, '');
  if (['~', '', '/', '..'].includes(path)) return 'home';
  if (['sources', '~/sources', '/sources'].includes(path)) return 'sources';
  if (path === '.') return current;
  return null;
}
