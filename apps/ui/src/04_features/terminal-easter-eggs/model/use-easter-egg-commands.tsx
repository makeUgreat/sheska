import { type Viewer } from '@/entities/session';
import { TerminalText, type TerminalCommand } from '@/shared/ui';

/** help에 없는 명령. 실제 sudo와 GNU rm 문구의 앞부분을 두고 끝을 농담으로 바꾼다. */
export function useEasterEggCommands({ viewer, commands }: { viewer: Viewer; commands: TerminalCommand[] }): TerminalCommand[] {
  const rm: TerminalCommand = {
    name: 'rm',
    summary: 'remove files',
    hidden: true,
    run(args, io) {
      const flags = args.filter((arg) => arg.startsWith('-'));
      const targets = args.filter((arg) => !arg.startsWith('-'));
      const recursive = flags.some((flag) => flag === '--recursive' || (!flag.startsWith('--') && /[rR]/.test(flag)));
      const failsafe = recursive && !flags.includes('--no-preserve-root');
      if (targets.length === 0) {
        io.print(<TerminalText tone="error">rm: missing operand</TerminalText>);
        return;
      }

      for (const target of targets) {
        if (failsafe && isRoot(target)) {
          io.print(
            <TerminalText tone="error">
              rm: it is dangerous to operate recursively on {`'/'`}. --no-preserve-root exists, if you&apos;re curious.
            </TerminalText>,
          );
          continue;
        }
        io.print(
          <TerminalText tone="error">
            rm: cannot remove {`'${target}'`}: {removalJoke(viewer, target)}
          </TerminalText>,
        );
      }
    },
  };

  const runnable = [...commands, rm];

  const sudo: TerminalCommand = {
    name: 'sudo',
    usage: 'sudo <command>',
    summary: 'run a command as root',
    hidden: true,
    async run(args, io) {
      const [name, ...rest] = args;
      const command = runnable.find((candidate) => candidate.name === name);
      if (!name) {
        io.print(<TerminalText tone="error">usage: sudo &lt;command&gt;</TerminalText>);
        return;
      }
      if (viewer === 'guest') {
        io.print(<TerminalText tone="error">guest is not in the sudoers file. Let&apos;s get to know each other first.</TerminalText>);
        return;
      }
      if (!command) {
        io.print(<TerminalText tone="error">sudo: {name}: command not found</TerminalText>);
        return;
      }

      await command.run(rest, io);
    },
  };

  return [sudo, rm];
}

function isRoot(target: string): boolean {
  return /^\/+$/.test(target);
}

/** 오류 이유 자리에 "거의 지울 뻔했다"는 농담을 넣는다. owner는 uid 0이라 읽기 전용을 핑계로 댄다. */
function removalJoke(viewer: Viewer, target: string): string {
  if (isRoot(target)) return 'Made it past the failsafe, got to 99%, then tripped on the last byte.';
  if (viewer === 'owner') return "Got to 99%, then the disk remembered it's read-only.";
  return 'Got to 99%, then the system got cold feet.';
}
