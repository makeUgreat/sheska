import { DOMAIN_ERROR_KIND, type DomainErrorOf } from '@kernels/domain';

type SourceContentHashEmptyError = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  'source',
  'content_hash_empty'
>;

export type SourceContentHashDomainError = SourceContentHashEmptyError;
