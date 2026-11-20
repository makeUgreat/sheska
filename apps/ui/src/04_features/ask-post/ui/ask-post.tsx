import { type Heading } from '@/shared/lib';
import { useAskPost } from '../model/use-ask-post';
import { AskDock } from './ask-dock';

/** 다른 post로 옮기면 대화를 새로 시작하도록 부르는 쪽이 `key`에 post id를 준다. */
export function AskPost({ postId, headings }: { postId: string; headings: readonly Heading[] }) {
  const { entries, busy, lockedSeconds, ask, retry, clear } = useAskPost(postId);

  return (
    <AskDock entries={entries} busy={busy} lockedSeconds={lockedSeconds} headings={headings} onAsk={ask} onRetry={retry} onClear={clear} />
  );
}
