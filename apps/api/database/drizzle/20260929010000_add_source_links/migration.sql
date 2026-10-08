CREATE TABLE "source_links" (
  "source_id" text NOT NULL,
  "target" text NOT NULL,
  "resolved_path" text,
  CONSTRAINT "source_links_source_id_target_pk" PRIMARY KEY ("source_id", "target"),
  CONSTRAINT "source_links_source_id_sources_id_fk"
    FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "source_links_resolved_path_idx" ON "source_links" ("resolved_path");
