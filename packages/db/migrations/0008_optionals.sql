CREATE TABLE "optional_info" (
	"slug" text PRIMARY KEY NOT NULL,
	"profile" jsonb NOT NULL,
	"stats" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "optional_deadline" date DEFAULT '2026-12-15' NOT NULL;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "optional" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "optional_reasons" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "optional_decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "optional_quiz" jsonb;