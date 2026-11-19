import {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { commonPrefix, tokenize } from '../model/tokenize';
import { type AskOptions, type TerminalCommand, type TerminalHandle, type TerminalIo, type TerminalPrompt } from '../model/types';
import { TerminalText } from './terminal-output';

const MAX_LINES = 500;

interface Line {
  id: number;
  node: ReactNode;
}

interface PendingAsk {
  prompt: string;
  secret: boolean;
  username?: string;
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}

type Mode = { kind: 'idle' } | { kind: 'running' } | { kind: 'asking'; ask: PendingAsk };

export interface TerminalProps {
  commands: TerminalCommand[];
  prompt: TerminalPrompt;
  banner?: ReactNode;
  /** 이 영역 안에서 스크롤한다. 높이는 부모가 정한다. */
  className?: string;
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(function Terminal({ commands, prompt, banner, className = '' }, ref) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextLineId = useRef(0);
  const running = useRef<AbortController | null>(null);
  const history = useRef<string[]>([]);
  const historyIndex = useRef<number | null>(null);
  const latestCommands = useRef(commands);
  latestCommands.current = commands;

  const [lines, setLines] = useState<Line[]>([]);
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const [value, setValue] = useState('');
  const [caret, setCaret] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [focused, setFocused] = useState(false);

  function syncCaret(input: HTMLInputElement) {
    setCaret(input.selectionStart ?? input.value.length);
    setScrollLeft(input.scrollLeft);
  }

  // 기록, Tab 완성처럼 코드가 값을 바꾸면 select 이벤트가 없어서 여기서 맞춘다.
  useLayoutEffect(() => {
    if (inputRef.current) syncCaret(inputRef.current);
  }, [value, mode]);

  const print = useCallback((node: ReactNode) => {
    const id = nextLineId.current++;
    setLines((current) => [...current, { id, node }].slice(-MAX_LINES));
  }, []);

  const echo = useCallback(
    (text: string) =>
      print(
        <p className="whitespace-pre-wrap break-words">
          <PromptText prompt={prompt} />
          {text && <span className="text-white"> {text}</span>}
        </p>,
      ),
    [print, prompt],
  );

  const printHelp = useCallback(() => {
    const visible = latestCommands.current.filter((c) => !c.hidden);
    // 좁은 폭에서도 설명이 설명 열 안에서 줄바꿈되게 한 grid로 그린다.
    print(
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-[4ch] pl-[2ch]">
        {visible.map((command) => (
          <Fragment key={command.name}>
            <dt className="whitespace-pre text-on-surface">{command.usage ?? command.name}</dt>
            <dd className="text-on-surface-muted">{command.summary}</dd>
          </Fragment>
        ))}
      </dl>,
    );
  }, [print]);

  const execute = useCallback(
    async (line: string) => {
      echo(line);
      const [name, ...args] = tokenize(line);
      if (!name) return;
      history.current = [...history.current, line.trim()];

      if (name === 'help') {
        printHelp();
        return;
      }
      const command = latestCommands.current.find((c) => c.name === name);
      if (!command) {
        print(<TerminalText tone="error">hash: command not found: {name}</TerminalText>);
        printHelp();
        return;
      }

      const controller = new AbortController();
      running.current = controller;
      setMode({ kind: 'running' });
      const io: TerminalIo = {
        signal: controller.signal,
        print: (node) => {
          if (!controller.signal.aborted) print(node);
        },
        clear: () => setLines([]),
        ask: (askPrompt, options?: AskOptions) =>
          new Promise<string>((resolve, reject) => {
            setMode({
              kind: 'asking',
              ask: {
                prompt: askPrompt,
                secret: options?.secret ?? false,
                username: options?.username,
                resolve,
                reject,
              },
            });
          }),
      };

      try {
        await command.run(args, io);
      } catch (error) {
        if (!controller.signal.aborted) {
          print(<TerminalText tone="error">{name}: something went wrong.</TerminalText>);
          console.error(error);
        }
      } finally {
        if (running.current === controller) {
          running.current = null;
          setMode({ kind: 'idle' });
        }
      }
    },
    [echo, print, printHelp],
  );

  useImperativeHandle(
    ref,
    () => ({
      run: (line) => {
        if (running.current) return;

        setValue('');
        void execute(line);
        inputRef.current?.focus();
      },
    }),
    [execute],
  );

  useEffect(() => {
    // 페이지가 아니라 터미널 영역만 맨 아래로 내린다.
    const area = scrollRef.current;
    if (area) area.scrollTop = area.scrollHeight;
  }, [lines, mode]);

  function interrupt() {
    if (mode.kind === 'idle') {
      echo(`${value}^C`);
      setValue('');
      return;
    }

    if (mode.kind === 'asking') {
      print(
        <p>
          {mode.ask.prompt}
          <span className="text-white"> ^C</span>
        </p>,
      );
      mode.ask.reject(new DOMException('Interrupted', 'AbortError'));
    } else {
      print(<p className="text-white">^C</p>);
    }

    running.current?.abort();
    running.current = null;
    setValue('');
    setMode({ kind: 'idle' });
  }

  function complete() {
    const [name, ...rest] = value.split(' ');
    if (rest.length === 0) {
      const names = ['help', ...latestCommands.current.filter((c) => !c.hidden).map((c) => c.name)];
      applyCompletion(
        names.filter((n) => n.startsWith(name)),
        (match) => `${match} `,
        name,
      );
      return;
    }

    const command = latestCommands.current.find((c) => c.name === name);
    const argument = rest.join(' ');
    const candidates = command?.complete?.(argument) ?? [];
    // 후보는 명령이 고른다. 대소문자를 가리지 않는 비교도 명령의 몫이다.
    applyCompletion(candidates, (match) => `${name} ${match}`, argument, name);
  }

  function applyCompletion(matches: string[], toValue: (match: string) => string, typed: string, commandName?: string) {
    if (matches.length === 0) return;

    if (matches.length === 1) {
      setValue(toValue(matches[0]));
      return;
    }
    const prefix = commonPrefix(matches);
    if (prefix.length > typed.length) {
      setValue(commandName ? `${commandName} ${prefix}` : prefix);
      return;
    }
    echo(value);
    print(<TerminalText tone="muted">{matches.join('   ')}</TerminalText>);
  }

  function moveInHistory(step: -1 | 1) {
    const entries = history.current;
    if (entries.length === 0) return;

    const from = historyIndex.current ?? entries.length;
    const to = Math.min(Math.max(from + step, 0), entries.length);
    historyIndex.current = to === entries.length ? null : to;
    setValue(to === entries.length ? '' : entries[to]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const hasSelection = input.selectionStart !== input.selectionEnd;
    if (event.ctrlKey && event.key === 'c' && !hasSelection) {
      event.preventDefault();
      interrupt();
      return;
    }
    if (event.ctrlKey && event.key === 'l') {
      event.preventDefault();
      setLines([]);
      return;
    }

    if (mode.kind !== 'idle') return;
    // IME 조합 중에 값을 바꾸면 조합이 끝날 때 조합하던 글자가 끝에 다시 붙는다.
    if (event.nativeEvent.isComposing) {
      if (event.key === 'Tab') event.preventDefault();
      return;
    }

    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        complete();
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveInHistory(-1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        moveInHistory(1);
        break;
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitted = value;
    setValue('');
    historyIndex.current = null;

    if (mode.kind === 'asking') {
      const { ask } = mode;
      print(
        <p className="whitespace-pre-wrap break-words">
          {ask.prompt}
          {!ask.secret && submitted && <span className="text-white"> {submitted}</span>}
        </p>,
      );
      setMode({ kind: 'running' });
      ask.resolve(submitted);
      return;
    }
    if (mode.kind === 'idle') void execute(submitted);
  }

  const asking = mode.kind === 'asking' ? mode.ask : null;

  return (
    <div
      ref={scrollRef}
      className={`flex flex-col overflow-y-auto overscroll-contain ${className}`}
      onClick={() => {
        if (!window.getSelection()?.toString()) inputRef.current?.focus();
      }}
    >
      {banner}
      <div role="log" aria-live="polite" className="flex flex-col">
        {lines.map((line) => (
          <div key={line.id}>{line.node}</div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-baseline gap-x-[1ch]">
        <label htmlFor={inputId} className={mode.kind === 'running' ? 'sr-only' : asking ? 'text-on-surface' : undefined}>
          {asking ? asking.prompt : <PromptText prompt={prompt} />}
        </label>
        <span className="relative min-w-[8ch] flex-1">
          <input
            ref={inputRef}
            id={inputId}
            // 비밀번호 칸은 type이 바뀌어야 비밀번호 관리자가 알아본다.
            type={asking?.secret ? 'password' : 'text'}
            autoComplete={asking?.secret ? 'current-password' : 'off'}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint={asking ? 'go' : 'enter'}
            readOnly={mode.kind === 'running'}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onSelect={(event) => syncCaret(event.currentTarget)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoFocus
            className={`w-full bg-transparent caret-transparent outline-none ${asking?.secret ? 'text-on-surface-muted' : 'text-white'}`}
          />
          {mode.kind !== 'running' && (
            <BlockCursor text={asking?.secret ? '•'.repeat(value.length) : value} caret={caret} scrollLeft={scrollLeft} focused={focused} />
          )}
        </span>
        {asking?.username && <input type="text" name="username" autoComplete="username" value={asking.username} readOnly hidden />}
        {/* 칸이 둘 이상인 form은 submit 버튼이 있어야 Enter로 제출된다. */}
        <button type="submit" tabIndex={-1} aria-hidden="true" className="sr-only">
          Enter
        </button>
      </form>
    </div>
  );
});

/**
 * 브라우저 기본 커서는 얇은 세로선이라 터미널처럼 블록을 그린다.
 * 입력 칸 위에 같은 글자를 투명하게 깔아 커서 위치를 맞춘다.
 * 블록은 글자 한 칸 폭(0.6em)이고 높이는 글자 크기(1em)라 줄 높이보다 작다. 커서 아래 글자는 반전색으로 보인다.
 */
function BlockCursor({ text, caret, scrollLeft, focused }: { text: string; caret: number; scrollLeft: number; focused: boolean }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre">
      <span className="inline-block" style={{ transform: `translateX(${-scrollLeft}px)` }}>
        <span className="invisible">{text.slice(0, caret)}</span>
        <span
          className={`inline-flex h-[1em] w-[0.6em] items-center justify-center overflow-hidden align-[-0.15em] leading-none text-surface bg-accent ${
            focused ? 'animate-blink motion-reduce:animate-none' : ''
          }`}
        >
          {text[caret]}
        </span>
      </span>
    </span>
  );
}

export function PromptText({ prompt }: { prompt: TerminalPrompt }) {
  return (
    <>
      <span className="text-accent">{prompt.identity}</span>
      <span className="text-secondary">{prompt.rest}</span>
    </>
  );
}
