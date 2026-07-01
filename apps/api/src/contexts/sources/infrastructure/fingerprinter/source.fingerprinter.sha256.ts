import { createHash } from 'node:crypto';
import { type SourceFingerprinter } from '@contexts/sources/application/ports';

export class SourceFingerprinterSha256 implements SourceFingerprinter {
  calculate(content: string): Promise<string> {
    return Promise.resolve(
      createHash('sha256').update(content, 'utf8').digest('hex'),
    );
  }
}
