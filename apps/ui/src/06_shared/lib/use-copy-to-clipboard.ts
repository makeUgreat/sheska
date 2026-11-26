import { useCallback, useEffect, useState } from 'react';

const RESULT_RESET_MS = 2000;

export type CopyResult = 'idle' | 'copied' | 'failed';

export function useCopyToClipboard() {
  const [result, setResult] = useState<CopyResult>('idle');

  useEffect(() => {
    if (result === 'idle') return;

    const timer = window.setTimeout(() => setResult('idle'), RESULT_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [result]);

  /** Clipboard는 비보안 컨텍스트에서 아예 없으므로 실패를 정상 경로로 둔다. */
  const copy = useCallback((text: string) => {
    if (!navigator.clipboard) {
      setResult('failed');
      return;
    }

    navigator.clipboard.writeText(text).then(
      () => setResult('copied'),
      () => setResult('failed'),
    );
  }, []);

  return { result, copy };
}
