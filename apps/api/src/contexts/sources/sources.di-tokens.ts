// Tokens used for Dependency Injection
export const SOURCE_FINGERPRINTER = Symbol('SOURCE_FINGERPRINTER');
export const SOURCE_REPOSITORY = Symbol('SOURCE_REPOSITORY');
export const SOURCE_SYNC_JOB_REPOSITORY = Symbol('SOURCE_SYNC_JOB_REPOSITORY');
export const SOURCE_EMBEDDING_LOOKUP = Symbol('SOURCE_EMBEDDING_LOOKUP');
export const SOURCE_QUERY = Symbol('SOURCE_QUERY');
export const SOURCE_LOOKUP = Symbol('SOURCE_LOOKUP');
export const SOURCES_UNIT_OF_WORK = Symbol('SOURCES_UNIT_OF_WORK');

export type { SourceRepository } from '@contexts/sources/domain';
export type { SourceLookup } from '@contexts/sources/application/ports';
