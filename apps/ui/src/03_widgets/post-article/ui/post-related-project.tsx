import { useId } from 'react';
import { Link } from 'react-router-dom';
import { type Project } from '@/entities/project';

export function RelatedProject({ project }: { project: Project }) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <p className="font-mono text-label-sm uppercase text-text-muted">Related project</p>
      <h2 id={headingId} className="mt-1 font-sans text-title-md">
        <Link
          to={`/about/${project.slug}`}
          className="inline-flex items-center gap-2.5 rounded-sm text-text-primary transition-colors duration-150 hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          <img src={project.logo.src} alt="" className="size-6 rounded-[5px]" />
          {project.name}
        </Link>
      </h2>
      <p className="mt-1.5 text-body-md text-pretty break-keep text-text-secondary">{project.tagline}</p>
    </section>
  );
}
