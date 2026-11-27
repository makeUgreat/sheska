import { type ReactNode } from 'react';

/** hProperties는 소문자 이름의 값만 컴포넌트 prop까지 그대로 전달되므로 camelCase를 쓰지 않는다. */
type CalloutProperties = {
  id?: string;
  type?: string;
  fold?: 'collapsed' | 'expanded';
  className?: string;
  children?: ReactNode;
};

type Tone = 'neutral' | 'accent' | 'caution';

/** Obsidian type 이름과 별칭이다. 목록에 없는 type은 Obsidian처럼 note와 같게 그린다. */
const TONES: Record<string, Tone> = {
  tip: 'accent',
  hint: 'accent',
  important: 'accent',
  success: 'accent',
  check: 'accent',
  done: 'accent',
  question: 'accent',
  help: 'accent',
  faq: 'accent',
  warning: 'caution',
  caution: 'caution',
  attention: 'caution',
  failure: 'caution',
  fail: 'caution',
  missing: 'caution',
  danger: 'caution',
  error: 'caution',
  bug: 'caution',
};

const SURFACE: Record<Tone, string> = {
  neutral: 'bg-text-muted/6',
  accent: 'bg-accent-strong/6',
  caution: 'bg-caution/6',
};

const LABEL: Record<Tone, string> = {
  neutral: 'text-text-muted',
  accent: 'text-accent-strong',
  caution: 'text-caution',
};

/** `constructor` 같은 type이 prototype의 값을 읽지 않게 한다. */
function toneOf(type: string | undefined): Tone {
  if (type && Object.hasOwn(TONES, type)) return TONES[type];
  return 'neutral';
}

export function Callout({ id, type, fold, className = '', children }: CalloutProperties) {
  const style =
    `group my-7 rounded-lg px-4.5 py-3.5 text-body-prose text-text-secondary [&>:not(:first-child)]:ml-7 [&>:last-child]:mb-0 ${SURFACE[toneOf(type)]} ${className}`.trim();

  if (fold) {
    return (
      <details id={id} open={fold === 'expanded'} className={style}>
        {children}
      </details>
    );
  }

  return (
    <div id={id} className={style}>
      {children}
    </div>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4 rotate-90 transition-transform group-open:-rotate-90 motion-reduce:transition-none"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ToneIcon({ tone }: { tone: Tone }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`mr-2.5 inline-block size-[18px] align-[-3px] ${LABEL[tone]}`}
    >
      <circle cx="12" cy="12" r="10" />
      <TonePath tone={tone} />
    </svg>
  );
}

function TonePath({ tone }: { tone: Tone }) {
  switch (tone) {
    case 'neutral':
      return (
        <>
          <path d="M12 16v-4" />
          <path d="M12 8h.01" strokeWidth="2.6" />
        </>
      );
    case 'accent':
      return <path d="m8.5 12.2 2.4 2.4 4.6-5" />;
    case 'caution':
      return (
        <>
          <path d="M12 7.5v5" />
          <path d="M12 16.3h.01" strokeWidth="2.6" />
        </>
      );
  }
}

/** Label은 원문 `[!type]`을 대신하는 표시라 복사 결과에 섞이지 않게 한다. Type은 읽기 도구가 읽도록 글자로 둔다. */
export function CalloutTitle({ type, fold, children }: CalloutProperties) {
  const tone = toneOf(type);
  const label = (
    <>
      <ToneIcon tone={tone} />
      <span className="sr-only select-none">{type}</span>
    </>
  );

  if (fold) {
    return (
      <summary className="flex cursor-pointer items-center gap-3 group-open:mb-2 list-none font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          {label}
          {children}
        </span>
        <span className={`flex shrink-0 items-center ${LABEL[tone]}`}>
          <Chevron />
        </span>
      </summary>
    );
  }

  return (
    <p className="mb-2 font-semibold text-text-primary">
      {label}
      {children}
    </p>
  );
}
