import type { Config, Context } from "@netlify/functions";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { cards, matches } from "../../db/schema.js";
// @ts-ignore: shared plain-JS module also used by the browser
import { cleanAnswers, scoreMatch } from "../../public/quiz-data.js";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (status: number, error: string) => json({ error }, status);

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

function cleanNickname(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const n = v.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim();
  return n.length >= 1 && n.length <= 24 ? n : null;
}

function makeSlug(nickname: string) {
  const base = nickname.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 16) || "vibe";
  const tail = Array.from(randomBytes(4), (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
  return `${base}-${tail}`;
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? b : null;
  } catch {
    return null;
  }
}

async function ownedCard(req: Request, slug: string) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [card] = await db.select().from(cards).where(eq(cards.slug, slug)).limit(1);
  if (!card || !token) return null;
  const a = Buffer.from(card.ownerTokenHash), b = Buffer.from(hash(token));
  return a.length === b.length && timingSafeEqual(a, b) ? card : null;
}

export default async (req: Request, context: Context) => {
  const slug = context.params.slug;
  const isMatches = new URL(req.url).pathname.endsWith("/matches");

  try {
    // Create a vibe card
    if (!slug && req.method === "POST") {
      const body = await readBody(req);
      const nickname = cleanNickname(body?.nickname);
      const answers = cleanAnswers(body?.answers);
      if (body?.adult !== true) return fail(400, "Please confirm you are 18 or over.");
      if (!nickname) return fail(400, "Pick a nickname between 1 and 24 characters.");
      if (!answers) return fail(400, "Please answer all 10 questions.");

      const token = randomBytes(24).toString("base64url");
      for (let i = 0; i < 5; i++) {
        const [row] = await db
          .insert(cards)
          .values({ slug: makeSlug(nickname), nickname, answers, ownerTokenHash: hash(token) })
          .onConflictDoNothing({ target: cards.slug })
          .returning({ slug: cards.slug });
        if (row) return json({ slug: row.slug, nickname, token }, 201);
      }
      return fail(500, "Could not make a link. Please try again.");
    }

    if (!slug || !/^[a-z0-9-]{3,40}$/.test(slug)) return fail(404, "This link doesn’t exist.");

    if (!isMatches && req.method === "GET") {
      const [card] = await db.select({ nickname: cards.nickname }).from(cards).where(eq(cards.slug, slug)).limit(1);
      return card ? json({ nickname: card.nickname }) : fail(404, "This link doesn’t exist or was deleted.");
    }

    if (!isMatches && req.method === "DELETE") {
      const card = await ownedCard(req, slug);
      if (!card) return fail(403, "Only the person who made this link can delete it.");
      await db.delete(cards).where(eq(cards.id, card.id));
      return new Response(null, { status: 204 });
    }

    // Answer someone's card: score server-side so their answers stay private
    if (isMatches && req.method === "POST") {
      const body = await readBody(req);
      const nickname = cleanNickname(body?.nickname);
      const answers = cleanAnswers(body?.answers);
      if (body?.adult !== true) return fail(400, "Please confirm you are 18 or over.");
      if (!nickname) return fail(400, "Pick a nickname between 1 and 24 characters.");
      if (!answers) return fail(400, "Please answer all 10 questions.");

      const [card] = await db.select().from(cards).where(eq(cards.slug, slug)).limit(1);
      if (!card) return fail(404, "This link doesn’t exist or was deleted.");

      const { score, highlights } = scoreMatch(card.answers, answers);
      await db.insert(matches).values({ cardId: card.id, nickname, score, highlights });
      return json({ creator: card.nickname, nickname, score, highlights }, 201);
    }

    // Creator's view of everyone who answered
    if (isMatches && req.method === "GET") {
      const card = await ownedCard(req, slug);
      if (!card) return fail(403, "Only the person who made this link can see its matches.");
      const rows = await db
        .select({ nickname: matches.nickname, score: matches.score, highlights: matches.highlights, createdAt: matches.createdAt })
        .from(matches)
        .where(eq(matches.cardId, card.id))
        .orderBy(desc(matches.createdAt))
        .limit(100);
      return json({ nickname: card.nickname, matches: rows });
    }

    return fail(405, "Method not allowed");
  } catch (err) {
    console.error(err);
    return fail(500, "Something went wrong. Please try again.");
  }
};

export const config: Config = {
  path: ["/api/cards", "/api/cards/:slug", "/api/cards/:slug/matches"],
};
