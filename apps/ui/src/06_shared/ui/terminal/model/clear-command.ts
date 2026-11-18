import { type TerminalCommand } from './types';

export const clearCommand: TerminalCommand = {
  name: 'clear',
  summary: 'clear the screen',
  run: (_args, io) => io.clear(),
};
