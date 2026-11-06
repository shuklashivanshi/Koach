CREATE TABLE "mistakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" text NOT NULL,
	"pyq_id" text,
	"node_id" text,
	"subject" text,
	"cause" text,
	"chosen" text,
	"correct" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "node_mastery" (
	"uid" text NOT NULL,
	"node_id" text NOT NULL,
	"mastery" real NOT NULL,
	"studied_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "node_mastery_uid_node_id_pk" PRIMARY KEY("uid","node_id")
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" text NOT NULL,
	"type" text NOT NULL,
	"day" date NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_prefs" (
	"uid" text PRIMARY KEY NOT NULL,
	"prefs" jsonb NOT NULL,
	"tone" text DEFAULT 'calm' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_notes" (
	"uid" text NOT NULL,
	"day" date NOT NULL,
	"note" text NOT NULL,
	CONSTRAINT "plan_notes_uid_day_pk" PRIMARY KEY("uid","day")
);
--> statement-breakpoint
CREATE TABLE "plan_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" text NOT NULL,
	"day" date NOT NULL,
	"position" integer NOT NULL,
	"kind" text NOT NULL,
	"node_id" text,
	"title" text NOT NULL,
	"minutes" integer NOT NULL,
	"goal" text NOT NULL,
	"reason" text NOT NULL,
	"source" text,
	"priority" real NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" text NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recall_items" (
	"node_id" text PRIMARY KEY NOT NULL,
	"items" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "srs_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" text NOT NULL,
	"node_id" text NOT NULL,
	"kind" text NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"state" jsonb NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_mastery" ADD CONSTRAINT "node_mastery_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_notes" ADD CONSTRAINT "plan_notes_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD CONSTRAINT "plan_tasks_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mistakes_uid_created_at_index" ON "mistakes" USING btree ("uid","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_log_uid_type_day_index" ON "notification_log" USING btree ("uid","type","day");--> statement-breakpoint
CREATE INDEX "plan_tasks_uid_day_index" ON "plan_tasks" USING btree ("uid","day");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_index" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "srs_cards_uid_due_index" ON "srs_cards" USING btree ("uid","due");