export interface GetPostHttpResponse {
  readonly postId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly viewCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sourceContent: string;
}
