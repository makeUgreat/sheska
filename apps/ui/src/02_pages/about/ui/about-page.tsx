import { Link } from 'react-router-dom';
import { PROJECTS, type Project } from '@/entities/project';
import { PROFILE } from '../model/profile';

const HOVER_MOTION = 'transition-transform duration-[600ms] ease-[cubic-bezier(0.2,0.7,0.3,1)] motion-reduce:transition-none';

const HOVER_SHIFT = `${HOVER_MOTION} group-hover:-translate-x-1.5 group-hover:-translate-y-1.5 group-has-focus-visible:-translate-x-1.5 group-has-focus-visible:-translate-y-1.5`;

const HOVER_LIFT = `${HOVER_MOTION} group-hover:-translate-y-1 group-has-focus-visible:-translate-y-1`;

/** stretched link: 제목 링크의 ::after가 article 전체를 덮어 카드 어디를 눌러도 이동한다. */
const CARD_LINK =
  'focus:outline-none after:absolute after:-inset-2.5 after:rounded-[18px] focus-visible:after:ring-2 focus-visible:after:ring-accent';

const PREVIEW_POSITION = 'absolute left-[9%] top-[11%] w-[106%] max-w-none';

const PREVIEW_IMAGE = {
  window: `${PREVIEW_POSITION} rounded-lg shadow-[0_1px_2px_rgb(16_19_25/0.06),0_18px_40px_-12px_rgb(16_19_25/0.18)] ${HOVER_SHIFT}`,
  diagram: `${PREVIEW_POSITION} ${HOVER_SHIFT}`,
} as const;

function ProjectPreview({ project }: { project: Project }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-linear-160 from-plate to-plate-line ring-1 ring-inset ring-text-primary/5">
      <img src={project.preview} alt={`${project.name} 미리보기`} className={PREVIEW_IMAGE[project.previewStyle]} />
    </div>
  );
}

function ProjectEntry({ project }: { project: Project }) {
  return (
    <article className="group relative grid gap-4">
      <ProjectPreview project={project} />
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 text-title-lg tracking-[-0.01em]">
            <img
              src={project.logo.src}
              alt={project.logo.alt}
              className={`mr-[7px] inline-block size-[21px] rounded-[5px] align-[-0.1em] ${HOVER_LIFT}`}
            />
            <Link to={`/about/${project.slug}`} className={CARD_LINK}>
              <span className={`inline-block ${HOVER_LIFT}`}>{project.name}</span>
            </Link>
          </h3>
          <p className={`shrink-0 font-mono text-label-sm uppercase text-text-muted ${HOVER_LIFT}`}>{project.category}</p>
        </div>
        <p className={`max-w-[52ch] text-pretty break-keep ${HOVER_LIFT}`}>{project.tagline}</p>
        <p className={`max-w-[52ch] text-body-sm text-pretty break-keep text-text-muted ${HOVER_LIFT}`}>{project.description}</p>
      </div>
    </article>
  );
}

const STICKY_BELOW_HEADER = 'lg:sticky lg:top-[calc(var(--spacing-header)+48px)] lg:self-start';

/** 넓은 화면에서는 두 열 사이 여백에 세로로 세운다. 아래에서 위로 읽히도록 뒤집는다. */
const RAIL =
  'flex items-center gap-3 font-mono text-label-sm uppercase tracking-[0.2em] text-text-primary after:h-px after:flex-1 after:bg-plate-line lg:rotate-180 lg:[writing-mode:vertical-rl] lg:after:h-14 lg:after:w-px lg:after:flex-none';

export function AboutPage() {
  return (
    <main className="mx-auto grid max-w-container-terminal gap-14 px-gutter pb-20 pt-12 lg:grid-cols-[4fr_7fr] lg:gap-20 lg:px-14 lg:pb-28 lg:pt-18">
      <header className={STICKY_BELOW_HEADER}>
        <h1 className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
          <span className="text-headline-lg font-medium tracking-[-0.03em]">{PROFILE.name}</span>{' '}
          <span className="font-mono text-[15px] font-normal text-text-muted">{PROFILE.handle}</span>
        </h1>
        <p className="mt-6 max-w-[32ch] text-pretty break-keep text-text-secondary">
          <span className="text-text-primary">{PROFILE.headline}</span> {PROFILE.bio}
        </p>
      </header>

      <section
        aria-labelledby="about-projects"
        className="grid min-w-0 content-start gap-6 lg:-ml-12 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-x-7"
      >
        <h2 id="about-projects" className={`${RAIL} ${STICKY_BELOW_HEADER}`}>
          Projects
          <span className="tabular-nums text-text-muted">{String(PROJECTS.length).padStart(2, '0')}</span>
        </h2>
        <div className="card-list-focus grid gap-14">
          {PROJECTS.map((project) => (
            <ProjectEntry key={project.slug} project={project} />
          ))}
        </div>
      </section>
    </main>
  );
}
