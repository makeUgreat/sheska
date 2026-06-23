import { DOMAIN_ERROR_KIND, type DomainErrorOf } from './error.base';

type EntityIdEmptyError = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  'entity',
  'id_empty'
>;

type EntityPropsNotObjectError = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  'entity',
  'props_not_object'
>;

export type EntityDomainError = EntityIdEmptyError | EntityPropsNotObjectError;
