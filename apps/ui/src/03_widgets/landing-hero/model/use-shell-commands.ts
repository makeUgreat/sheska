import { useRef, useState } from 'react';
import { canEnter, displayPath, HOME, useBrowseCommands } from '@/features/terminal-browse';
import { useApiTokenCommand } from '@/features/terminal-api-token';
import { useAskAiCommand } from '@/features/terminal-ask-ai';
import { useSearchCommand } from '@/features/terminal-search';
import { useSwitchUserCommands } from '@/features/terminal-switch-user';
import { useViewer } from '@/entities/session';
import { clearCommand, type TerminalCommand, type TerminalListedEntry } from '@/shared/ui';

export function useShellCommands() {
  const viewer = useViewer();
  const [directory, setDirectory] = useState<string>(HOME);
  // ls와 grep이 방금 보인 목록. cat이 Tab 완성과 열기에 쓴다.
  const recent = useRef<TerminalListedEntry[]>([]);
  const where = canEnter(directory, viewer) ? directory : HOME;

  const [ls, cat, cd, pwd] = useBrowseCommands({
    viewer,
    directory: where,
    onDirectoryChange: setDirectory,
    recent,
  });
  const grep = useSearchCommand({ recent });
  const ai = useAskAiCommand();
  const token = useApiTokenCommand({ viewer });
  const [su, exit, logout, whoami] = useSwitchUserCommands({
    viewer,
    onLoggedOut: () => setDirectory(HOME),
  });

  // help는 이 순서로 보인다.
  const commands: TerminalCommand[] = [ls, cat, grep, ai, cd, pwd, clearCommand, token, su, exit, logout, whoami];
  const owner = viewer === 'owner';

  return {
    viewer,
    commands,
    prompt: {
      identity: `${viewer}@hash`,
      rest: `:${displayPath(where)}${owner ? '#' : '$'}`,
    },
  };
}
