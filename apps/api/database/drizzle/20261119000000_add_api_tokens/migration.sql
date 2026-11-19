CREATE TABLE "api_tokens" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "secret_hash" text NOT NULL,
  "hint" text NOT NULL,
  "last_used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "api_tokens_name_unique" ON "api_tokens" ("name");

CREATE UNIQUE INDEX "api_tokens_secret_hash_unique" ON "api_tokens" ("secret_hash");
