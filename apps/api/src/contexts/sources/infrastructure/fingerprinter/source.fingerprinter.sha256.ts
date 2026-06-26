import { createHash } from 'node:crypto';
import { okAsync } from '@core/result';
import { type SourceFingerprinter } from '@contexts/sources/application/ports';

export class SourceFingerprinterSha256 implements SourceFingerprinter {
  calculate(content: string) {
    return okAsync(createHash('sha256').update(content, 'utf8').digest('hex'));
  }
}
