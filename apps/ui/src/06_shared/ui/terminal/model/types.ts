import { type ReactNode } from 'react';

export interface AskOptions {
  /** 입력을 가리고 명령 기록에 넣지 않는다. 비밀번호 관리자가 채울 수 있게 password 칸으로 그린다. */
  secret?: boolean;
  /** 비밀번호 관리자가 어느 계정의 비밀번호인지 알도록 숨긴 username 칸에 넣는다. */
  username?: string;
}

export interface TerminalIo {
  print(line: ReactNode): void;
  clear(): void;
  /** 사용자가 Ctrl+C로 멈추면 AbortError로 reject한다. */
  ask(prompt: string, options?: AskOptions): Promise<string>;
  /** Ctrl+C로 명령을 멈추면 abort된다. */
  readonly signal: AbortSignal;
}

export interface TerminalCommand {
  name: string;
  /** help에 보이는 사용법. 없으면 name을 쓴다. */
  usage?: string;
  summary: string;
  /** help에서 뺀다. 명령은 그대로 실행된다. */
  hidden?: boolean;
  run(args: string[], io: TerminalIo): Promise<void> | void;
  /** Tab을 누르면 명령 이름 뒤의 글자로 후보를 찾는다. */
  complete?(argument: string): string[];
}

export interface TerminalHandle {
  /** 사용자가 입력한 것처럼 한 줄을 실행한다. 다른 명령이 도는 중이면 무시한다. */
  run(line: string): void;
}
