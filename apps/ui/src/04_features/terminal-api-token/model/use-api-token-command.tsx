import { useRef } from 'react';
import { ApiTokenErrorCode, AuthErrorCode } from '@sheska/contract';
import { issueApiToken, listApiTokens, revokeApiToken, type ApiToken } from '@/entities/api-token';
import { type Viewer } from '@/entities/session';
import { HttpError, useHttpClient } from '@/shared/api';
import { formatMonthDay } from '@/shared/lib';
import {
  printRequestFailure,
  TerminalText,
  TerminalTree,
  TerminalTreeRoot,
  type TerminalCommand,
  type TerminalIo,
  type TerminalTreeItem,
} from '@/shared/ui';

const SUBCOMMANDS = ['ls', 'create', 'revoke'];

export function useApiTokenCommand({ viewer }: { viewer: Viewer }): TerminalCommand {
  const http = useHttpClient();
  // 방금 본 토큰 이름. `token revoke`가 Tab으로 채운다.
  const known = useRef<string[]>([]);

  async function fetchTokens() {
    const tokens = await listApiTokens(http);
    known.current = tokens.map((token) => token.name);
    return tokens;
  }

  async function list(io: TerminalIo) {
    const tokens = await fetchTokens();
    if (tokens.length === 0) {
      io.print(<TerminalText tone="muted">no tokens. Create one with token create &lt;name&gt;</TerminalText>);
      return;
    }

    io.print(<TerminalTree root={<TerminalTreeRoot label="tokens" note={countOf(tokens.length)} />} items={tokens.map(tokenItem)} />);
  }

  async function create(name: string | undefined, io: TerminalIo) {
    if (!name) {
      io.print(<TerminalText tone="error">usage: token create &lt;name&gt;</TerminalText>);
      return;
    }

    const issued = await issueApiToken(http, name);
    known.current = [...known.current, issued.name];

    io.print(<TerminalText tone="success">created {issued.name}</TerminalText>);
    io.print(<p className="select-all font-bold break-all text-on-surface">{issued.token}</p>);
    io.print(<TerminalText tone="muted">Copy it now. It will not be shown again.</TerminalText>);
  }

  async function revoke(name: string | undefined, io: TerminalIo) {
    if (!name) {
      io.print(<TerminalText tone="error">usage: token revoke &lt;name&gt;</TerminalText>);
      return;
    }

    const token = (await fetchTokens()).find((each) => each.name === name);
    if (!token) {
      io.print(<TerminalText tone="error">token: {name}: no such token</TerminalText>);
      return;
    }

    const answer = await io.ask(`Revoke ${name}? Programs using it stop working. [y/N]`);
    if (answer.trim().toLowerCase() !== 'y') {
      io.print(<TerminalText tone="muted">kept {name}</TerminalText>);
      return;
    }

    await revokeApiToken(http, token.apiTokenId);
    known.current = known.current.filter((each) => each !== name);

    io.print(<TerminalText tone="success">revoked {name}</TerminalText>);
  }

  return {
    name: 'token',
    usage: 'token [ls | create <name> | revoke <name>]',
    summary: 'manage API tokens for the Obsidian plugin',
    hidden: viewer !== 'owner',
    async run(args, io) {
      if (viewer !== 'owner') {
        io.print(<TerminalText tone="error">token: permission denied</TerminalText>);
        return;
      }

      const [subcommand = 'ls', name] = args;
      try {
        switch (subcommand) {
          case 'ls':
            await list(io);
            break;
          case 'create':
            await create(name, io);
            break;
          case 'revoke':
            await revoke(name, io);
            break;
          default:
            io.print(<TerminalText tone="error">token: unknown command &apos;{subcommand}&apos;. Try ls, create, or revoke.</TerminalText>);
        }
      } catch (error) {
        printTokenFailure(io, error, name);
      }
    },
    complete(argument) {
      if (viewer !== 'owner') return [];

      const [subcommand, typed = ''] = argument.split(' ');
      if (subcommand === 'revoke' && argument.includes(' ')) {
        return known.current.filter((name) => name.startsWith(typed)).map((name) => `revoke ${name}`);
      }
      return SUBCOMMANDS.filter((each) => each.startsWith(argument));
    },
  };
}

function tokenItem(token: ApiToken): TerminalTreeItem {
  const used = token.lastUsedAt ? `used ${formatMonthDay(token.lastUsedAt)}` : 'never used';
  return {
    key: token.apiTokenId,
    head: (
      <>
        <span className="font-bold text-on-surface">{token.name}</span>
        <span className="ml-[2ch] text-on-surface-muted">
          {token.hint}… · created {formatMonthDay(token.createdAt)} · {used}
        </span>
      </>
    ),
  };
}

function countOf(count: number) {
  return `${count} ${count === 1 ? 'token' : 'tokens'}`;
}

function printTokenFailure(io: TerminalIo, error: unknown, name?: string) {
  if (io.signal.aborted) return;

  if (error instanceof HttpError) {
    if (error.code === AuthErrorCode.UNAUTHENTICATED) {
      io.print(<TerminalText tone="error">token: your session has ended. Log in again with su.</TerminalText>);
      return;
    }
    if (error.code === ApiTokenErrorCode.NAME_TAKEN) {
      io.print(<TerminalText tone="error">token: {name} already exists</TerminalText>);
      return;
    }
    if (error.status === 400) {
      io.print(<TerminalText tone="error">token: invalid name &apos;{name}&apos;. Use 1-32 lowercase letters, digits, or -.</TerminalText>);
      return;
    }
    if (error.code === ApiTokenErrorCode.NOT_FOUND) {
      io.print(<TerminalText tone="error">token: {name}: no such token</TerminalText>);
      return;
    }
  }
  printRequestFailure(io, 'token', error);
}
