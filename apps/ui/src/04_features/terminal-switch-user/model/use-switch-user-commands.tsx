import { AuthErrorCode } from '@sheska/contract';
import { useLogIn, useLogOut, type Viewer } from '@/entities/session';
import { HttpError } from '@/shared/api';
import {
  printRequestFailure,
  TerminalText,
  type TerminalCommand,
  type TerminalIo,
} from '@/shared/ui';

const OWNER = 'owner';

export function useSwitchUserCommands({
  viewer,
  onLoggedOut,
}: {
  viewer: Viewer;
  onLoggedOut: () => void;
}): TerminalCommand[] {
  const logIn = useLogIn();
  const logOut = useLogOut();

  const su: TerminalCommand = {
    name: 'su',
    summary: 'log in as the owner',
    hidden: viewer === 'owner',
    async run(args, io) {
      const user = args[0] ?? OWNER;
      if (user !== OWNER) {
        io.print(
          <TerminalText tone="error">
            su: user {user} does not exist
          </TerminalText>,
        );
        return;
      }
      if (viewer === 'owner') {
        io.print(
          <TerminalText tone="muted">already logged in as owner</TerminalText>,
        );
        return;
      }
      const password = await io.ask('Password:', {
        secret: true,
        username: OWNER,
      });
      if (!password) {
        printAuthenticationFailure(io);
        return;
      }
      try {
        await logIn.mutateAsync({ password });
        io.print(
          <TerminalText tone="muted">
            Welcome back. This browser stays logged in for 30 days.
          </TerminalText>,
        );
      } catch (error) {
        printLogInFailure(io, error);
      }
    },
  };

  async function leave(name: string, io: TerminalIo) {
    if (viewer !== 'owner') {
      io.print(<TerminalText tone="error">{name}: not logged in</TerminalText>);
      return;
    }
    try {
      await logOut.mutateAsync();
      onLoggedOut();
      io.print(<TerminalText tone="muted">logout</TerminalText>);
    } catch (error) {
      printRequestFailure(io, name, error);
    }
  }

  const exit: TerminalCommand = {
    name: 'exit',
    summary: 'log out',
    hidden: viewer !== 'owner',
    run: (_args, io) => leave('exit', io),
  };

  const logout: TerminalCommand = {
    name: 'logout',
    summary: 'log out',
    hidden: true,
    run: (_args, io) => leave('logout', io),
  };

  const whoami: TerminalCommand = {
    name: 'whoami',
    summary: 'print who you are',
    hidden: true,
    run: (_args, io) => io.print(<TerminalText>{viewer}</TerminalText>),
  };

  return [su, exit, logout, whoami];
}

function printAuthenticationFailure(io: TerminalIo) {
  io.print(
    <TerminalText tone="error">su: Authentication failure</TerminalText>,
  );
}

function printLogInFailure(io: TerminalIo, error: unknown) {
  if (!(error instanceof HttpError)) {
    printRequestFailure(io, 'su', error);
    return;
  }
  if (error.code === AuthErrorCode.TOO_MANY_ATTEMPTS) {
    const minutes = minutesUntilRetry(error.details.retryAfterSeconds);
    io.print(
      <TerminalText tone="error">
        su: too many attempts. Try again in {minutes}{' '}
        {minutes === 1 ? 'minute' : 'minutes'}.
      </TerminalText>,
    );
    return;
  }
  // 1024자를 넘는 비밀번호는 검증 오류(400)로 온다. 틀린 비밀번호와 같게 알린다.
  if (
    error.status === 400 ||
    error.code === AuthErrorCode.INVALID_CREDENTIALS
  ) {
    printAuthenticationFailure(io);
    return;
  }
  printRequestFailure(io, 'su', error);
}

function minutesUntilRetry(retryAfterSeconds: unknown): number {
  if (typeof retryAfterSeconds !== 'number' || retryAfterSeconds <= 0) return 1;
  return Math.ceil(retryAfterSeconds / 60);
}
