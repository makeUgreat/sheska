import { describe, expect, it } from 'vitest';
import { SourceFingerprinterSha256 } from '../source.fingerprinter.sha256';

describe('SourceFingerprinterSha256', () => {
  it('content의 SHA-256 hex fingerprint를 계산한다', async () => {
    const fingerprinter = new SourceFingerprinterSha256();

    const result = await fingerprinter.calculate('hello');

    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      expect(result.value).toBe(
        '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      );
    }
  });
});
