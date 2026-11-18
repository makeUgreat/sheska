import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { countPosts, listPosts, type PostSummary } from '@/entities/post';
import { type Viewer } from '@/entities/session';
import { listSources, type SourceSummary } from '@/entities/source';
import { useHttpClient } from '@/shared/api';
import { formatMonthDay } from '@/shared/lib';
import {
  printRequestFailure,
  TerminalListRow,
  TerminalText,
  type TerminalCommand,
  type TerminalIo,
} from '@/shared/ui';

/** `~`는 post 목록이고 `~/sources`는 소유자에게만 있다. */
export type Directory = 'home' | 'sources';

export function directoryPath(directory: Directory): string {
  return directory === 'home' ? '~' : '~/sources';
}

const PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

interface Entry {
  id: string;
  title: string;
  date: string;
}

export function useBrowseCommands({
  viewer,
  directory,
  onDirectoryChange,
}: {
  viewer: Viewer;
  directory: Directory;
  onDirectoryChange: (directory: Directory) => void;
}): TerminalCommand[] {
  const http = useHttpClient();
  const navigate = useNavigate();
  const listed = useRef<Record<Directory, Entry[]>>({ home: [], sources: [] });

  const where: Directory = viewer === 'owner' ? directory : 'home';

  async function fetchPosts(all: boolean) {
    if (!all) {
      const [page, { count }] = await Promise.all([
        listPosts(http, { limit: PAGE_SIZE }),
        countPosts(http),
      ]);
      return { entries: page.posts.map(postEntry), total: count };
    }
    const posts: PostSummary[] = [];
    let cursor: string | undefined;
    do {
      const page = await listPosts(http, { cursor, limit: MAX_PAGE_SIZE });
      posts.push(...page.posts);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return { entries: posts.map(postEntry), total: posts.length };
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

  async function fetchEverything() {
    const { entries } =
      where === 'home' ? await fetchPosts(true) : await fetchSources(true);
    return entries;
  }

  function linkOf(entry: Entry) {
    return where === 'home' ? `/posts/${entry.id}` : `/sources/${entry.id}`;
  }

  const ls: TerminalCommand = {
    name: 'ls',
    usage: 'ls [-a]',
    summary: where === 'home' ? 'list recent posts' : 'list recent sources',
    async run(args, io) {
      const unknown = args.find((arg) => arg !== '-a');
      if (unknown) {
        io.print(
          <TerminalText tone="error">
            ls: cannot access &apos;{unknown}&apos;: No such file or directory
          </TerminalText>,
        );
        return;
      }
      const all = args.includes('-a');
      try {
        const { entries, total } =
          where === 'home' ? await fetchPosts(all) : await fetchSources(all);
        listed.current[where] = entries;
        printListing(io, entries, total);
      } catch (error) {
        printRequestFailure(io, 'ls', error);
      }
    },
  };

  function printListing(io: TerminalIo, entries: Entry[], total: number) {
    if (where === 'home' && viewer === 'owner') {
      io.print(<TerminalText>sources/</TerminalText>);
    }
    if (entries.length === 0) {
      io.print(
        <TerminalText tone="muted">
          {where === 'home' ? 'no posts yet' : 'no sources yet'}
        </TerminalText>,
      );
      return;
    }
    for (const entry of entries) {
      io.print(
        <TerminalListRow
          date={formatMonthDay(entry.date)}
          title={entry.title}
          to={linkOf(entry)}
        />,
      );
    }
    if (total > entries.length) {
      io.print(
        <TerminalText tone="muted">
          showing {entries.length} of {total.toLocaleString('en-US')} · ls -a
          for all
        </TerminalText>,
      );
    }
  }

  const cat: TerminalCommand = {
    name: 'cat',
    usage: where === 'home' ? 'cat <post>' : 'cat <source>',
    summary: where === 'home' ? 'read a post' : 'read a source',
    async run(args, io) {
      const target = args.join(' ');
      if (!target) {
        io.print(
          <TerminalText tone="error">cat: missing operand</TerminalText>,
        );
        return;
      }
      try {
        const entry =
          findEntry(listed.current[where], target) ??
          findEntry(await fetchEverything(), target);
        if (!entry) {
          io.print(
            <TerminalText tone="error">
              cat: {target}: no such {where === 'home' ? 'post' : 'source'}
            </TerminalText>,
          );
          return;
        }
        navigate(linkOf(entry));
      } catch (error) {
        printRequestFailure(io, 'cat', error);
      }
    },
    complete: (argument) =>
      listed.current[where]
        .map((entry) => entry.title)
        .filter((title) => title.startsWith(argument)),
  };

  const cd: TerminalCommand = {
    name: 'cd',
    usage: 'cd <dir>',
    summary: 'move to a folder',
    hidden: viewer !== 'owner',
    run(args, io) {
      const target = args[0] ?? '~';
      const next = resolveDirectory(target, where);
      if (!next || (next === 'sources' && viewer !== 'owner')) {
        io.print(
          <TerminalText tone="error">
            cd: no such file or directory: {target}
          </TerminalText>,
        );
        return;
      }
      onDirectoryChange(next);
    },
    complete: () => (viewer === 'owner' && where === 'home' ? ['sources'] : []),
  };

  return [ls, cat, cd];
}

function postEntry(post: PostSummary): Entry {
  return { id: post.postId, title: post.title, date: post.createdAt };
}

function sourceEntry(source: SourceSummary): Entry {
  return { id: source.sourceId, title: source.title, date: source.updatedAt };
}

function findEntry(entries: Entry[], target: string): Entry | undefined {
  const wanted = target.toLowerCase();
  return (
    entries.find((entry) => entry.id === target) ??
    entries.find((entry) => entry.title.toLowerCase() === wanted)
  );
}

function resolveDirectory(
  target: string,
  current: Directory,
): Directory | null {
  const path = target.replace(/\/+$/, '');
  if (['~', '', '/', '..'].includes(path)) return 'home';
  if (['sources', '~/sources', '/sources'].includes(path)) return 'sources';
  if (path === '.') return current;
  return null;
}
