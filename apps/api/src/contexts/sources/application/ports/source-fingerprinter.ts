import { type ResultAsync } from '@core/result';
import {
  type ApplicationErrorOf,
  APPLICATION_ERROR_KIND,
} from '@kernels/application';

export type SourceFingerprinterUnavailableError = ApplicationErrorOf<
  typeof APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
  'source_fingerprinter',
  'unavailable'
>;

export type SourceFingerprinterError = SourceFingerprinterUnavailableError;

export interface SourceFingerprinter {
  calculate(content: string): ResultAsync<string, SourceFingerprinterError>;
}
