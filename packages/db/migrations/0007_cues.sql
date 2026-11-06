CREATE TABLE "coach_notes" (
	"uid" text NOT NULL,
	"week" date NOT NULL,
	"lines" jsonb NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "coach_notes_uid_week_pk" PRIMARY KEY("uid","week")
);
--> statement-breakpoint
CREATE TABLE "cues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" text NOT NULL,
	"node_id" text NOT NULL,
	"format" text NOT NULL,
	"content" jsonb NOT NULL,
	"rating" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_palaces" (
	"uid" text PRIMARY KEY NOT NULL,
	"rooms" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "node_facts" (
	"node_id" text PRIMARY KEY NOT NULL,
	"facts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nudge_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" text NOT NULL,
	"day" date NOT NULL,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wellbeing" (
	"uid" text NOT NULL,
	"week" date NOT NULL,
	"level" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wellbeing_uid_week_pk" PRIMARY KEY("uid","week")
);
--> statement-breakpoint
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cues" ADD CONSTRAINT "cues_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_palaces" ADD CONSTRAINT "memory_palaces_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nudge_log" ADD CONSTRAINT "nudge_log_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wellbeing" ADD CONSTRAINT "wellbeing_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cues_uid_node_id_format_index" ON "cues" USING btree ("uid","node_id","format");--> statement-breakpoint
CREATE INDEX "nudge_log_uid_day_index" ON "nudge_log" USING btree ("uid","day");