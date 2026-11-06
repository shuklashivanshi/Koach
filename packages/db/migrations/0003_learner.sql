CREATE TABLE "diagnostic_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" text NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learner_profiles" (
	"uid" text PRIMARY KEY NOT NULL,
	"target" text DEFAULT 'cse-2027' NOT NULL,
	"weekday_minutes" jsonb NOT NULL,
	"work_hours" text,
	"quiet_hours" text,
	"self_assessment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"nudge_tone" text DEFAULT 'gentle' NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"onboarded_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lpt_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" text NOT NULL,
	"form" text NOT NULL,
	"raw" jsonb NOT NULL,
	"visual" real NOT NULL,
	"auditory" real NOT NULL,
	"readwrite" real NOT NULL,
	"kinesthetic" real NOT NULL,
	"low_confidence" integer DEFAULT 0 NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject_levels" (
	"uid" text NOT NULL,
	"section_id" text NOT NULL,
	"level" real NOT NULL,
	"source" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subject_levels_uid_section_id_pk" PRIMARY KEY("uid","section_id")
);
--> statement-breakpoint
ALTER TABLE "diagnostic_attempts" ADD CONSTRAINT "diagnostic_attempts_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD CONSTRAINT "learner_profiles_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lpt_results" ADD CONSTRAINT "lpt_results_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_levels" ADD CONSTRAINT "subject_levels_uid_users_uid_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;