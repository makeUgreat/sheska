import { DOMAIN_ERROR_KIND, type DomainErrorOf } from '@kernels/domain';

type PostContentEmptyError = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  'post',
  'content_empty'
>;

export type PostContentDomainError = PostContentEmptyError;
