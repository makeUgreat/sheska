import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

const TONE = {
  plain: 'text-on-surface',
  muted: 'text-on-surface-muted',
  error: 'text-primary',
} as const;

export function TerminalText({
  tone = 'plain',
  children,
}: {
  tone?: keyof typeof TONE;
  children: ReactNode;
}) {
  return <p className={`whitespace-pre-wrap ${TONE[tone]}`}>{children}</p>;
}

/** `ls`와 `grep` 결과 한 줄. 날짜 열의 폭을 고정해 제목이 한 줄로 맞는다. */
export function TerminalListRow({
  date,
  title,
  to,
}: {
  date: string;
  title: string;
  to: string;
}) {
  return (
    <p className="flex gap-[2ch]">
      <span className="w-[7ch] flex-none text-on-surface-muted">{date}</span>
      <Link
        to={to}
        className="min-w-0 break-words text-on-surface underline decoration-on-surface/35 underline-offset-[3px] hover:text-white hover:decoration-white"
      >
        {title}
      </Link>
    </p>
  );
}
