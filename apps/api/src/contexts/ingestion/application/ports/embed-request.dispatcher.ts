export const EMBED_REQUESTS_QUEUE = 'embed-requests';

export interface EmbedRequestPayload {
  readonly sourceId: string;
  readonly syncJobId: string;
  readonly content: string;
}

export interface EmbedRequestDispatcher {
  enqueue(payload: EmbedRequestPayload): Promise<void>;
}
