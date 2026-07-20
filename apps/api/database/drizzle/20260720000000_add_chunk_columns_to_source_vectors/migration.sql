-- Add chunk columns and change primary key to support multiple chunks per source

ALTER TABLE "source_vectors"
  ADD COLUMN "chunk_index" integer,
  ADD COLUMN "chunk_content" text;

UPDATE "source_vectors"
  SET "chunk_index" = 0,
      "chunk_content" = ''
  WHERE "chunk_index" IS NULL;

ALTER TABLE "source_vectors"
  ALTER COLUMN "chunk_index" SET NOT NULL,
  ALTER COLUMN "chunk_content" SET NOT NULL;

ALTER TABLE "source_vectors"
  DROP CONSTRAINT "source_vectors_pkey";

ALTER TABLE "source_vectors"
  ADD PRIMARY KEY ("source_id", "chunk_index");
