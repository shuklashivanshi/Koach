CREATE TABLE "kb_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"reviewer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "node_prereqs" (
	"node_id" text NOT NULL,
	"prereq_id" text NOT NULL,
	CONSTRAINT "node_prereqs_node_id_prereq_id_pk" PRIMARY KEY("node_id","prereq_id")
);
--> statement-breakpoint
CREATE TABLE "node_sources" (
	"node_id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"chapter" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'suggested' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pyq_tags" (
	"pyq_id" text NOT NULL,
	"node_id" text NOT NULL,
	"primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "pyq_tags_pyq_id_node_id_pk" PRIMARY KEY("pyq_id","node_id")
);
--> statement-breakpoint
CREATE TABLE "pyqs" (
	"id" text PRIMARY KEY NOT NULL,
	"exam" text NOT NULL,
	"paper" text NOT NULL,
	"year" integer NOT NULL,
	"number" integer NOT NULL,
	"text" text NOT NULL,
	"options" jsonb,
	"answer" text,
	"marks" integer,
	"word_limit" integer,
	"question_type" text,
	"source_type" text,
	"directive" text,
	"tag_status" text DEFAULT 'suggested' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"neutral_label" text
);
--> statement-breakpoint
CREATE TABLE "strategy_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"claim" text NOT NULL,
	"kind" text NOT NULL,
	"official_source" text,
	"source_url" text NOT NULL,
	"source_date" date
);
--> statement-breakpoint
CREATE TABLE "syllabus_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"paper" text NOT NULL,
	"parent_id" text,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"est_minutes" integer,
	"prelims" boolean DEFAULT false NOT NULL,
	"mains" boolean DEFAULT false NOT NULL,
	"ord" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "node_prereqs" ADD CONSTRAINT "node_prereqs_node_id_syllabus_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."syllabus_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_prereqs" ADD CONSTRAINT "node_prereqs_prereq_id_syllabus_nodes_id_fk" FOREIGN KEY ("prereq_id") REFERENCES "public"."syllabus_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_sources" ADD CONSTRAINT "node_sources_node_id_syllabus_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."syllabus_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_sources" ADD CONSTRAINT "node_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pyq_tags" ADD CONSTRAINT "pyq_tags_pyq_id_pyqs_id_fk" FOREIGN KEY ("pyq_id") REFERENCES "public"."pyqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pyq_tags" ADD CONSTRAINT "pyq_tags_node_id_syllabus_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."syllabus_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pyq_tags_node_id_index" ON "pyq_tags" USING btree ("node_id");--> statement-breakpoint
CREATE INDEX "pyqs_exam_year_index" ON "pyqs" USING btree ("exam","year");--> statement-breakpoint
CREATE INDEX "strategy_claims_topic_index" ON "strategy_claims" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "syllabus_nodes_paper_index" ON "syllabus_nodes" USING btree ("paper");--> statement-breakpoint
CREATE INDEX "syllabus_nodes_parent_id_index" ON "syllabus_nodes" USING btree ("parent_id");