import { Link } from 'react-router-dom';

/** 돌아가는 아이콘이다. 칸 32px 안에 그림 18px을 가운데 두므로 그림 양옆에 7px씩 빈 칸이 있다. */
export function BackLink({ to, label, title, className = '' }: { to: string; label: string; title: string; className?: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={title}
      className={`flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
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
    </Link>
  );
}
