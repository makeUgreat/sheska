import { type EntityDomainError } from '@kernels/domain';
import { type PostContentDomainError } from './post-content.error';
import { type PostTitleDomainError } from './post-title.error';

export type PostValidationError = PostTitleDomainError | PostContentDomainError;

export type PostDomainError = PostValidationError | EntityDomainError;
