export interface ListPostsHttpResponseItem {
  postId: string;
  sourceId: string;
  title: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListPostsHttpResponse {
  posts: ListPostsHttpResponseItem[];
}
