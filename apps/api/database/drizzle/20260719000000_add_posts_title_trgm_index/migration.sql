CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX posts_title_trgm_idx ON posts USING GIN (title gin_trgm_ops);
