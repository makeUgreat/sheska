import { Link } from 'react-router-dom';
import { useSeason } from '@/shared/lib';
import { SantaHat } from './winter/santa-hat';

const SURFACE =
  'group/link grid h-10 w-10 place-items-center rounded-md text-text-muted transition-colors ' +
  'hover:text-text-primary focus-visible:text-text-primary focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page-background';

/** 바닥을 축으로 기울인다. 끝에서 살짝 넘쳤다 돌아오는 곡선이라 고개를 갸웃하는 것처럼 보인다. */
const TILT =
  'origin-bottom transition-transform duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ' +
  '[transform-box:fill-box] motion-reduce:transition-none';

const AT_REST = 'transition-opacity duration-150 group-hover/link:opacity-0 group-focus-visible/link:opacity-0';
const ON_HOVER = 'opacity-0 transition-opacity duration-150 group-hover/link:opacity-100 group-focus-visible/link:opacity-100';

const SMILE_CURVES = ['M7.6 13q1.4-1.6 2.8 0', 'M13.6 13q1.4-1.6 2.8 0', 'M10 16.2q2 1.8 4 0'];
const CAT_SMILE_CURVES = ['M5.2 8q.8-.9 1.6 0', 'M9.2 8q.8-.9 1.6 0', 'M7.2 9.6q.8.7 1.6 0'];

/** 문서가 칠해진 부분이라 얼굴은 바탕색 선으로 뚫는다. */
function PostsIcon({ hat }: { hat: boolean }) {
  return (
    <svg aria-hidden="true" className="h-6 w-6 overflow-visible" viewBox="0 0 24 24">
      <g className={`${TILT} group-hover/link:rotate-[10deg] group-focus-visible/link:rotate-[10deg]`}>
        <path
          className={AT_REST}
          fill="currentColor"
          fillRule="evenodd"
          d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm2 9h8v1.75H8Zm0 4h8v1.75H8Zm0-8h4v1.75H8Z"
        />
        <g className={ON_HOVER}>
          <path fill="currentColor" d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
          {SMILE_CURVES.map((d) => (
            <path key={d} d={d} className="fill-none stroke-page-background" strokeWidth={1.6} strokeLinecap="round" />
          ))}
        </g>
        {hat && <SantaHat transform="translate(1.4 -3.6) rotate(-14 6 6)" />}
      </g>
    </svg>
  );
}

/**
 * Octicons mark-github. 칸을 꽉 채우면 posts 아이콘보다 넓어 보여서 24 격자에서 지름 22로 줄였다.
 * 고양이는 원에서 오려 낸 부분이라 얼굴은 아이콘 색 선으로 그린다.
 */
function GitHubIcon({ hat }: { hat: boolean }) {
  return (
    <svg aria-hidden="true" className="h-6 w-6 overflow-visible" viewBox="0 0 24 24">
      <g className={`${TILT} group-hover/link:-rotate-12 group-focus-visible/link:-rotate-12`}>
        <g transform="translate(1 1) scale(1.375)">
          <path
            fill="currentColor"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
          />
          <g className={ON_HOVER}>
            {CAT_SMILE_CURVES.map((d) => (
              <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={0.6} strokeLinecap="round" />
            ))}
          </g>
        </g>
        {hat && <SantaHat transform="translate(7.2 -5.4) rotate(12 6 6)" />}
      </g>
    </svg>
  );
}

/**
 * 터미널 창 윗변 바로 위에 놓는다.
 * 그림의 오른쪽 끝을 창 끝에서 24px 안쪽에 둔다.
 * 그림은 40px 칸 가운데에 있어 칸 끝보다 8px 안쪽이므로 칸은 16px만 들인다.
 */
export function HeroLinks({ articlesHref, githubHref }: { articlesHref: string; githubHref: string }) {
  const winter = useSeason() === 'winter';

  return (
    <nav aria-label="Links" className="absolute bottom-full right-4 mb-1 flex gap-1">
      <Link to={articlesHref} aria-label="posts" className={SURFACE}>
        <PostsIcon hat={winter} />
      </Link>
      <a href={githubHref} target="_blank" rel="noreferrer" aria-label="GitHub (opens in a new tab)" className={SURFACE}>
        <GitHubIcon hat={winter} />
      </a>
    </nav>
  );
}
