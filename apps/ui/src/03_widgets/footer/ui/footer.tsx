import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-outline-variant/10 bg-page-background px-4 py-8">
      <div className="mx-auto flex max-w-[800px] flex-col items-center justify-between gap-4 md:flex-row">
        <div className="text-center md:text-left">
          <Link
            to="/"
            className="text-2xl font-semibold leading-tight text-text-primary hover:text-[#e06c75]"
          >
            The Garden
          </Link>
          <p className="mt-1 text-base leading-relaxed text-text-secondary">
            Built for the curious.
          </p>
        </div>
        <nav className="flex gap-6 text-base leading-relaxed text-text-secondary">
          <Link to="/posts" className="transition-colors hover:text-[#e06c75]">
            Posts
          </Link>
          <Link
            to="/sources"
            className="transition-colors hover:text-[#e06c75]"
          >
            Sources
          </Link>
        </nav>
      </div>
    </footer>
  );
}
