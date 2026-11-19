-- Tokens issued before permissions existed were all for the Obsidian plugin.
ALTER TABLE "api_tokens"
  ADD COLUMN "permissions" text[] NOT NULL DEFAULT '{sources:sync}';

ALTER TABLE "api_tokens"
  ALTER COLUMN "permissions" DROP DEFAULT;
