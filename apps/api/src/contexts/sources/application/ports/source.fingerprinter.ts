import { type ResultAsync } from '@core/result';
import {
  type ApplicationFailureOf,
  APPLICATION_FAILURE_KIND,
} from '@kernels/application';

export type SourceFingerprinterUnavailableFailure = ApplicationFailureOf<
  typeof APPLICATION_FAILURE_KIND.DEPENDENCY_UNAVAILABLE,
  'source_fingerprinter',
  'unavailable'
>;

export type SourceFingerprinterFailure = SourceFingerprinterUnavailableFailure;

export interface SourceFingerprinter {
  calculate(content: string): ResultAsync<string, SourceFingerprinterFailure>;
}
