import { type ReactNode } from 'react';

export function PostSectionHeader({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="mb-16">
      <h2 className="sr-only">Posts</h2>
      <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl">
        {title}
      </h2>
      <p className="text-lg leading-relaxed text-text-secondary">{children}</p>
    </header>
  );
}
