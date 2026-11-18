import { useState } from 'react';
import {
  directoryPath,
  useBrowseCommands,
  type Directory,
} from '@/features/terminal-browse';
import { useSearchCommand } from '@/features/terminal-search';
import { useSwitchUserCommands } from '@/features/terminal-switch-user';
import { useViewer } from '@/entities/session';
import { clearCommand, type TerminalCommand } from '@/shared/ui';

export function useShellCommands() {
  const viewer = useViewer();
  const [directory, setDirectory] = useState<Directory>('home');
  const where: Directory = viewer === 'owner' ? directory : 'home';

  const [ls, cat, cd] = useBrowseCommands({
    viewer,
    directory: where,
    onDirectoryChange: setDirectory,
  });
  const grep = useSearchCommand();
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
    promptClassName: owner ? 'text-accent' : 'text-secondary',
  };
}
