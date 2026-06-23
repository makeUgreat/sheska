import { DOMAIN_ERROR_KIND, type DomainErrorOf } from '@kernels/domain';

type PostTitleEmptyError = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  'post',
  'title_empty'
>;

export type PostTitleDomainError = PostTitleEmptyError;
