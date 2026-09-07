import { type CallContext } from '@core/call-context';

export interface SearchQueryEmbedder {
  embed(
    query: string,
    context: CallContext,
    attemptTimeoutMs?: number,
  ): Promise<number[] | null>;
}
