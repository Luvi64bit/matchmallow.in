CREATE TABLE "cards" (
	"id" serial PRIMARY KEY,
	"slug" text NOT NULL UNIQUE,
	"nickname" text NOT NULL,
	"answers" jsonb NOT NULL,
	"owner_token_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY,
	"card_id" integer NOT NULL,
	"nickname" text NOT NULL,
	"score" integer NOT NULL,
	"highlights" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "matches_card_id_idx" ON "matches" ("card_id");--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_card_id_cards_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE;