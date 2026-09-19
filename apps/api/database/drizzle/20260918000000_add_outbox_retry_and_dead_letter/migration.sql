ALTER TABLE "outbox_messages"
  ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  ADD COLUMN "dead_lettered_at" timestamp with time zone,
  ADD COLUMN "last_failure_reason" text;

DROP INDEX "outbox_messages_pending_created_at_idx";

CREATE INDEX "outbox_messages_due_idx"
ON "outbox_messages" ("next_attempt_at", "created_at")
WHERE "published_at" IS NULL AND "dead_lettered_at" IS NULL;
