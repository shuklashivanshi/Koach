CREATE TABLE "ca_attempts" (
	"uid" text NOT NULL,
	"question_id" uuid NOT NULL,
	"chosen" text,
	"correct" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_attempts_uid_question_id_pk" PRIMARY KEY("uid","question_id")
);
--> statement-breakpoint
CREATE TABLE "ca_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title_key" text NOT NULL,
	"source" text NOT NULL,
	"title" text NOT NULL,
	"published_at" timestamp with time zone,
	"summary" text,
	"relevance" real,
	"nodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ca_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day" date NOT NULL,
	"item_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"stem" text NOT NULL,
	"options" jsonb NOT NULL,
	"answer" text NOT NULL,
	"explanation" text NOT NULL,
	"status" text DEFAULT 'live' NOT NULL,
	"reports" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ca_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" text NOT NULL,
	"question_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ca_shared" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" text NOT NULL,
	"url" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mistakes" ADD COLUMN "ca_question_id" text;--> statement-breakpoint
ALTER TABLE "ca_attempts" ADD CONSTRAINT "ca_attempts_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ca_attempts" ADD CONSTRAINT "ca_attempts_question_id_ca_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."ca_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ca_questions" ADD CONSTRAINT "ca_questions_item_id_ca_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."ca_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ca_reports" ADD CONSTRAINT "ca_reports_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ca_reports" ADD CONSTRAINT "ca_reports_question_id_ca_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."ca_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ca_shared" ADD CONSTRAINT "ca_shared_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ca_items_url_index" ON "ca_items" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX "ca_items_title_key_index" ON "ca_items" USING btree ("title_key");--> statement-breakpoint
CREATE INDEX "ca_items_created_at_index" ON "ca_items" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ca_questions_day_index" ON "ca_questions" USING btree ("day");