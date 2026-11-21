CREATE INDEX "post_views_post_id_viewed_at_id_idx" ON "post_views" ("post_id", "viewed_at" DESC, "id" DESC);
