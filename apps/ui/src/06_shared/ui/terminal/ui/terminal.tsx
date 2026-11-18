import {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { commonPrefix, tokenize } from '../model/tokenize';
import {
  type AskOptions,
  type TerminalCommand,
  type TerminalHandle,
  type TerminalIo,
} from '../model/types';
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

type Mode =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'asking'; ask: PendingAsk };

export interface TerminalProps {
  commands: TerminalCommand[];
  prompt: string;
  promptClassName?: string;
  banner?: ReactNode;
  /** 이 영역 안에서 스크롤한다. 높이는 부모가 정한다. */
  className?: string;
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(
  function Terminal(
    {
      commands,
      prompt,
      promptClassName = 'text-accent',
      banner,
      className = '',
    },
    ref,
  ) {
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

    const print = useCallback((node: ReactNode) => {
      const id = nextLineId.current++;
      setLines((current) => [...current, { id, node }].slice(-MAX_LINES));
    }, []);

    const echo = useCallback(
      (text: string) =>
        print(
          <p className="whitespace-pre-wrap break-words">
            <span className={promptClassName}>{prompt}</span>
            {text && <span className="text-white"> {text}</span>}
          </p>,
        ),
      [print, prompt, promptClassName],
    );

    const printHelp = useCallback(() => {
      const visible = latestCommands.current.filter((c) => !c.hidden);
      // 좁은 폭에서도 설명이 설명 열 안에서 줄바꿈되게 한 grid로 그린다.
      print(
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-[4ch] pl-[2ch]">
          {visible.map((command) => (
            <Fragment key={command.name}>
              <dt className="whitespace-pre text-on-surface">
                {command.usage ?? command.name}
              </dt>
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
          print(
            <TerminalText tone="error">
              hash: command not found: {name}
            </TerminalText>,
          );
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
            print(
              <TerminalText tone="error">
                {name}: something went wrong.
              </TerminalText>,
            );
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
      if (mode.kind === 'asking') {
        print(
          <p>
            {mode.ask.prompt}
            <span className="text-white"> ^C</span>
          </p>,
        );
        mode.ask.reject(new DOMException('Interrupted', 'AbortError'));
      } else if (mode.kind === 'running') {
        print(<p className="text-white">^C</p>);
      } else {
        echo(`${value}^C`);
        setValue('');
        return;
      }
      running.current?.abort();
      running.current = null;
      setValue('');
      setMode({ kind: 'idle' });
    }

    function complete() {
      const [name, ...rest] = value.split(' ');
      if (rest.length === 0) {
        const names = [
          'help',
          ...latestCommands.current.filter((c) => !c.hidden).map((c) => c.name),
        ];
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
      applyCompletion(
        candidates,
        (match) => `${name} ${match}`,
        argument,
        name,
      );
    }

    function applyCompletion(
      matches: string[],
      toValue: (match: string) => string,
      typed: string,
      commandName?: string,
    ) {
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
      if (event.key === 'Tab') {
        event.preventDefault();
        complete();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveInHistory(-1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveInHistory(1);
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
            {!ask.secret && submitted && (
              <span className="text-white"> {submitted}</span>
            )}
          </p>,
        );
        setMode({ kind: 'running' });
        ask.resolve(submitted);
        return;
      }
      if (mode.kind === 'idle') void execute(submitted);
    }

    const asking = mode.kind === 'asking' ? mode.ask : null;
    const label = asking ? asking.prompt : prompt;

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
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap items-baseline gap-x-[1ch]"
        >
          <label
            htmlFor={inputId}
            className={
              mode.kind === 'running'
                ? 'sr-only'
                : asking
                  ? 'text-on-surface'
                  : promptClassName
            }
          >
            {label}
          </label>
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
            onKeyDown={handleKeyDown}
            autoFocus
            className={`min-w-[8ch] flex-1 bg-transparent caret-accent outline-none ${
              asking?.secret ? 'text-on-surface-muted' : 'text-white'
            }`}
          />
          {asking?.username && (
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={asking.username}
              readOnly
              hidden
            />
          )}
          {/* 칸이 둘 이상인 form은 submit 버튼이 있어야 Enter로 제출된다. */}
          <button
            type="submit"
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          >
            Enter
          </button>
        </form>
      </div>
    );
  },
);
