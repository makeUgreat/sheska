CREATE TABLE "outbox_messages" (
  "event_id" text PRIMARY KEY,
  "event_type" text NOT NULL,
  "event_version" integer NOT NULL,
  "payload" jsonb NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "published_at" timestamp with time zone
);

CREATE INDEX "outbox_messages_pending_created_at_idx"
ON "outbox_messages" ("created_at")
WHERE "published_at" IS NULL;
