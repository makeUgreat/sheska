CREATE TABLE "source_sync_jobs" (
	"id" text PRIMARY KEY,
	"source_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY,
	"external_source_id" text NOT NULL UNIQUE,
	"content" text NOT NULL,
	"fingerprint" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_sync_jobs" ADD CONSTRAINT "source_sync_jobs_source_id_sources_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id");
