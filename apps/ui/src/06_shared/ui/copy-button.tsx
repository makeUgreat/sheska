import { type ReactNode } from 'react';
import { useCopyToClipboard } from '../lib';

const RESULT_MESSAGE = { idle: '', copied: '복사했습니다', failed: '복사하지 못했습니다' } as const;

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const { result, copy } = useCopyToClipboard();

  return (
    <>
      <button
        type="button"
        onClick={() => copy(value)}
        aria-label={label}
        title={label}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-outline-variant/25 text-text-secondary transition-colors hover:border-text-primary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {result === 'copied' && (
          <Glyph>
            <path d="M20 6 9 17l-5-5" />
          </Glyph>
        )}
        {result === 'failed' && (
          <Glyph>
            <path d="M18 6 6 18M6 6l12 12" />
          </Glyph>
        )}
        {result === 'idle' && (
          <Glyph>
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </Glyph>
        )}
      </button>
      <span role="status" className="sr-only">
        {RESULT_MESSAGE[result]}
      </span>
    </>
  );
}
