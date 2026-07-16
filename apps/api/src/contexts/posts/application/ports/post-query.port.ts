export interface PostQueryResult {
  readonly postId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly viewCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly sourceContent: string;
}

export type PostQueryFindCriteria = {
  readonly id: string;
};

export interface PostQuery {
  get(criteria: PostQueryFindCriteria): Promise<PostQueryResult>;
  find(criteria: PostQueryFindCriteria): Promise<PostQueryResult | null>;
}
