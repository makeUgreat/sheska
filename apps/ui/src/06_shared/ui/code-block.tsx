import { type Element } from 'hast';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

const COPIED_RESET_MS = 2000;

const LANGUAGE_LABEL =
  'font-mono text-label-sm uppercase text-on-surface-muted';

const InsideCodeBlock = createContext(false);

/** 언어를 적지 않은 fence는 className조차 없으므로 class로는 inline과 가를 수 없다. */
export function useInsideCodeBlock() {
  return useContext(InsideCodeBlock);
}

const LANGUAGE_PREFIX = 'language-';

function languageOf(node?: Element) {
  const code = node?.children[0];
  const names =
    code?.type === 'element' ? code.properties.className : undefined;
  if (!Array.isArray(names)) return undefined;

  const tag = names.find(
    (name): name is string =>
      typeof name === 'string' && name.startsWith(LANGUAGE_PREFIX),
  );
  return tag?.slice(LANGUAGE_PREFIX.length);
}

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
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

function CopyButton({ source }: { source: RefObject<HTMLPreElement | null> }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(() => {
    const text = source.current?.textContent;
    if (!text) return;

    /** Clipboard는 비보안 컨텍스트에서 아예 없으므로 실패를 정상 경로로 둔다. */
    void navigator.clipboard
      ?.writeText(text)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }, [source]);

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy code"
        className={`-m-1.5 p-1.5 transition-colors focus-visible:outline-none ${
          copied
            ? 'text-accent'
            : 'text-on-surface-muted hover:text-accent focus-visible:text-accent'
        }`}
      >
        {copied ? (
          <Glyph>
            <path d="M20 6 9 17l-5-5" />
          </Glyph>
        ) : (
          <Glyph>
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </Glyph>
        )}
      </button>
      {/* 아이콘 교체는 보이는 사람에게만 닿는다. 결과는 여기서 읽힌다. */}
      <span role="status" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
    </>
  );
}

/** Highlighting만으로는 코드 블록임이 드러나지 않아 chrome 한 줄을 함께 얹는다. */
export function CodeBlock({
  children,
  node,
}: {
  children?: ReactNode;
  node?: Element;
}) {
  const body = useRef<HTMLPreElement>(null);
  const language = languageOf(node);

  return (
    <div className="my-7 overflow-hidden rounded-lg bg-surface">
      {/*
       * 위 padding이 1px을 더 가진다. Border가 바 안쪽 아래에 붙고, descender가
       * 없는 대문자 mono 잉크는 line box 중앙보다 위에 앉기 때문이다.
       */}
      <div className="flex items-center justify-between gap-4 border-b border-outline-variant/25 px-5 pt-[9px] pb-2">
        <span className={LANGUAGE_LABEL}>{language}</span>
        <CopyButton source={body} />
      </div>
      <pre
        ref={body}
        className="overflow-x-auto px-5 py-4 font-mono text-code-block text-on-surface"
      >
        <InsideCodeBlock.Provider value={true}>
          {children}
        </InsideCodeBlock.Provider>
      </pre>
    </div>
  );
}
