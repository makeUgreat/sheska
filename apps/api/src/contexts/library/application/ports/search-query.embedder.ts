import { type CallContext } from '@core/call-context';

export interface SearchQueryEmbedder {
  embed(query: string, context: CallContext): Promise<number[] | null>;
}
