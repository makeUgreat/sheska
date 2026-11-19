import { type CallContext } from '@core/call-context';

export interface TextEmbedder {
  embed(
    text: string,
    context: CallContext,
  ): Promise<{
    embedding: number[];
    model: string;
  }>;
}
