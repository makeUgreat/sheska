UPDATE "posts"
  SET "id" = "source_id";

ALTER TABLE "posts"
  DROP COLUMN "source_id";

ALTER TABLE "posts"
  ADD CONSTRAINT "posts_id_sources_id_fkey"
  FOREIGN KEY ("id") REFERENCES "sources"("id") ON DELETE CASCADE;
