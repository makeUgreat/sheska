import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/shared/ui';
import { retypeFrames } from './retype-frames';

const KEYSTROKE_MS = 14;
/** 명령이 길어도 전환이 느리게 느껴지지 않게 전체 입력 시간을 이 안에 맞춘다. */
const RETYPE_BUDGET_MS = 160;

/** 명령이 바뀌면 화면의 명령을 한 글자씩 지우고 다시 친다. 처음 그릴 때는 치지 않는다. */
export function useRetypedCommand(command: string) {
  const [shown, setShown] = useState(command);
  const shownRef = useRef(command);

  useEffect(() => {
    function show(frame: string) {
      shownRef.current = frame;
      setShown(frame);
    }

    if (prefersReducedMotion()) {
      show(command);
      return;
    }

    const frames = retypeFrames(shownRef.current, command);
    const keystrokeMs = Math.min(KEYSTROKE_MS, RETYPE_BUDGET_MS / frames.length);
    const timers = frames.map((frame, index) => setTimeout(() => show(frame), (index + 1) * keystrokeMs));
    return () => timers.forEach(clearTimeout);
  }, [command]);

  return shown;
}
