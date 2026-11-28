import { type CSSProperties } from 'react';
import { type Project } from '../model/projects';

export function ProjectTag({ project, className = '' }: { project: Project; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 ${className}`}>
      <img
        src={project.logo.src}
        alt=""
        className="size-3.5 rounded-[3px]"
        style={{ '--logo-dim-brightness': project.logo.dimBrightness } as CSSProperties}
      />
      {project.name}
    </span>
  );
}
