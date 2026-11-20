import { useMemo, useState, type FormEvent, type RefObject } from 'react';
import { useTypingPlaceholder } from '../model/use-typing-placeholder';
import { MinimizeButton } from './minimize-button';

export const ASK_LABEL = '이 글에 대해 질문하기';
const EXAMPLE_QUESTIONS = ['이 글의 핵심만 알려 줘', '왜 이렇게 했어?', '다음에 할 일은 뭐야?'];

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export interface AskFieldProps {
  /** 답을 받는 중이거나 잠겨 있으면 거짓이다. */
  accepting: boolean;
  lockedSeconds: number;
  hasEntries: boolean;
  onAsk: (question: string) => void;
  onMinimize: () => void;
  fieldRef: RefObject<HTMLFormElement>;
  inputRef: RefObject<HTMLInputElement>;
}

/**
 * 대화 카드 아래에 붙은 입력 칸이다. 비어 있는 동안 예시 질문을 한 글자씩 쓰고 지운다.
 * 안내 문구는 native placeholder가 아니라 따로 그린다. 비어 있는 동안 실제 커서를 숨기고 문구 끝에 얇은 커서를 붙인다.
 * 보내기 버튼은 보낼 글이 있을 때만 나온다. Enter로도 보낸다.
 * 칸 번호를 고정해서 보내기 버튼이 나오고 사라져도 접기 버튼이 움직이지 않는다.
 */
export function AskField({ accepting, lockedSeconds, hasEntries, onAsk, onMinimize, fieldRef, inputRef }: AskFieldProps) {
  const [value, setValue] = useState('');
  const locked = lockedSeconds > 0;
  const empty = value === '';
  const phrases = useMemo(() => [hasEntries ? '이어서 질문하기' : '질문하기', ...EXAMPLE_QUESTIONS], [hasEntries]);
  const ghost = useTypingPlaceholder(phrases, empty && accepting);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) return;

    onAsk(value);
    setValue('');
  }

  return (
    <form
      ref={fieldRef}
      onSubmit={handleSubmit}
      className="group/field pointer-events-auto grid w-full origin-bottom cursor-text grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-1 rounded-b-[10px] border border-outline-variant/15 border-t-plate-line bg-page-background py-1 pr-2 pl-4 shadow-[0_14px_28px_-8px_rgb(16_19_25/0.18),0_2px_4px_rgb(16_19_25/0.04)]"
    >
      <span
        aria-hidden="true"
        className="col-start-1 mr-1.5 self-baseline font-mono text-[15px] leading-none text-text-muted transition-colors group-focus-within/field:text-accent"
      >
        ?
      </span>
      <span className="relative col-start-2 min-w-0 self-baseline">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          aria-label={ASK_LABEL}
          value={value}
          disabled={!accepting}
          onChange={(event) => setValue(event.target.value)}
          className={`w-full border-0 bg-transparent py-2 text-body-md text-text-primary outline-none disabled:cursor-not-allowed ${empty ? 'caret-transparent' : 'caret-accent'}`}
        />
        {empty && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 flex max-w-full items-center overflow-hidden whitespace-nowrap text-text-muted"
          >
            {locked ? (
              <span className="font-mono text-label-sm tracking-normal">You can ask again in {formatCountdown(lockedSeconds)}</span>
            ) : (
              <>
                <span className="text-body-md">{ghost}</span>
                <span className="ml-0.5 hidden h-[17px] w-px shrink-0 bg-accent group-focus-within/field:block" />
              </>
            )}
          </span>
        )}
      </span>
      {!empty && accepting && (
        <button
          type="submit"
          aria-label="질문 보내기"
          title="보내기 (Enter)"
          className="col-start-3 flex size-7 animate-terminal-line-in items-center justify-center rounded-md text-text-secondary transition-colors hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-[15px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
        </button>
      )}
      <MinimizeButton onClick={onMinimize} className="col-start-4" />
    </form>
  );
}
