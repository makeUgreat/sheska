import { Link } from 'react-router-dom';
import { PROFILE, SERVICES, type Service } from '../model/profile';

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

function ServicePreview({ service }: { service: Service }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-linear-160 from-plate to-plate-line ring-1 ring-inset ring-text-primary/5">
      <img src={service.preview} alt={`${service.name} 미리보기`} className={PREVIEW_IMAGE[service.previewStyle]} />
    </div>
  );
}

function ServiceEntry({ service }: { service: Service }) {
  return (
    <article className="group relative grid gap-4">
      <ServicePreview service={service} />
      <div className="grid gap-1">
        <h3 className="text-title-lg tracking-[-0.01em]">
          <img
            src={service.logo.src}
            alt={service.logo.alt}
            className={`mr-2 inline-block size-[26px] rounded-md align-[-0.21em] ${HOVER_LIFT}`}
          />
          <Link to={`/about/${service.slug}`} className={CARD_LINK}>
            <span className={`inline-block ${HOVER_LIFT}`}>{service.name}</span>
          </Link>
        </h3>
        <p className={`max-w-[52ch] text-text-secondary ${HOVER_LIFT}`}>{service.summary}</p>
      </div>
    </article>
  );
}

export function AboutPage() {
  return (
    <main className="mx-auto grid max-w-container-terminal gap-14 px-gutter pb-20 pt-12 lg:grid-cols-[4fr_7fr] lg:gap-20 lg:px-14 lg:pb-28 lg:pt-18">
      <header className="lg:sticky lg:top-[calc(var(--spacing-header)+48px)] lg:self-start">
        <h1 className="text-headline-lg font-medium tracking-[-0.03em]">{PROFILE.name}</h1>
        <p className="mt-3.5 text-body-lg">{PROFILE.role}</p>
        <p className="mt-4 max-w-[32ch] text-text-secondary">{PROFILE.bio}</p>
      </header>

      <section aria-labelledby="about-services" className="grid min-w-0 content-start gap-6">
        <h2 id="about-services" className="font-mono text-label-sm uppercase text-text-muted">
          Services
        </h2>
        <div className="card-list-focus grid gap-14">
          {SERVICES.map((service) => (
            <ServiceEntry key={service.slug} service={service} />
          ))}
        </div>
      </section>
    </main>
  );
}
