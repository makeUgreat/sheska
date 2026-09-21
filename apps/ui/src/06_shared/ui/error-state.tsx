import { HttpError } from '@/shared/api';

const UNREACHABLE_CAUSE = 'The server could not be reached.';
const REQUEST_CAUSE = 'Something went wrong while loading.';

const WATERMARK =
  'pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-accent/8';

function StatusWatermark({ status }: { status: number }) {
  return (
    <span
      aria-hidden="true"
      className={`${WATERMARK} font-mono text-[clamp(88px,22vw,150px)] font-medium leading-none tracking-tight`}
    >
      {status}
    </span>
  );
}

function SeveredWatermark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 440 132"
      fill="currentColor"
      className={`${WATERMARK} w-[clamp(340px,115%,780px)] -rotate-[10deg]`}
    >
      <path d="M0 34 H186 L160 56 L192 78 L158 100 L0 100 Z" />
      <path d="M440 34 H252 L278 56 L246 78 L280 100 L440 100 Z" />
    </svg>
  );
}

export type ErrorStateProps = {
  error: Error;
  className?: string;
};

export function ErrorState({ error, className = '' }: ErrorStateProps) {
  const status = error instanceof HttpError ? error.status : null;

  return (
    <div
      role="alert"
      className={[
        'relative flex min-h-[300px] flex-col items-center justify-center overflow-hidden text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {status !== null && <StatusWatermark status={status} />}
      <div className="relative flex w-full justify-center">
        {status === null && <SeveredWatermark />}
        <p className="relative font-mono text-label-sm uppercase text-accent-strong">
          Error
        </p>
      </div>
      <p className="relative mt-3.5 text-body-md text-text-secondary">
        {status === null ? UNREACHABLE_CAUSE : REQUEST_CAUSE}
      </p>
    </div>
  );
}
