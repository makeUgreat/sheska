CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "source_vectors" (
	"source_id" text PRIMARY KEY,
	"embedding" vector(1024) NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_vectors" ADD CONSTRAINT "source_vectors_source_id_sources_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id");
