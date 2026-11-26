import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/shared/ui';
import { SERVICES, type Service } from '../model/profile';

const OTHER_SERVICE_LINK =
  'inline-flex items-center gap-2.5 rounded-[10px] border border-plate-line py-2.5 pl-2.5 pr-3.5 text-body-md font-medium transition-colors duration-150 hover:border-accent hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none';

function OtherServices({ current }: { current: Service }) {
  const others = SERVICES.filter((service) => service.slug !== current.slug);

  return (
    <nav aria-labelledby="other-services" className="mt-12 grid w-full max-w-[560px] gap-3.5 border-t border-plate-line pt-5.5">
      <h2 id="other-services" className="font-mono text-label-sm uppercase text-text-muted">
        다른 서비스
      </h2>
      <ul className="flex flex-wrap justify-center gap-2.5">
        {others.map((service) => (
          <li key={service.slug}>
            <Link to={`/about/${service.slug}`} className={OTHER_SERVICE_LINK}>
              <img src={service.logo.src} alt="" className="size-5 rounded-[5px]" />
              {service.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ServicePage() {
  const { slug } = useParams<{ slug: string }>();
  const service = SERVICES.find((candidate) => candidate.slug === slug);

  if (!service) {
    return (
      <main className="mx-auto max-w-container-terminal px-gutter">
        <EmptyState variant="document" className="py-24" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-container-terminal flex-col items-center px-gutter pb-24 pt-20 text-center lg:pt-28">
      <img src={service.logo.src} alt={service.logo.alt} className="size-16 rounded-[15px] shadow-[0_14px_30px_-16px_rgb(16_19_25/0.4)]" />
      <h1 className="mt-5.5 text-headline-md tracking-[-0.02em]">{service.name}</h1>
      <p className="mt-2.5 text-text-muted">아직 준비 중입니다.</p>
      <OtherServices current={service} />
      <Link
        to="/about"
        className="mt-7 inline-flex items-center gap-2 rounded-md text-body-sm font-medium text-text-muted transition-colors duration-150 hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5" />
          <path d="M11 6l-6 6 6 6" />
        </svg>
        About으로 돌아가기
      </Link>
    </main>
  );
}
