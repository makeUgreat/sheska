import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-outline-variant/10 bg-page-background px-4 py-8">
      <div className="mx-auto flex max-w-[800px] flex-col items-center justify-between gap-4 md:flex-row">
        <div className="text-center md:text-left">
          <Link
            to="/"
            className="text-2xl font-semibold leading-tight text-text-primary hover:text-accent-hover"
          >
            HASH
          </Link>
          <p className="mt-1 text-base leading-relaxed text-text-secondary">
            Backend dev.
          </p>
        </div>
        <nav className="flex gap-6 text-base leading-relaxed text-text-secondary">
          <Link
            to="/posts"
            className="transition-colors hover:text-accent-hover"
          >
            Posts
          </Link>
          <Link
            to="/notes"
            className="transition-colors hover:text-accent-hover"
          >
            Notes
          </Link>
          <Link
            to="/sources"
            className="transition-colors hover:text-accent-hover"
          >
            Sources
          </Link>
        </nav>
      </div>
    </footer>
  );
}
