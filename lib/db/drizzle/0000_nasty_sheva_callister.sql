CREATE TABLE "campus_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"due_date" timestamp with time zone,
	"max_score" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campus_attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"student_id" text NOT NULL,
	"date" date NOT NULL,
	"status" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campus_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campus_direct_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campus_members" (
	"user_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"class_name" text DEFAULT 'Community member' NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"profile_completed" boolean DEFAULT false NOT NULL,
	"verified" boolean DEFAULT true NOT NULL,
	"credential_serial" text NOT NULL,
	"school_year" text DEFAULT '2026 — 2027' NOT NULL,
	"expires_on" date DEFAULT '2027-06-30' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campus_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"space_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campus_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"space_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campus_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"user_id" text NOT NULL,
	"author_name" text NOT NULL,
	"kind" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campus_spaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"accent" text NOT NULL,
	"channels" text[] NOT NULL,
	"spotlight" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campus_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"student_id" text NOT NULL,
	"content" text,
	"score" integer,
	"feedback" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "campus_attendance_unique" ON "campus_attendance" USING btree ("space_id","student_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "campus_memberships_member_space_unique" ON "campus_memberships" USING btree ("user_id","space_id");