import { pgTable, serial, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";

// A vibe card: the creator's nickname and answers. Answers never leave the server.
export const cards = pgTable("cards", {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  nickname: text().notNull(),
  answers: jsonb().$type<Record<string, string>>().notNull(),
  ownerTokenHash: text("owner_token_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One row per person who answered a card. Only the outcome is kept, not their answers.
export const matches = pgTable(
  "matches",
  {
    id: serial().primaryKey(),
    cardId: integer("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
    nickname: text().notNull(),
    score: integer().notNull(),
    highlights: jsonb().$type<string[]>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("matches_card_id_idx").on(t.cardId)],
);
