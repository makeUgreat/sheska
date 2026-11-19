import { HttpError } from '@/shared/api';
import { type TerminalIo } from '../model/types';
import { TerminalText } from './terminal-output';

/** 명령 이름을 앞에 붙여 실패를 한 줄로 알린다. Ctrl+C로 멈춘 요청은 알리지 않는다. */
export function printRequestFailure(io: TerminalIo, commandName: string, error: unknown) {
  if (io.signal.aborted) return;

  const reason =
    error instanceof HttpError && error.status < 500 ? `request failed (${error.status}).` : 'cannot reach the server. Try again later.';
  io.print(
    <TerminalText tone="error">
      {commandName}: {reason}
    </TerminalText>,
  );
}
