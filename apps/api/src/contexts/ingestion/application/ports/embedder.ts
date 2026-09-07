import { type CallContext } from '@core/call-context';

export interface Embedder {
  embed(
    text: string,
    context: CallContext,
    attemptTimeoutMs?: number,
  ): Promise<{ embedding: number[]; model: string }>;
}
