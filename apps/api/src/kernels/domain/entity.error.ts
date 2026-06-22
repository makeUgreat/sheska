import { DOMAIN_ERROR_KIND, type DomainErrorOf } from './error.base';

export type EntityDomainError = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  'entity',
  'id_empty' | 'props_not_object'
>;
