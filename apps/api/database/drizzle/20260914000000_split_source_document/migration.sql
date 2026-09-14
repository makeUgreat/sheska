ALTER TABLE sources RENAME COLUMN content TO body;
--> statement-breakpoint
ALTER TABLE sources ADD COLUMN frontmatter jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE sources ADD COLUMN title text;
--> statement-breakpoint
UPDATE sources s
SET title = p.title
FROM posts p
WHERE p.source_id = s.id;
--> statement-breakpoint
UPDATE sources
SET title = external_source_id
WHERE title IS NULL;
--> statement-breakpoint
ALTER TABLE sources ALTER COLUMN title SET NOT NULL;
--> statement-breakpoint
ALTER TABLE sources DROP COLUMN content_search_vector;
--> statement-breakpoint
ALTER TABLE sources ADD COLUMN title_search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', bigram_tokens(title))
  ) STORED;
--> statement-breakpoint
ALTER TABLE sources ADD COLUMN body_search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', bigram_tokens(body))) STORED;
--> statement-breakpoint
CREATE INDEX sources_title_search_vector_idx
  ON sources USING GIN (title_search_vector);
--> statement-breakpoint
CREATE INDEX sources_body_search_vector_idx
  ON sources USING GIN (body_search_vector);
--> statement-breakpoint
ALTER TABLE posts DROP COLUMN title_search_vector;
--> statement-breakpoint
ALTER TABLE posts DROP COLUMN title;
