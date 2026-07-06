import { describe, expect, it } from 'vitest';
import { SourceSha256Fingerprinter } from '../source.sha256.fingerprinter';

describe('SourceSha256Fingerprinter', () => {
  it('content의 SHA-256 hex fingerprint를 계산한다', async () => {
    const fingerprinter = new SourceSha256Fingerprinter();

    const result = await fingerprinter.calculate('hello');

    expect(result).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });
});
