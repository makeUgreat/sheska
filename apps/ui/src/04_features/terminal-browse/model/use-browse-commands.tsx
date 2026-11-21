import { type MutableRefObject, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { countPosts, listPosts, type PostSummary } from '@/entities/post';
import { type Viewer } from '@/entities/session';
import { listSources, type SourceSummary } from '@/entities/source';
import { useHttpClient } from '@/shared/api';
import { formatMonthDay } from '@/shared/lib';
import {
  printRequestFailure,
  TerminalCountUp,
  TerminalEntryLink,
  TerminalText,
  TerminalTree,
  TerminalTreeRoot,
  type TerminalCommand,
  type TerminalListedEntry,
  type TerminalTreeItem,
} from '@/shared/ui';
import {
  canEnter,
  completePath,
  displayPath,
  entryFolderOf,
  filesIn,
  HOME,
  isDirectory,
  pageOf,
  POSTS,
  readFile,
  resolvePath,
  SOURCES,
  subdirectories,
} from './file-system';

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
  /** 현재 폴더의 절대 경로. */
  directory: string;
  onDirectoryChange: (directory: string) => void;
  /** 방금 보인 목록. `grep`도 여기에 쓴다. */
  recent: MutableRefObject<TerminalListedEntry[]>;
}): TerminalCommand[] {
  const http = useHttpClient();
  const navigate = useNavigate();
  const owner = viewer === 'owner';
  const where = canEnter(directory, viewer) ? directory : HOME;

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

  async function fetchEverything(folder: string): Promise<TerminalListedEntry[]> {
    const { entries } = folder === POSTS ? await fetchPosts(true) : await fetchSources(true);
    return entries;
  }

  /** 방금 보인 목록에서 먼저 찾고, 없으면 폴더의 글을 모두 받아 찾는다. 폴더 밖이면 방금 보인 목록에서만 찾는다. */
  async function findInFolder(folder: string | undefined, name: string) {
    if (!folder) return findEntry(recent.current, name);

    const recentInFolder = recent.current.filter((entry) => entry.to.startsWith(`${pageOf(folder)}/`));
    return findEntry(recentInFolder, name) ?? findEntry(await fetchEverything(folder), name);
  }

  /** 방금 보인 글 제목과 파일 경로를 함께 채운다. */
  function completeFile(argument: string) {
    const typed = argument.toLowerCase();
    const titles = recent.current.map((entry) => entry.title).filter((title) => title.toLowerCase().startsWith(typed));
    return [...titles, ...completePath(argument, where, { files: true })];
  }

  /** 폴더 이름 옆에 붙는 개수. 들어갈 수 없는 폴더는 세지 않는다. */
  async function folderNote(path: string): Promise<string | undefined> {
    switch (path) {
      case POSTS:
        return posts((await countPosts(http)).count);
      case SOURCES:
        return owner ? notes(await countSources()) : undefined;
      default:
        return undefined;
    }
  }

  const ls: TerminalCommand = {
    name: 'ls',
    usage: 'ls [-a] [dir]',
    summary: 'list a folder',
    async run(args, io) {
      const all = args.includes('-a');
      const [target, ...extra] = args.filter((arg) => arg !== '-a');
      const path = resolvePath(target ?? '.', where);
      if (extra.length > 0) {
        io.print(<TerminalText tone="error">ls: too many arguments</TerminalText>);
        return;
      }
      if (readFile(path) !== undefined) {
        io.print(<TerminalText>{target}</TerminalText>);
        return;
      }
      if (!isDirectory(path)) {
        io.print(<TerminalText tone="error">ls: cannot access {`'${target}'`}: No such file or directory</TerminalText>);
        return;
      }
      if (!canEnter(path, viewer)) {
        io.print(<TerminalText tone="error">ls: cannot open directory {`'${target}'`}: Permission denied</TerminalText>);
        return;
      }

      const showAll = target ? `ls -a ${target}` : 'ls -a';
      io.progress(`reading ${displayPath(path)}`);
      try {
        switch (path) {
          case POSTS: {
            const { entries, total } = await fetchPosts(all);
            recent.current = entries;
            io.print(
              entryTree(path, <TerminalCountUp value={total} format={posts} />, entries, moreFooter(entries.length, total, showAll)),
            );
            return;
          }
          case SOURCES: {
            const { entries, total } = await fetchSources(all);
            recent.current = entries;
            io.print(
              entryTree(path, <TerminalCountUp value={total} format={notes} />, entries, moreFooter(entries.length, total, showAll)),
            );
            return;
          }
          default: {
            const folders = subdirectories(path);
            const folderNotes = await Promise.all(folders.map((name) => folderNote(resolvePath(name, path))));
            const folderItems = folders.map((name, index) => ({
              key: name,
              head: <TerminalTreeRoot label={`${name}/`} note={folderNotes[index]} />,
            }));
            const fileItems = filesIn(path).map((name) => ({ key: name, head: name }));
            io.print(<TerminalTree root={<TerminalTreeRoot label={displayPath(path)} />} items={[...folderItems, ...fileItems]} />);
          }
        }
      } catch (error) {
        printRequestFailure(io, 'ls', error);
      }
    },
    complete: (argument) => {
      const flag = argument.startsWith('-a ') ? '-a ' : '';
      return completePath(argument.slice(flag.length), where, { files: true }).map((candidate) => flag + candidate);
    },
  };

  const cat: TerminalCommand = {
    name: 'cat',
    usage: 'cat <file>',
    summary: 'read a post or source',
    async run(args, io) {
      const target = args.join(' ');
      if (!target) {
        io.print(<TerminalText tone="error">cat: missing operand</TerminalText>);
        return;
      }

      const path = resolvePath(target, where);
      const content = readFile(path);
      const folder = entryFolderOf(path);
      if (isDirectory(path)) {
        io.print(<TerminalText tone="error">cat: {target}: Is a directory</TerminalText>);
        return;
      }
      if (content !== undefined) {
        io.print(<TerminalText>{content}</TerminalText>);
        return;
      }
      if (folder && !canEnter(folder, viewer)) {
        io.print(<TerminalText tone="error">cat: {target}: Permission denied</TerminalText>);
        return;
      }

      try {
        const entry = await findInFolder(folder, folder ? path.slice(folder.length + 1) : target);
        if (!entry) {
          io.print(<TerminalText tone="error">cat: {target}: No such file or directory</TerminalText>);
          return;
        }

        void navigate(entry.to);
      } catch (error) {
        printRequestFailure(io, 'cat', error);
      }
    },
    complete: completeFile,
  };

  const cd: TerminalCommand = {
    name: 'cd',
    usage: 'cd [dir]',
    summary: 'move to a folder',
    run(args, io) {
      const target = args[0] ?? '~';
      const path = resolvePath(target, where);
      if (readFile(path) !== undefined) {
        io.print(<TerminalText tone="error">cd: not a directory: {target}</TerminalText>);
        return;
      }
      if (!isDirectory(path)) {
        io.print(<TerminalText tone="error">cd: no such file or directory: {target}</TerminalText>);
        return;
      }
      if (!canEnter(path, viewer)) {
        io.print(<TerminalText tone="error">cd: permission denied: {target}</TerminalText>);
        return;
      }

      onDirectoryChange(path);
    },
    complete: (argument) => completePath(argument, where, { files: false }),
  };

  const open: TerminalCommand = {
    name: 'open',
    usage: 'open [path]',
    summary: 'open a folder or file as a page',
    async run(args, io) {
      const target = args.join(' ') || '.';
      const path = resolvePath(target, where);
      const page = pageOf(path);
      const folder = entryFolderOf(path);
      if (!canEnter(path, viewer)) {
        io.print(<TerminalText tone="error">open: {target}: Permission denied</TerminalText>);
        return;
      }
      if (page) {
        void navigate(page);
        return;
      }
      if (isDirectory(path) || readFile(path) !== undefined) {
        io.print(<TerminalText tone="error">open: {target}: no page to open</TerminalText>);
        return;
      }

      try {
        const entry = await findInFolder(folder, folder ? path.slice(folder.length + 1) : target);
        if (!entry) {
          io.print(<TerminalText tone="error">open: {target}: No such file or directory</TerminalText>);
          return;
        }

        void navigate(entry.to);
      } catch (error) {
        printRequestFailure(io, 'open', error);
      }
    },
    complete: completeFile,
  };

  const pwd: TerminalCommand = {
    name: 'pwd',
    summary: 'print the current folder',
    run: (_args, io) => io.print(<TerminalText>{where}</TerminalText>),
  };

  return [ls, cat, open, cd, pwd];
}

function entryTree(path: string, note: ReactNode, entries: Entry[], footer: string | undefined) {
  return <TerminalTree root={<TerminalTreeRoot label={displayPath(path)} note={note} />} items={entries.map(entryItem)} footer={footer} />;
}

function entryItem(entry: Entry): TerminalTreeItem {
  return {
    key: entry.id,
    head: <TerminalEntryLink title={entry.title} to={entry.to} date={formatMonthDay(entry.date)} />,
  };
}

function moreFooter(shown: number, total: number, showAll: string) {
  return total > shown ? `… ${(total - shown).toLocaleString('en-US')} more · ${showAll}` : undefined;
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
