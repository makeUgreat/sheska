import { type Viewer } from '@/entities/session';

export const HOME = '/home/hash';
export const POSTS = `${HOME}/posts`;
export const SOURCES = `${HOME}/sources`;

const DIRECTORIES = ['/', '/dev', '/home', HOME, POSTS, SOURCES];

/** posts와 sources 안의 글은 API에서 가져오므로 여기에 없다. */
const FILES: Record<string, string> = {
  // base64를 풀면 숨긴 메시지가 나온다. 실제 키 형식의 머리글은 secret scanner가 잡으므로 지어낸 머리글을 쓴다.
  '/dev/secret': [
    '-----BEGIN HASH SECRET KEY-----',
    'WW91IGZvdW5kIGl0LiBUaGFua3MgZm9yIHJlYWRpbmcgdGhpcyBmYXIu',
    '-----END HASH SECRET KEY-----',
  ].join('\n'),
};

/** 셸처럼 `~`, `.`, `..`, 상대 경로를 풀어 절대 경로로 바꾼다. 있는 경로인지는 보지 않는다. */
export function resolvePath(target: string, cwd: string): string {
  const expanded = target === '~' || target.startsWith('~/') ? HOME + target.slice(1) : target;
  const absolute = expanded.startsWith('/') ? expanded : `${cwd}/${expanded}`;
  const segments: string[] = [];

  for (const segment of absolute.split('/')) {
    switch (segment) {
      case '':
      case '.':
        break;
      case '..':
        segments.pop();
        break;
      default:
        segments.push(segment);
    }
  }

  return `/${segments.join('/')}`;
}

export function isDirectory(path: string): boolean {
  return DIRECTORIES.includes(path);
}

export function readFile(path: string): string | undefined {
  return FILES[path];
}

/** 글이 든 폴더. 경로가 그 안의 글을 가리키면 폴더를 돌려준다. */
export function entryFolderOf(path: string): string | undefined {
  return [POSTS, SOURCES].find((folder) => path.startsWith(`${folder}/`));
}

/** 목록 페이지가 있는 폴더만 주소를 돌려준다. */
export function pageOf(path: string): string | undefined {
  switch (path) {
    case POSTS:
      return '/posts';
    case SOURCES:
      return '/sources';
    default:
      return undefined;
  }
}

/** sources는 권한 700이라 소유자만 들어간다. */
export function canEnter(path: string, viewer: Viewer): boolean {
  if (path === SOURCES || path.startsWith(`${SOURCES}/`)) return viewer === 'owner';
  return true;
}

export function subdirectories(path: string): string[] {
  return DIRECTORIES.filter((directory) => directory !== '/' && parentOf(directory) === path).map(nameOf);
}

export function filesIn(path: string): string[] {
  return Object.keys(FILES)
    .filter((file) => parentOf(file) === path)
    .map(nameOf);
}

/** 프롬프트에 보이는 경로. 홈은 `~`로 줄인다. */
export function displayPath(path: string): string {
  if (path === HOME || path.startsWith(`${HOME}/`)) return `~${path.slice(HOME.length)}`;
  return path;
}

/** Tab 완성. 마지막 `/` 앞은 그대로 두고 뒤의 글자로 이름을 찾는다. 폴더 이름에는 `/`를 붙인다. */
export function completePath(argument: string, cwd: string, { files }: { files: boolean }): string[] {
  const cut = argument.lastIndexOf('/') + 1;
  const parent = argument.slice(0, cut);
  const typed = argument.slice(cut);
  const directory = resolvePath(parent || '.', cwd);
  const names = [...subdirectories(directory).map((name) => `${name}/`), ...(files ? filesIn(directory) : [])];

  return names.filter((name) => name.startsWith(typed)).map((name) => `${parent}${name}`);
}

function parentOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/')) || '/';
}

function nameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}
