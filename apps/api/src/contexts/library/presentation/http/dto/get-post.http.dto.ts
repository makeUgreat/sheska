import { type ResolvedLinkHttpResponse } from './resolved-link.http.dto';

export interface GetPostHttpResponse {
  readonly postId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly body: string;
  readonly links: readonly ResolvedLinkHttpResponse[];
  readonly viewCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
