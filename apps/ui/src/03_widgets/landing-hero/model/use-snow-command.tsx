import { useState } from 'react';
import { TerminalText, type TerminalCommand } from '@/shared/ui';

/** 5초 넘게 움직이는 장식은 사용자가 멈출 수 있어야 한다(WCAG 2.2.2). */
export function useSnowCommand() {
  const [snowing, setSnowing] = useState(true);

  const command: TerminalCommand = {
    name: 'snow',
    summary: 'start or stop the snowfall',
    run(_args, io) {
      setSnowing(!snowing);
      io.print(
        <TerminalText tone="success">{snowing ? 'Snowfall stopped. Type snow to start it again.' : 'Snowfall started.'}</TerminalText>,
      );
    },
  };

  return { snowing, command };
}
