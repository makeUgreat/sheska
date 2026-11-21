CREATE TABLE "post_summaries" (
  "post_id" text PRIMARY KEY REFERENCES "posts"("id") ON DELETE CASCADE,
  "fingerprint" text NOT NULL,
  "sentences" text[],
  "model" text,
  "finished_at" timestamp with time zone NOT NULL
);
