import { useRef, useState } from 'react';
import {
  directoryPath,
  useBrowseCommands,
  type Directory,
} from '@/features/terminal-browse';
import { useSearchCommand } from '@/features/terminal-search';
import { useSwitchUserCommands } from '@/features/terminal-switch-user';
import { useViewer } from '@/entities/session';
import {
  clearCommand,
  type TerminalCommand,
  type TerminalListedEntry,
} from '@/shared/ui';

export function useShellCommands() {
  const viewer = useViewer();
  const [directory, setDirectory] = useState<Directory>('home');
  // ls와 grep이 방금 보인 목록. cat이 Tab 완성과 열기에 쓴다.
  const recent = useRef<TerminalListedEntry[]>([]);
  const where: Directory = viewer === 'owner' ? directory : 'home';

  const [ls, cat, cd] = useBrowseCommands({
    viewer,
    directory: where,
    onDirectoryChange: setDirectory,
    recent,
  });
  const grep = useSearchCommand({ recent });
  const [su, exit, logout, whoami] = useSwitchUserCommands({
    viewer,
    onLoggedOut: () => setDirectory('home'),
  });

  // help는 이 순서로 보인다.
  const commands: TerminalCommand[] = [
    ls,
    cat,
    grep,
    cd,
    clearCommand,
    su,
    exit,
    logout,
    whoami,
  ];
  const owner = viewer === 'owner';

  return {
    viewer,
    commands,
    prompt: `${viewer}@hash:${directoryPath(where)}${owner ? '#' : '$'}`,
  };
}
