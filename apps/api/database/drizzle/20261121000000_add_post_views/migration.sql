-- 이전 조회수는 탭 복귀와 다시 불러오기로 부풀려져 있어 버린다.
UPDATE "posts" SET "view_count" = 0;

CREATE TABLE "post_views" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "post_id" text NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "ip" text NOT NULL,
  "client" text NOT NULL,
  "viewed_at" timestamp with time zone NOT NULL
);

CREATE INDEX "post_views_post_id_ip_viewed_at_idx" ON "post_views" ("post_id", "ip", "viewed_at" DESC);
