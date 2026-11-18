import { TerminalText, type TerminalCommand } from '@/shared/ui';

/**
 * 안내문이 `ai`를 권하므로 이름을 먼저 잡아 둔다.
 * LLM 답을 붙이기 전까지는 준비 중이라고만 알리고 help에서는 뺀다.
 */
export function useAskAiCommand(): TerminalCommand {
  return {
    name: 'ai',
    usage: 'ai <question>',
    summary: 'ask an AI about these posts',
    hidden: true,
    run: (_args, io) =>
      io.print(
        <TerminalText tone="muted">
          ai: not ready yet. Try grep &lt;word&gt; for now.
        </TerminalText>,
      ),
  };
}
